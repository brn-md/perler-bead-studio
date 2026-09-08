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
from typing import List, Optional, Dict, Any

import cv2
import numpy as np
from PIL import Image

from app.services.quantization import quantize_kmeans, quantize_cielab
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
    bg_tolerance: float = 30.0,
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
        # 2. Camera photo mode with local AI
        craft_rgb, craft_mask = extract_photo_craft(image_bytes, img_bgr)

    # 3. Scale proportionally to target dimensions
    ch, cw = craft_rgb.shape[:2]
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

    # Optional Flat Shading: unify light grey shadows into pure white
    if flat_colors:
        # If color is near-neutral light grey (R, G, B > 185 and diff < 20), turn into pure white
        r = resized_craft_rgb[:, :, 0].astype(int)
        g = resized_craft_rgb[:, :, 1].astype(int)
        b = resized_craft_rgb[:, :, 2].astype(int)
        max_c = np.maximum(np.maximum(r, g), b)
        min_c = np.minimum(np.minimum(r, g), b)
        is_grey_shadow = (min_c > 105) & ((max_c - min_c) < 25)
        resized_craft_rgb[is_grey_shadow] = [255, 255, 255]

    # Center craft inside the full matrix
    offset_x = (target_cols - fit_w) // 2
    offset_y = (target_rows - fit_h) // 2

    canvas_rgb = np.full((target_rows, target_cols, 3), 255, dtype=np.uint8)
    canvas_mask = np.zeros((target_rows, target_cols), dtype=np.uint8)

    canvas_rgb[offset_y:offset_y+fit_h, offset_x:offset_x+fit_w] = resized_craft_rgb
    canvas_mask[offset_y:offset_y+fit_h, offset_x:offset_x+fit_w] = resized_craft_mask

    # Quantize colors using CIELAB Delta E to brand palette
    quantized_img, color_counts, matrix_hex = quantize_cielab(canvas_rgb, active_palette)
    algorithm_used = f"cielab_{brand_data['id']}"

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
