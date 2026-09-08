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
import time
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
from app.core.action_logger import log_step, log_error

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

    # Deterministic pixel art signature: indexed palette count
    unique_colors = len(np.unique(rgb.reshape(-1, 3), axis=0))
    is_indexed_palette = (unique_colors <= 64)

    # Sample perimeter border to find dominant background color
    border_pixels = np.vstack([rgb[0, :], rgb[-1, :], rgb[:, 0], rgb[:, -1]])
    u_vals, u_counts = np.unique(border_pixels, axis=0, return_counts=True)
    mode_bg = u_vals[np.argmax(u_counts)]
    mode_freq = float(np.max(u_counts)) / float(len(border_pixels))

    p = max(2, min(8, h // 10, w // 10))
    c_tl = rgb[0:p, 0:p].reshape(-1, 3)
    c_tr = rgb[0:p, -p:].reshape(-1, 3)
    c_bl = rgb[-p:, 0:p].reshape(-1, 3)
    c_br = rgb[-p:, -p:].reshape(-1, 3)
    corners = np.vstack([c_tl, c_tr, c_bl, c_br])
    corner_std = np.std(corners, axis=0).max()

    is_pixel_sprite = is_indexed_palette or (mode_freq > 0.45) or (corner_std < 22) or (custom_bg_hex is not None)

    if is_pixel_sprite:
        if custom_bg_hex:
            try:
                bg_rgb = np.array(hex_to_rgb(custom_bg_hex), dtype=np.float32)
            except Exception:
                bg_rgb = mode_bg.astype(np.float32)
        elif mode_freq > 0.40:
            bg_rgb = mode_bg.astype(np.float32)
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

                is_sprite = is_indexed_palette or (max(bw, bh) <= 128)
                return cropped_rgb, cropped_mask, is_sprite

    return None

def suppress_bead_holes_and_glare(img_rgb: np.ndarray) -> np.ndarray:
    """
    Suppresses the dark annular central holes of physical perler beads
    and specular glare reflections on the plastic surface before downsampling.
    """
    h, w = img_rgb.shape[:2]
    k_size = max(3, min(7, int(min(h, w) * 0.02) | 1))
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k_size, k_size))
    closed = cv2.morphologyEx(img_rgb, cv2.MORPH_CLOSE, kernel)
    smoothed = cv2.bilateralFilter(closed, d=7, sigmaColor=45, sigmaSpace=45)
    return smoothed


def filter_largest_connected_component(mask: np.ndarray) -> np.ndarray:
    """
    Isolates the main bead piece and discards detached satellite objects
    (e.g., coins, scissors, hands, background fragments).
    """
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8))
    if num_labels <= 2:
        return mask

    # Exclude background (label 0)
    areas = stats[1:, cv2.CC_STAT_AREA]
    largest_idx = 1 + int(np.argmax(areas))
    largest_area = stats[largest_idx, cv2.CC_STAT_AREA]

    clean_mask = (labels == largest_idx).astype(np.uint8)

    # If any other component is substantial (> 60% of largest), keep it (e.g. 2 adjacent characters)
    for i in range(1, num_labels):
        if i != largest_idx and stats[i, cv2.CC_STAT_AREA] > largest_area * 0.60:
            clean_mask = clean_mask | (labels == i).astype(np.uint8)

    return clean_mask


def eliminate_orphan_beads(matrix_hex: List[List[str]], max_orphan_size: int = 2) -> List[List[str]]:
    """
    Eliminates stray disconnected orphan beads (e.g. 1 or 2 beads floating detached from main body).
    In fused bead art, isolated beads cannot fuse and represent compression noise or chart artifacts.
    """
    rows = len(matrix_hex)
    cols = len(matrix_hex[0]) if rows > 0 else 0
    if rows == 0 or cols == 0:
        return matrix_hex

    grid = np.zeros((rows, cols), dtype=np.uint8)
    for r in range(rows):
        for c in range(cols):
            if matrix_hex[r][c] != "TRANSPARENT":
                grid[r, c] = 1

    total_beads = int(np.sum(grid))
    if total_beads <= 8:
        return matrix_hex

    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(grid, connectivity=8)
    if num_labels <= 2:
        return matrix_hex

    areas = stats[1:, cv2.CC_STAT_AREA]
    max_area = int(np.max(areas))

    cleaned = [row[:] for row in matrix_hex]
    for lbl in range(1, num_labels):
        area = stats[lbl, cv2.CC_STAT_AREA]
        # Any disconnected island <= max_orphan_size when main piece is substantial
        if area <= max_orphan_size and max_area >= 12 and area <= max_area * 0.15:
            cleaned_indices = np.where(labels == lbl)
            for r, c in zip(cleaned_indices[0], cleaned_indices[1]):
                cleaned[r][c] = "TRANSPARENT"

    return cleaned


def prune_minority_beads(matrix_hex: List[List[str]], min_ratio: float = 0.008) -> List[List[str]]:
    """
    Prunes stray 1- or 2-bead color noise caused by reflections, shadows, or camera artifacts.
    Replaces each minority bead with the most common valid orthogonal neighbor.
    """
    rows = len(matrix_hex)
    cols = len(matrix_hex[0]) if rows > 0 else 0
    if rows == 0 or cols == 0:
        return matrix_hex

    total_beads = sum(1 for r in range(rows) for c in range(cols) if matrix_hex[r][c] != "TRANSPARENT")
    if total_beads <= 10:
        return matrix_hex

    counts = {}
    for r in range(rows):
        for c in range(cols):
            h = matrix_hex[r][c]
            if h != "TRANSPARENT":
                counts[h] = counts.get(h, 0) + 1

    min_beads = max(2, int(total_beads * min_ratio))
    minority_colors = {h for h, cnt in counts.items() if cnt <= min_beads}

    if not minority_colors or len(minority_colors) >= len(counts):
        return matrix_hex

    cleaned = [row[:] for row in matrix_hex]
    for r in range(rows):
        for c in range(cols):
            if cleaned[r][c] in minority_colors:
                nbrs = []
                for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < rows and 0 <= nc < cols:
                        nh = matrix_hex[nr][nc]
                        if nh != "TRANSPARENT" and nh not in minority_colors:
                            nbrs.append(nh)
                if nbrs:
                    cleaned[r][c] = max(set(nbrs), key=nbrs.count)

    return cleaned


def extract_photo_craft(image_bytes: bytes, img_bgr: np.ndarray, drop_satellites: bool = True):
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

    # Suppress holes and specular glare on bead plastic
    rgb = suppress_bead_holes_and_glare(rgb)

    mask_binary = (alpha > 30).astype(np.uint8)

    # Discard isolated satellite objects (coins, hands, table edges)
    if drop_satellites:
        mask_binary = filter_largest_connected_component(mask_binary)

    coords = cv2.findNonZero(mask_binary)
    if coords is not None:
        bx, by, bw, bh = cv2.boundingRect(coords)
        pad = 2
        bx1 = max(0, bx - pad)
        by1 = max(0, by - pad)
        bx2 = min(rgb.shape[1], bx + bw + pad)
        by2 = min(rgb.shape[0], by + bh + pad)
        if (bx2 - bx1) >= 4 and (by2 - by1) >= 4:
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
    detect_red_dividers: bool = False,
    input_mode: str = "auto",
    drop_satellites: bool = True,
    prune_minority: bool = True
) -> Dict[str, Any]:
    t_start = time.time()
    nparr = np.frombuffer(image_bytes, np.uint8)
    img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img_bgr is None:
        log_error("Image decode failed: provided file is not a valid image format (PNG/JPG)")
        raise ValueError("Provided file is not a valid image format (PNG/JPG).")

    # Strip solid black letterbox bars if present (e.g. mobile screenshots)
    img_bgr = auto_strip_letterbox(img_bgr)
    orig_h, orig_w = img_bgr.shape[:2]

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

    log_step("Ingest", f"Decoded input image: {orig_w}x{orig_h}px ({len(image_bytes)} bytes) | Target: {width_cm}x{height_cm}cm ({target_cols}x{target_rows} beads) | Brand: {brand_data['name']} | Mode: {input_mode}")

    # 1. Mode Routing & Grid / Craft Detection
    grid_result = None
    is_pixel_art = False

    if input_mode == "grid_chart" or (input_mode == "auto" and decode_cell_codes):
        log_step("Detect", "Attempting annotated chart detection with cell codes...")
        grid_result = detect_annotated_chart(
            img_bgr,
            custom_bg_hex=custom_bg_hex,
            bg_tolerance=bg_tolerance,
            sample_corners_bg=sample_corners_bg,
            detect_red_dividers=detect_red_dividers
        )

    if grid_result is None and (input_mode == "grid_chart" or (input_mode == "auto" and grid_mode != "off")):
        force = (grid_mode == "force" or input_mode == "grid_chart")
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
        is_pixel_art = True
        log_step("Detect", f"Pattern chart detected: extracted {craft_rgb.shape[1]}x{craft_rgb.shape[0]} cells (is_pixel_art=True)")
    elif input_mode == "craft_photo":
        log_step("Detect", "Executing Craft Photo pipeline (anti-hole inpainting + coin/satellite removal)...")
        craft_rgb, craft_mask = extract_photo_craft(image_bytes, img_bgr, drop_satellites=drop_satellites)
        log_step("Detect", f"Craft Photo complete: extracted {craft_rgb.shape[1]}x{craft_rgb.shape[0]} subject")
    elif input_mode == "pixel_art":
        pixel_art_result = extract_pixel_art_sprite(
            image_bytes,
            bg_tolerance=bg_tolerance,
            custom_bg_hex=custom_bg_hex,
            sample_corners_bg=sample_corners_bg
        )
        if pixel_art_result is not None:
            craft_rgb, craft_mask, is_pixel_art = pixel_art_result
        else:
            craft_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
            craft_mask = np.ones((orig_h, orig_w), dtype=np.uint8)
    else:
        # Default "auto" mode: check native pixel art sprite, then fallback to neural segmentation
        log_step("Detect", "Checking for native Pixel Art (RGBA transparency / solid background)...")
        pixel_art_result = extract_pixel_art_sprite(
            image_bytes,
            bg_tolerance=bg_tolerance,
            custom_bg_hex=custom_bg_hex,
            sample_corners_bg=sample_corners_bg
        )

        if pixel_art_result is not None:
            craft_rgb, craft_mask, is_pixel_art = pixel_art_result
            log_step("Detect", f"Pixel Art detected: extracted {craft_rgb.shape[1]}x{craft_rgb.shape[0]} sprite (is_pixel_art={is_pixel_art})")
        else:
            log_step("Detect", "Running neural photo segmentation (rembg) with satellite filter...")
            craft_rgb, craft_mask = extract_photo_craft(image_bytes, img_bgr, drop_satellites=drop_satellites)
            log_step("Detect", f"Photo segmentation complete: extracted {craft_rgb.shape[1]}x{craft_rgb.shape[0]} subject")

    # Defensive boundary verification to eliminate Server 500 crashes
    ch, cw = craft_rgb.shape[:2]
    if ch <= 0 or cw <= 0 or craft_mask is None or craft_mask.size == 0:
        craft_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        craft_mask = np.ones((orig_h, orig_w), dtype=np.uint8)
        ch, cw = orig_h, orig_w

    # 2. Proportionate fitting & 1:1 Pixel Art preservation
    if is_pixel_art and cw <= target_cols and ch <= target_rows:
        fit_w = cw
        fit_h = ch
        resized_craft_rgb = craft_rgb.copy()
        resized_craft_mask = craft_mask.copy()
        log_step("Scale", f"Preserved 1:1 native scale ({cw}x{ch} beads) centered on {target_cols}x{target_rows} grid")
    else:
        aspect_craft = cw / float(max(1, ch))
        aspect_target = target_cols / float(max(1, target_rows))

        if aspect_craft > aspect_target:
            fit_w = target_cols
            fit_h = max(1, int(round(target_cols / aspect_craft)))
        else:
            fit_h = target_rows
            fit_w = max(1, int(round(target_rows * aspect_craft)))

        # Use clean area sampling for photos to avoid aliasing; INTER_NEAREST for pixel art
        interp = cv2.INTER_NEAREST if is_pixel_art else cv2.INTER_AREA
        resized_craft_rgb = cv2.resize(craft_rgb, (fit_w, fit_h), interpolation=interp)
        resized_craft_mask = cv2.resize(craft_mask, (fit_w, fit_h), interpolation=cv2.INTER_NEAREST)
        log_step("Scale", f"Proportionally scaled {cw}x{ch} to {fit_w}x{fit_h} beads on {target_cols}x{target_rows} grid")

    # 3. Clean color consolidation & plastic bead stabilization (photo mode only)
    if not is_pixel_art:
        hsv = cv2.cvtColor(resized_craft_rgb, cv2.COLOR_RGB2HSV)
        # White plastic: High value, low saturation (prevents bead holes from making belly grey in photos)
        is_white_bead = (hsv[:, :, 1] < 38) & (hsv[:, :, 2] > 175)
        resized_craft_rgb[is_white_bead] = [255, 255, 255]

    # Optional Flat Shading
    if flat_colors:
        min_c = np.min(resized_craft_rgb, axis=2)
        max_c = np.max(resized_craft_rgb, axis=2)
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
    t_quant_start = time.time()
    quantized_img, color_counts, matrix_hex = quantize_ciede2000(canvas_rgb, active_palette)
    t_quant_ms = (time.time() - t_quant_start) * 1000
    algorithm_used = f"ciede2000_{brand_data['id']}"
    log_step("Quantize", f"CIEDE2000 completed in {t_quant_ms:.1f}ms against {len(active_palette)} {brand_data['name']} palette colors")

    # In cutout mode, outer canvas area without craft becomes transparent
    if background_mode == "cutout":
        for r in range(target_rows):
            for c in range(target_cols):
                if canvas_mask[r, c] == 0:
                    matrix_hex[r][c] = "TRANSPARENT"

        # Eliminate stray disconnected orphan beads (orphans cannot physically fuse)
        matrix_hex = eliminate_orphan_beads(matrix_hex, max_orphan_size=2)

        # Synchronize canvas_mask so final preview drops orphan pixels as well
        for r in range(target_rows):
            for c in range(target_cols):
                if matrix_hex[r][c] == "TRANSPARENT":
                    canvas_mask[r, c] = 0

    # Prune isolated minority beads (< 0.8% of total) to eliminate stray glare/reflection colors
    if prune_minority:
        matrix_hex = prune_minority_beads(matrix_hex, min_ratio=0.008)

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
        info = brand_lookup.get(upper_hex) or GLOBAL_COLOR_LOOKUP.get(upper_hex, {})
        clean_color_counts.append({
            "hex": hx,
            "count": cnt,
            "code": info.get("code", ""),
            "name": info.get("name", f"{brand_data['name']} Bead")
        })

    t_total_ms = (time.time() - t_start) * 1000
    total_beads_count = sum(filtered_counts.values())
    log_step("Success", f"Pattern ready in {t_total_ms:.1f}ms: {total_beads_count} beads across {len(clean_color_counts)} colors")

    # Update quantized image buffer with clean matrix colors
    for r in range(target_rows):
        for c in range(target_cols):
            h_val = matrix_hex[r][c]
            if h_val != "TRANSPARENT":
                from app.core.color_utils import hex_to_rgb
                quantized_img[r, c] = hex_to_rgb(h_val)

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
