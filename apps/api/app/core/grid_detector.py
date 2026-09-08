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

def detect_and_sample_grid_template(
    img_bgr: np.ndarray,
    force_grid: bool = False,
    bg_tolerance: float = 30.0
) -> Optional[Tuple[np.ndarray, np.ndarray]]:
    """
    If the image is an existing bead grid template (like Mario or Hello Kitty on pink grid),
    detects the periodic grid frequency (from 6px up to 45px) and extracts the pure pixel art matrix.
    Uses perimeter color sampling + CIELAB Delta E floodfill to cleanly isolate the character.
    Returns (cell_matrix_rgb, character_mask) or None if not a grid template.
    """
    from skimage.color import rgb2lab

    h, w = img_bgr.shape[:2]
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    # Check for periodic dark grid lines
    col_darkness = np.mean(gray < 110, axis=0)
    row_darkness = np.mean(gray < 110, axis=1)

    min_dist = 5
    prominence = 0.04 if force_grid else 0.07

    col_peaks, _ = scipy.signal.find_peaks(col_darkness, distance=min_dist, prominence=prominence)
    row_peaks, _ = scipy.signal.find_peaks(row_darkness, distance=min_dist, prominence=prominence)

    min_peaks = 6 if force_grid else 8
    if len(col_peaks) < min_peaks or len(row_peaks) < min_peaks:
        return None

    col_diffs = np.diff(col_peaks)
    row_diffs = np.diff(row_peaks)

    # Find fundamental pitch from 5px to 45px
    valid_col_diffs = [d for d in col_diffs if 5 <= d <= 45]
    if len(valid_col_diffs) < 3:
        return None

    pitch_x = float(np.median(valid_col_diffs))
    valid_row_diffs = [d for d in row_diffs if 5 <= d <= 45]
    pitch_y = float(np.median(valid_row_diffs)) if len(valid_row_diffs) >= 3 else pitch_x

    # If pitch is a multiple of a smaller fundamental pitch (e.g. 16 instead of 8)
    for sub in [2, 3]:
        if pitch_x / sub >= 5:
            # Check if sub-pitch fits data better
            sub_count = sum(1 for d in valid_col_diffs if abs(d - pitch_x / sub) <= 1)
            if sub_count >= len(valid_col_diffs) * 0.3:
                pitch_x = pitch_x / sub
        if pitch_y / sub >= 5:
            sub_count = sum(1 for d in valid_row_diffs if abs(d - pitch_y / sub) <= 1)
            if sub_count >= len(valid_row_diffs) * 0.3:
                pitch_y = pitch_y / sub

    # Find starting offset x0, y0
    x0 = float(col_peaks[0] % pitch_x)
    y0 = float(row_peaks[0] % pitch_y)

    cols = int(round((w - x0) / pitch_x))
    rows = int(round((h - y0) / pitch_y))

    if cols < 8 or rows < 8:
        return None

    # Sample cell centers
    grid_rgb = np.zeros((rows, cols, 3), dtype=np.uint8)
    for r in range(rows):
        cy = int(y0 + (r + 0.5) * pitch_y)
        for c in range(cols):
            cx = int(x0 + (c + 0.5) * pitch_x)
            if 0 <= cy < h and 0 <= cx < w:
                patch = img_bgr[max(0, cy-1):min(h, cy+2), max(0, cx-1):min(w, cx+2)]
                b, g, r_val = np.median(patch.reshape(-1, 3), axis=0)
                grid_rgb[r, c] = [int(r_val), int(g), int(b)]

    # Detect background by sampling all 4 perimeter borders
    grid_lab = rgb2lab(grid_rgb / 255.0)

    border_lab = []
    for c in range(cols):
        border_lab.append(grid_lab[0, c])
        border_lab.append(grid_lab[rows - 1, c])
    for r in range(rows):
        border_lab.append(grid_lab[r, 0])
        border_lab.append(grid_lab[r, cols - 1])

    bg_lab = np.median(border_lab, axis=0)
    delta_e = np.linalg.norm(grid_lab - bg_lab, axis=2)

    # Floodfill from all 4 perimeter edges based on CIELAB Delta E
    is_bg_candidate = (delta_e < float(bg_tolerance)).astype(np.uint8)

    flood_mask = np.zeros((rows + 2, cols + 2), dtype=np.uint8)
    temp = is_bg_candidate.copy() * 255

    for c in range(cols):
        if is_bg_candidate[0, c] and temp[0, c] == 255:
            cv2.floodFill(temp, flood_mask, (c, 0), 100)
        if is_bg_candidate[rows - 1, c] and temp[rows - 1, c] == 255:
            cv2.floodFill(temp, flood_mask, (c, rows - 1), 100)

    for r in range(rows):
        if is_bg_candidate[r, 0] and temp[r, 0] == 255:
            cv2.floodFill(temp, flood_mask, (0, r), 100)
        if is_bg_candidate[r, cols - 1] and temp[r, cols - 1] == 255:
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
