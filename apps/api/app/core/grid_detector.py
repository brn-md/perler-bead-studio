"""
Automatic Grid Template Extractor (app/core/grid_detector.py)
-------------------------------------------------------------
Detects if an image already has a bead grid drawn on it,
calculates the pitch and origin of the grid cells with subpixel accuracy,
and samples the exact center of each bead cell.
"""

from typing import Optional, Tuple
import cv2
import numpy as np
import scipy.signal

def detect_and_sample_grid_template(img_bgr: np.ndarray) -> Optional[Tuple[np.ndarray, np.ndarray]]:
    """
    If the image is an existing bead grid template (like the dog template),
    detects the periodic grid frequency and extracts the pure pixel art matrix.
    Returns (cell_matrix_rgb, character_mask) or None if not a grid template.
    """
    h, w = img_bgr.shape[:2]
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    # Check for periodic dark grid lines
    col_darkness = np.mean(gray < 90, axis=0)
    row_darkness = np.mean(gray < 90, axis=1)

    col_peaks, _ = scipy.signal.find_peaks(col_darkness, distance=16, prominence=0.10)
    row_peaks, _ = scipy.signal.find_peaks(row_darkness, distance=16, prominence=0.10)

    if len(col_peaks) < 8 or len(row_peaks) < 8:
        return None

    col_diffs = np.diff(col_peaks)
    row_diffs = np.diff(row_peaks)

    # Find fundamental pitch (the common divisor of spacing)
    # Pitch is typically between 18 and 35 pixels
    valid_col_diffs = [d for d in col_diffs if 16 <= d <= 35]
    if len(valid_col_diffs) < 4:
        return None

    pitch_x = float(np.median(valid_col_diffs))
    valid_row_diffs = [d for d in row_diffs if 16 <= d <= 35]
    pitch_y = float(np.median(valid_row_diffs)) if len(valid_row_diffs) >= 4 else pitch_x

    # Find starting offset x0, y0
    x0 = float(col_peaks[0] % pitch_x)
    y0 = float(row_peaks[0] % pitch_y)

    cols = int((w - x0) / pitch_x)
    rows = int((h - y0) / pitch_y)

    if cols < 10 or rows < 10:
        return None

    # Sample cell centers
    grid_rgb = np.zeros((rows, cols, 3), dtype=np.uint8)
    for r in range(rows):
        cy = int(y0 + (r + 0.5) * pitch_y)
        for c in range(cols):
            cx = int(x0 + (c + 0.5) * pitch_x)
            if 0 <= cy < h and 0 <= cx < w:
                # Sample 3x3 patch around center to avoid noise
                patch = img_bgr[max(0, cy-1):min(h, cy+2), max(0, cx-1):min(w, cx+2)]
                b, g, r_val = np.median(patch.reshape(-1, 3), axis=0)
                grid_rgb[r, c] = [int(r_val), int(g), int(b)]

    # Detect character vs outer white background using multi-edge floodfill
    # In templates, outer background is white cells connected to ANY outer edge
    grid_gray = cv2.cvtColor(grid_rgb, cv2.COLOR_RGB2GRAY)
    is_white = (grid_gray > 220).astype(np.uint8)

    # Floodfill outer white from ALL 4 perimeter edges
    flood_mask = np.zeros((rows + 2, cols + 2), dtype=np.uint8)
    temp = is_white.copy() * 255

    for c in range(cols):
        if is_white[0, c] and temp[0, c] == 255:
            cv2.floodFill(temp, flood_mask, (c, 0), 100)
        if is_white[rows - 1, c] and temp[rows - 1, c] == 255:
            cv2.floodFill(temp, flood_mask, (c, rows - 1), 100)

    for r in range(rows):
        if is_white[r, 0] and temp[r, 0] == 255:
            cv2.floodFill(temp, flood_mask, (0, r), 100)
        if is_white[r, cols - 1] and temp[r, cols - 1] == 255:
            cv2.floodFill(temp, flood_mask, (cols - 1, r), 100)

    outer_bg = (temp == 100)
    character_mask = (~outer_bg).astype(np.uint8)

    # Crop tightly to character
    coords = cv2.findNonZero(character_mask)
    if coords is not None:
        bx, by, bw, bh = cv2.boundingRect(coords)
        cropped_rgb = grid_rgb[by:by+bh, bx:bx+bw]
        cropped_mask = character_mask[by:by+bh, bx:bx+bw]
        return cropped_rgb, cropped_mask

    return grid_rgb, character_mask
