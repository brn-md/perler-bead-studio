"""
Image Processing Pipeline Service (app/services/image_processor.py)
-------------------------------------------------------------------
Universal Bead Art Scaling & Digitizing Engine:
1. Detects and reads existing Bead Grid Templates with subpixel precision!
2. Handles camera photos on tables/fabrics with local AI (rembg).
3. Preserves aspect ratio locking during enlargement/scaling.
4. Maps to official manufacturer catalogs (Perler, Hama, Artkal, Nabbi, MARD).
"""

import io
import base64
from typing import List, Optional, Dict, Any, Tuple

import cv2
import numpy as np
from PIL import Image

from app.services.quantization import quantize_kmeans, quantize_cielab, quantize_ciede2000
from app.core.brands import get_brand_data, BRANDS_CATALOG
from app.core.grid_detector import (
    detect_and_sample_grid_template,
    detect_annotated_chart,
    auto_strip_letterbox
)

# Build a global fallback lookup of all colors across all brands
GLOBAL_COLOR_LOOKUP: Dict[str, Dict[str, str]] = {}
for b_key, b_info in BRANDS_CATALOG.items():
    for c in b_info["colors"]:
        h = c["hex"].upper()
        if h not in GLOBAL_COLOR_LOOKUP:
            GLOBAL_COLOR_LOOKUP[h] = {
                "code": c["code"],
                "name": c["name"],
                "brand": b_info["name"]
            }

def detect_pixel_art_block_size(img_rgb: np.ndarray) -> int:
    """
    Detects the integer pixel block scale factor (e.g. 1, 2, 4, 8, 10) of upscaled pixel art
    by analyzing the periodicity and run-lengths of solid color spans.
    """
    h, w = img_rgb.shape[:2]
    if max(h, w) <= 60:
        return 1

    gray = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2GRAY)
    diff_x = np.abs(np.diff(gray, axis=1)) > 10
    diff_y = np.abs(np.diff(gray, axis=0)) > 10

    run_lengths = []
    step_y = max(1, h // 30)
    for r in range(0, h, step_y):
        changes = np.where(diff_x[r])[0]
        if len(changes) >= 2:
            runs = np.diff(changes)
            run_lengths.extend(runs[(runs >= 2) & (runs <= 36)])

    step_x = max(1, w // 30)
    for c in range(0, w, step_x):
        changes = np.where(diff_y[:, c])[0]
        if len(changes) >= 2:
            runs = np.diff(changes)
            run_lengths.extend(runs[(runs >= 2) & (runs <= 36)])

    if len(run_lengths) < 15:
        return 1

    counts = np.bincount(run_lengths)
    candidate = int(np.argmax(counts))
    if candidate >= 2 and counts[candidate] >= len(run_lengths) * 0.12:
        return candidate
    return 1


def extract_pixel_art_sprite(
    image_bytes: bytes,
    bg_tolerance: float = 18.0,
    custom_bg_hex: Optional[str] = None,
    sample_corners_bg: bool = False
) -> Optional[Tuple[np.ndarray, np.ndarray, bool]]:
    """
    Extracts pixel art sprites with subpixel fidelity:
    1. If PNG has native alpha transparency, preserves it 100% without blurry neural net erosion.
    2. If solid/corner background, uses CIELAB Delta E floodfill from borders.
    3. Detects if the sprite was upscaled and downsamples by sampling the modal pixel of each S x S block.
    Returns (craft_rgb, craft_mask, is_pixel_art) or None.
    """
    from skimage.color import rgb2lab
    from app.core.color_utils import hex_to_rgb

    try:
        pil_img = Image.open(io.BytesIO(image_bytes))
    except Exception:
        return None

    # 1. Native Alpha Channel Transparency (e.g. clean PNG sprite)
    has_alpha = pil_img.mode in ("RGBA", "LA") or (pil_img.mode == "P" and "transparency" in pil_img.info)
    if has_alpha:
        rgba = np.array(pil_img.convert("RGBA"))
        alpha = rgba[:, :, 3]
        if np.mean(alpha < 50) > 0.005:
            mask = (alpha > 30).astype(np.uint8)
            coords = cv2.findNonZero(mask)
            if coords is not None:
                bx, by, bw, bh = cv2.boundingRect(coords)
                cropped_rgb = rgba[by:by + bh, bx:bx + bw, :3]
                cropped_mask = mask[by:by + bh, bx:bx + bw]
            else:
                cropped_rgb = rgba[:, :, :3]
                cropped_mask = mask

            # Check for upscaled pixel block size
            S = detect_pixel_art_block_size(cropped_rgb)
            if S >= 2:
                out_h = max(1, cropped_rgb.shape[0] // S)
                out_w = max(1, cropped_rgb.shape[1] // S)
                down_rgb = np.zeros((out_h, out_w, 3), dtype=np.uint8)
                down_mask = np.zeros((out_h, out_w), dtype=np.uint8)
                for r in range(out_h):
                    for c in range(out_w):
                        cy = min(cropped_rgb.shape[0] - 1, int((r + 0.5) * S))
                        cx = min(cropped_rgb.shape[1] - 1, int((c + 0.5) * S))
                        down_rgb[r, c] = cropped_rgb[cy, cx]
                        down_mask[r, c] = cropped_mask[cy, cx]
                return down_rgb, down_mask, True

            return cropped_rgb, cropped_mask, True

    # 2. Solid Background Removal for Pixel Art (e.g. white or single color background)
    rgb = np.array(pil_img.convert("RGB"))
    h, w = rgb.shape[:2]

    p = max(2, min(8, h // 10, w // 10))
    c_tl = rgb[0:p, 0:p].reshape(-1, 3)
    c_tr = rgb[0:p, -p:].reshape(-1, 3)
    c_bl = rgb[-p:, 0:p].reshape(-1, 3)
    c_br = rgb[-p:, -p:].reshape(-1, 3)
    corners = np.vstack([c_tl, c_tr, c_bl, c_br])
    corner_std = np.std(corners, axis=0).max()

    if corner_std < 22 or custom_bg_hex is not None:
        if custom_bg_hex:
            try:
                bg_rgb = np.array(hex_to_rgb(custom_bg_hex), dtype=np.float32)
            except Exception:
                bg_rgb = np.median(corners, axis=0)
        else:
            bg_rgb = np.median(corners, axis=0)

        img_lab = rgb2lab(rgb.astype(np.float32) / 255.0)
        bg_lab = rgb2lab(bg_rgb.reshape(1, 1, 3).astype(np.float32) / 255.0).reshape(3)
        delta_e = np.linalg.norm(img_lab - bg_lab, axis=2)
        is_bg = (delta_e < float(bg_tolerance)).astype(np.uint8)

        temp = is_bg.copy() * 255
        flood_mask = np.zeros((h + 2, w + 2), dtype=np.uint8)

        if sample_corners_bg:
            for c_x, r_y in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
                if is_bg[r_y, c_x] and temp[r_y, c_x] == 255:
                    cv2.floodFill(temp, flood_mask, (c_x, r_y), 100)
        else:
            for c in range(w):
                if is_bg[0, c] and temp[0, c] == 255:
                    cv2.floodFill(temp, flood_mask, (c, 0), 100)
                if is_bg[h - 1, c] and temp[h - 1, c] == 255:
                    cv2.floodFill(temp, flood_mask, (c, h - 1), 100)
            for r in range(h):
                if is_bg[r, 0] and temp[r, 0] == 255:
                    cv2.floodFill(temp, flood_mask, (0, r), 100)
                if is_bg[r, w - 1] and temp[r, w - 1] == 255:
                    cv2.floodFill(temp, flood_mask, (w - 1, r), 100)

        character_mask = (temp != 100).astype(np.uint8)
        coords = cv2.findNonZero(character_mask)
        if coords is not None:
            bx, by, bw, bh = cv2.boundingRect(coords)
            if bw > 6 and bh > 6:
                cropped_rgb = rgb[by:by + bh, bx:bx + bw]
                cropped_mask = character_mask[by:by + bh, bx:bx + bw]

                S = detect_pixel_art_block_size(cropped_rgb)
                if S >= 2:
                    out_h = max(1, cropped_rgb.shape[0] // S)
                    out_w = max(1, cropped_rgb.shape[1] // S)
                    down_rgb = np.zeros((out_h, out_w, 3), dtype=np.uint8)
                    down_mask = np.zeros((out_h, out_w), dtype=np.uint8)
                    for r in range(out_h):
                        for c in range(out_w):
                            cy = min(cropped_rgb.shape[0] - 1, int((r + 0.5) * S))
                            cx = min(cropped_rgb.shape[1] - 1, int((c + 0.5) * S))
                            down_rgb[r, c] = cropped_rgb[cy, cx]
                            down_mask[r, c] = cropped_mask[cy, cx]
                    return down_rgb, down_mask, True

                is_small_sprite = max(bw, bh) <= 128
                return cropped_rgb, cropped_mask, is_small_sprite

    return None

def extract_photo_craft(image_bytes: bytes, img_bgr: np.ndarray):
    from rembg import remove, new_session
    pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    try:
        session = new_session("u2netp")
        out_pil = remove(pil_img, session=session)
    except Exception:
        out_pil = remove(pil_img)

    rgba = np.array(out_pil)
    rgb = rgba[:, :, :3]
    alpha = rgba[:, :, 3]

    mask_binary = (alpha > 30).astype(np.uint8)
    coords = cv2.findNonZero(mask_binary)
    if coords is not None:
        bx, by, bw, bh = cv2.boundingRect(coords)
        pad = 2
        bx1 = max(0, bx - pad)
        by1 = max(0, by - pad)
        bx2 = min(rgb.shape[1], bx + bw + pad)
        by2 = min(rgb.shape[0], by + bh + pad)
        return rgb[by1:by2, bx1:bx2], mask_binary[by1:by2, bx1:bx2]

    return rgb, mask_binary


def process_pixel_art(
    image_bytes: bytes,
    width_cm: float,
    height_cm: float,
    bead_size_cm: float,
    brand: str = "perler",
    palette_hex: Optional[List[str]] = None,
    k_colors: Optional[int] = 16,
    crop_x: Optional[float] = 0.0,
    crop_y: Optional[float] = 0.0,
    crop_w: Optional[float] = 1.0,
    crop_h: Optional[float] = 1.0,
    enhance_edges: bool = True,
    isolate_subject: bool = True,
    background_mode: str = "cutout",
    grid_mode: str = "auto",
    bg_tolerance: float = 18.0,
    flat_colors: bool = False,
    custom_bg_hex: Optional[str] = None,
    decode_cell_codes: bool = False,
    sample_corners_bg: bool = False,
    detect_red_dividers: bool = False
) -> Dict[str, Any]:
    nparr = np.frombuffer(image_bytes, np.uint8)
    img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img_bgr is None:
        raise ValueError("Provided file is not a valid image format (PNG/JPG).")

    # Strip solid black letterbox bars if present (e.g. mobile screenshots)
    img_bgr = auto_strip_letterbox(img_bgr)

    # Retrieve selected brand catalog
    brand_data = get_brand_data(brand)
    brand_colors = brand_data["colors"]
    brand_lookup = {c["hex"].upper(): c for c in brand_colors}

    # If palette provided by user, use it; otherwise use full brand catalog
    if palette_hex and len(palette_hex) > 0:
        active_palette = palette_hex
    else:
        active_palette = [c["hex"] for c in brand_colors]

    target_cols = max(1, int(round(width_cm / bead_size_cm)))
    target_rows = max(1, int(round(height_cm / bead_size_cm)))

    # 1. Grid / Chart detection
    grid_result = None
    is_pixel_art = False

    if decode_cell_codes:
        # User explicitly enabled chart mode for prints with rulers & cell letter codes (C3, R15)
        grid_result = detect_annotated_chart(
            img_bgr,
            custom_bg_hex=custom_bg_hex,
            bg_tolerance=bg_tolerance,
            sample_corners_bg=sample_corners_bg,
            detect_red_dividers=detect_red_dividers
        )

    if grid_result is None and grid_mode != "off":
        force = (grid_mode == "force")
        grid_result = detect_and_sample_grid_template(
            img_bgr,
            force_grid=force,
            bg_tolerance=bg_tolerance,
            custom_bg_hex=custom_bg_hex,
            sample_corners_bg=sample_corners_bg,
            detect_red_dividers=detect_red_dividers
        )

    if grid_result is not None:
        craft_rgb, craft_mask = grid_result
    else:
        # 2. Check for native Pixel Art (transparent PNG or solid background sprite)
        pixel_art_result = extract_pixel_art_sprite(
            image_bytes,
            bg_tolerance=bg_tolerance,
            custom_bg_hex=custom_bg_hex,
            sample_corners_bg=sample_corners_bg
        )

        if pixel_art_result is not None:
            craft_rgb, craft_mask, is_pixel_art = pixel_art_result
        else:
            # 3. General Photo mode with local AI (rembg)
            craft_rgb, craft_mask = extract_photo_craft(image_bytes, img_bgr)

    # 4. Proportionate fitting & 1:1 Pixel Art preservation
    ch, cw = craft_rgb.shape[:2]

    # If the extracted subject is pixel art and already fits within the target board:
    # PRESERVE 1:1 SCALE! 1 pixel = 1 bead. Do not stretch or introduce aliasing!
    if is_pixel_art and cw <= target_cols and ch <= target_rows:
        fit_w = cw
        fit_h = ch
        resized_craft_rgb = craft_rgb.copy()
        resized_craft_mask = craft_mask.copy()
    else:
        aspect_craft = cw / float(ch)
        aspect_target = target_cols / float(target_rows)

        if aspect_craft > aspect_target:
            fit_w = target_cols
            fit_h = max(1, int(round(target_cols / aspect_craft)))
        else:
            fit_h = target_rows
            fit_w = max(1, int(round(target_rows * aspect_craft)))

        # Nearest-neighbor interpolation preserves clean pixel boundaries
        resized_craft_rgb = cv2.resize(craft_rgb, (fit_w, fit_h), interpolation=cv2.INTER_NEAREST)
        resized_craft_mask = cv2.resize(craft_mask, (fit_w, fit_h), interpolation=cv2.INTER_NEAREST)

    # Clean color consolidation:
    r_ch = resized_craft_rgb[:, :, 0].astype(int)
    g_ch = resized_craft_rgb[:, :, 1].astype(int)
    b_ch = resized_craft_rgb[:, :, 2].astype(int)
    min_c = np.minimum(np.minimum(r_ch, g_ch), b_ch)
    max_c = np.maximum(np.maximum(r_ch, g_ch), b_ch)

    # 1. Unify near-white tones (min RGB >= 210, diff <= 28) to pure 255
    is_near_white = (min_c >= 210) & ((max_c - min_c) <= 28)
    resized_craft_rgb[is_near_white] = [255, 255, 255]

    # 2. Unify near-black contours (max RGB <= 38) to pure 0
    is_near_black = (max_c <= 38)
    resized_craft_rgb[is_near_black] = [0, 0, 0]

    # 3. Optional Flat Shading: unify light grey shadows into pure white
    if flat_colors:
        is_grey_shadow = (min_c > 105) & ((max_c - min_c) < 25)
        resized_craft_rgb[is_grey_shadow] = [255, 255, 255]

    # Center craft inside the full matrix
    offset_x = (target_cols - fit_w) // 2
    offset_y = (target_rows - fit_h) // 2

    canvas_rgb = np.full((target_rows, target_cols, 3), 255, dtype=np.uint8)
    canvas_mask = np.zeros((target_rows, target_cols), dtype=np.uint8)

    canvas_rgb[offset_y:offset_y+fit_h, offset_x:offset_x+fit_w] = resized_craft_rgb
    canvas_mask[offset_y:offset_y+fit_h, offset_x:offset_x+fit_w] = resized_craft_mask

    # Quantize colors using CIEDE2000 to brand palette
    quantized_img, color_counts, matrix_hex = quantize_ciede2000(canvas_rgb, active_palette)
    algorithm_used = f"ciede2000_{brand_data['id']}"

    # In cutout mode, outer canvas area without craft becomes transparent
    if background_mode == "cutout":
        for r in range(target_rows):
            for c in range(target_cols):
                if canvas_mask[r, c] == 0:
                    matrix_hex[r][c] = "TRANSPARENT"

    # Count beads with manufacturer catalog metadata
    filtered_counts = {}
    for r in range(target_rows):
        for c in range(target_cols):
            val = matrix_hex[r][c]
            if val != "TRANSPARENT":
                filtered_counts[val] = filtered_counts.get(val, 0) + 1

    clean_color_counts = []
    for hx, cnt in sorted(filtered_counts.items(), key=lambda x: x[1], reverse=True):
        upper_hex = hx.upper()
        # Look up in selected brand first, then fallback to global lookup
        info = brand_lookup.get(upper_hex) or GLOBAL_COLOR_LOOKUP.get(upper_hex, {})
        clean_color_counts.append({
            "hex": hx,
            "count": cnt,
            "code": info.get("code", ""),
            "name": info.get("name", f"{brand_data['name']} Bead")
        })

    final_rgba = np.zeros((target_rows, target_cols, 4), dtype=np.uint8)
    final_rgba[:, :, :3] = quantized_img
    final_rgba[:, :, 3] = np.where(canvas_mask > 0, 255, 0)

    final_bgra = cv2.cvtColor(final_rgba, cv2.COLOR_RGBA2BGRA)
    success, buffer = cv2.imencode(".png", final_bgra)
    if not success:
        raise RuntimeError("Failed to encode PNG.")

    base64_image = base64.b64encode(buffer).decode("utf-8")
    data_uri = f"data:image/png;base64,{base64_image}"

    return {
        "success": True,
        "algorithm": algorithm_used,
        "brand": brand_data["id"],
        "grid": {
            "columns": target_cols,
            "rows": target_rows,
            "total_beads": sum(filtered_counts.values()),
            "bead_size_cm": bead_size_cm,
            "dimensions_cm": {
                "width": width_cm,
                "height": height_cm
            }
        },
        "color_counts": clean_color_counts,
        "matrix": matrix_hex,
        "image_base64": data_uri
    }
