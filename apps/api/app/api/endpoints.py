"""
API Endpoints Router (app/api/endpoints.py)
-------------------------------------------
REST routes:
- GET  /api/brands: Catalog of all supported bead brands (Perler, Hama, Artkal, Nabbi, MARD).
- GET  /api/brands/{brand_id}: Colors for a specific brand.
- POST /api/extract-palette: Automatically extracts dominant colors present
  in the uploaded image and maps them to the closest manufacturer beads.
- POST /api/process: Quantize image to bead pattern with proportional aspect ratio lock.
"""

import json
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import cv2
import numpy as np
from sklearn.cluster import KMeans
from skimage.color import rgb2lab

from app.schemas.process import ProcessResponse
from app.services.image_processor import process_pixel_art
from app.services.pdf_generator import generate_bead_pdf
from app.core.brands import get_all_brands_summary, get_brand_data, BRANDS_CATALOG
from app.core.color_utils import hex_to_rgb, rgb_to_hex

router = APIRouter(prefix="/api", tags=["Pixel Art Processing"])

@router.get("/brands", summary="List all supported bead brands with their palettes")
def get_brands():
    return {"brands": get_all_brands_summary()}


@router.get("/brands/{brand_id}", summary="Get palette and metadata for a specific brand")
def get_brand(brand_id: str):
    data = get_brand_data(brand_id)
    if not data:
        raise HTTPException(status_code=404, detail=f"Brand '{brand_id}' not found.")
    return data


@router.get("/presets/palette", response_model=List[str])
def get_standard_palette():
    perler_colors = get_brand_data("perler")["colors"]
    return [c["hex"] for c in perler_colors]


@router.post("/extract-palette")
async def extract_palette_from_image(
    file: UploadFile = File(...),
    brand: Optional[str] = Form("perler"),
    max_colors: Optional[int] = Form(10)
):
    """
    Intelligently extracts the true colors used in the uploaded image,
    maps each to the closest official bead from the selected brand in CIELAB,
    and returns the optimized palette.
    """
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img_bgr is None:
        raise HTTPException(status_code=400, detail="Invalid image file.")

    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

    # Filter out empty white paper (>240) and black grid lines (<30)
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    mask_active = (gray < 240) & (gray > 30)

    active_pixels = img_rgb[mask_active]
    if len(active_pixels) < 50:
        active_pixels = img_rgb.reshape(-1, 3)

    # Find dominant clusters with KMeans
    n_clusters = min(max(4, max_colors or 8), len(np.unique(active_pixels, axis=0)))
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init="auto")
    kmeans.fit(active_pixels.astype(np.float32))
    centers = np.clip(np.round(kmeans.cluster_centers_), 0, 255).astype(np.uint8)

    # Always include White (#FFFFFF) and Black (#000000) as essentials
    raw_palette_rgb = [[255, 255, 255], [0, 0, 0]] + centers.tolist()

    # Map each cluster to the closest bead in the selected brand
    brand_info = get_brand_data(brand)
    brand_catalog = brand_info["colors"]

    brand_rgb_list = [hex_to_rgb(item["hex"]) for item in brand_catalog]
    brand_rgb_arr = np.array(brand_rgb_list, dtype=np.float32) / 255.0
    brand_lab = rgb2lab(brand_rgb_arr.reshape(-1, 1, 3)).reshape(-1, 3)

    extracted_hexes = []
    seen = set()

    for rgb in raw_palette_rgb:
        c_rgb_norm = (np.array(rgb, dtype=np.float32) / 255.0).reshape(1, 1, 3)
        c_lab = rgb2lab(c_rgb_norm).reshape(1, 3)
        dists = np.linalg.norm(brand_lab - c_lab, axis=1)
        best_idx = int(np.argmin(dists))
        best_hex = brand_catalog[best_idx]["hex"].upper()
        if best_hex not in seen:
            seen.add(best_hex)
            extracted_hexes.append(best_hex)

    return {
        "brand": brand_info["id"],
        "brand_name": brand_info["name"],
        "palette": extracted_hexes
    }


@router.post(
    "/process",
    response_model=ProcessResponse,
    summary="Process and quantize an image for physical bead art"
)
async def process_image_endpoint(
    file: UploadFile = File(..., description="Uploaded image file (PNG, JPG, etc.)"),
    width_cm: float = Form(..., description="Desired total width in centimeters"),
    height_cm: float = Form(..., description="Desired total height in centimeters"),
    bead_size_cm: float = Form(..., description="Physical bead unit diameter in cm (e.g. 0.26 or 0.5)"),
    brand: Optional[str] = Form("perler", description="Bead brand: perler, hama, artkal, nabbi, mard"),
    palette_hex: Optional[str] = Form(None, description="Optional JSON array string of Hex colors, e.g. [\"#FF0000\"]"),
    k_colors: Optional[int] = Form(16, description="Number of dominant colors"),
    crop_x: Optional[float] = Form(0.0, description="Relative crop X offset (0.0 to 1.0)"),
    crop_y: Optional[float] = Form(0.0, description="Relative crop Y offset (0.0 to 1.0)"),
    crop_w: Optional[float] = Form(1.0, description="Relative crop width (0.0 to 1.0)"),
    crop_h: Optional[float] = Form(1.0, description="Relative crop height (0.0 to 1.0)"),
    enhance_edges: Optional[bool] = Form(True, description="Enable bead hole filling and edge enhancement"),
    isolate_subject: Optional[bool] = Form(True, description="Automatically remove background fabric/table"),
    background_mode: Optional[str] = Form("cutout", description="Background mode: 'cutout' (transparent silhouette) or 'solid' (fill plate with beads)"),
    grid_mode: Optional[str] = Form("auto", description="Grid detector mode: 'auto', 'force', or 'off'"),
    bg_tolerance: Optional[float] = Form(30.0, description="Perimeter background Delta-E color tolerance (0-100)"),
    flat_colors: Optional[bool] = Form(False, description="Flatten noise and secondary shading into pure base colors"),
    custom_bg_hex: Optional[str] = Form(None, description="Optional custom background color hex (e.g. #FFFFFF or #F3ACD4)"),
    decode_cell_codes: Optional[bool] = Form(False, description="Explicitly decode pattern charts with cell letters/codes and rulers")
):
    if width_cm <= 0 or height_cm <= 0 or bead_size_cm <= 0:
        raise HTTPException(
            status_code=400,
            detail="Dimensions and bead unit size must be strictly greater than 0."
        )

    parsed_palette: Optional[List[str]] = None
    if palette_hex:
        try:
            palette_data = json.loads(palette_hex)
            if isinstance(palette_data, list) and len(palette_data) > 0:
                parsed_palette = [str(c).strip() for c in palette_data if str(c).strip()]
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid JSON string in palette_hex: {str(e)}"
            )

    try:
        contents = await file.read()
        result = process_pixel_art(
            image_bytes=contents,
            width_cm=width_cm,
            height_cm=height_cm,
            bead_size_cm=bead_size_cm,
            brand=brand or "perler",
            palette_hex=parsed_palette,
            k_colors=k_colors,
            crop_x=crop_x,
            crop_y=crop_y,
            crop_w=crop_w,
            crop_h=crop_h,
            enhance_edges=enhance_edges,
            isolate_subject=isolate_subject,
            background_mode=background_mode or "cutout",
            grid_mode=grid_mode or "auto",
            bg_tolerance=float(bg_tolerance) if bg_tolerance is not None else 30.0,
            flat_colors=bool(flat_colors),
            custom_bg_hex=custom_bg_hex.strip() if custom_bg_hex and custom_bg_hex.strip() else None,
            decode_cell_codes=bool(decode_cell_codes)
        )
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Image processing error: {str(exc)}")


class ExportPdfRequest(BaseModel):
    matrix: List[List[str]]
    grid: Dict[str, Any]
    color_counts: List[Dict[str, Any]]
    brand: Optional[str] = "perler"
    pegboard_size_cm: Optional[float] = 14.5


@router.post("/export-pdf", summary="Export calibrated 1:1 scale printable A4 PDF")
async def export_pdf_endpoint(payload: ExportPdfRequest):
    """
    Generates a millimeter-calibrated 1:1 scale printable A4 PDF
    with direct pegboard overlay guidance, test ruler, and shopping checklist.
    """
    try:
        pdf_buffer = generate_bead_pdf(
            matrix=payload.matrix,
            grid=payload.grid,
            color_counts=payload.color_counts,
            brand_id=payload.brand or "perler",
            pegboard_size_cm=payload.pegboard_size_cm or 14.5
        )
        filename = f"{payload.brand or 'perler'}-pattern-1to1.pdf"
        return StreamingResponse(
            pdf_buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"PDF generation error: {str(exc)}")

