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
from skimage.color import rgb2lab
from app.core.color_utils import hex_to_rgb


def auto_strip_letterbox(img_bgr: np.ndarray) -> np.ndarray:
    """
    Strips solid black or near-black letterbox / pillarbox bars (common in mobile screenshots).
    """
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    row_means = np.mean(gray, axis=1)
    col_means = np.mean(gray, axis=0)

    valid_rows = np.where(row_means > 12)[0]
    valid_cols = np.where(col_means > 12)[0]

    if len(valid_rows) > 0 and len(valid_cols) > 0:
        r0, r1 = valid_rows[0], valid_rows[-1]
        c0, c1 = valid_cols[0], valid_cols[-1]
        if (r1 - r0 + 1) < img_bgr.shape[0] or (c1 - c0 + 1) < img_bgr.shape[1]:
            return img_bgr[r0:r1 + 1, c0:c1 + 1]
    return img_bgr


def sample_corner_background(
    img_bgr: np.ndarray,
    margin: int = 5,
    patch_size: int = 8
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Samples the 4 extreme corners of the image (TL, TR, BL, BR),
    which are guaranteed to be empty paper / background canvas.
    Returns (med_bgr, med_lab).
    """
    h, w = img_bgr.shape[:2]
    p = max(1, patch_size)
    m = max(0, margin)

    tl = img_bgr[m:m + p, m:m + p]
    tr = img_bgr[m:m + p, max(0, w - m - p):w - m]
    bl = img_bgr[max(0, h - m - p):h - m, m:m + p]
    br = img_bgr[max(0, h - m - p):h - m, max(0, w - m - p):w - m]

    samples = []
    for corner in [tl, tr, bl, br]:
        if corner.size > 0:
            samples.append(corner.reshape(-1, 3))

    if len(samples) > 0:
        all_pixels = np.vstack(samples)
        med_bgr = np.median(all_pixels, axis=0).astype(np.uint8)
    else:
        med_bgr = np.array([255, 255, 255], dtype=np.uint8)

    med_rgb_norm = (med_bgr[::-1].astype(np.float32) / 255.0).reshape(1, 1, 3)
    med_lab = rgb2lab(med_rgb_norm).reshape(3)
    return med_bgr, med_lab


def detect_red_grid_lines(img_bgr: np.ndarray) -> Optional[dict]:
    """
    Detects red divider lines on fuse bead pegboard charts (R - (G+B)/2 > 15).
    These lines run along the borders between cells, on top of black grid lines, not through beads.
    Returns detected pitch, origin, and bounds if periodic red dividers are found.
    """
    img = auto_strip_letterbox(img_bgr)
    h, w = img.shape[:2]
    b, g, r = cv2.split(img.astype(np.float32))
    redness = r - (g + b) / 2.0
    red_mask = (redness > 15).astype(np.uint8)

    proj_x = np.mean(red_mask, axis=0)
    proj_y = np.mean(red_mask, axis=1)

    peaks_x, _ = scipy.signal.find_peaks(proj_x, height=0.012, distance=10)
    peaks_y, _ = scipy.signal.find_peaks(proj_y, height=0.012, distance=10)

    if len(peaks_x) < 3 or len(peaks_y) < 3:
        return None

    diff_x = np.diff(peaks_x)
    diff_y = np.diff(peaks_y)

    valid_dx = diff_x[(diff_x >= 5) & (diff_x <= 45)]
    valid_dy = diff_y[(diff_y >= 5) & (diff_y <= 45)]

    pitch_x = float(np.median(valid_dx)) if len(valid_dx) >= 3 else None
    pitch_y = float(np.median(valid_dy)) if len(valid_dy) >= 3 else None

    # Pegboard charts often draw red lines every 5 beads (diff ~ 70-110px)
    block_dx = diff_x[(diff_x >= 70) & (diff_x <= 110)]
    if block_dx.size >= 2 and (pitch_x is None or pitch_x > 45):
        pitch_x = float(np.median(block_dx)) / 5.0

    block_dy = diff_y[(diff_y >= 70) & (diff_y <= 110)]
    if block_dy.size >= 2 and (pitch_y is None or pitch_y > 45):
        pitch_y = float(np.median(block_dy)) / 5.0

    if not pitch_x or not pitch_y:
        return None

    return {
        "pitch_x": pitch_x,
        "pitch_y": pitch_y,
        "x0": float(peaks_x[0]),
        "x1": float(peaks_x[-1]),
        "y0": float(peaks_y[0]),
        "y1": float(peaks_y[-1]),
        "peaks_x": peaks_x,
        "peaks_y": peaks_y
    }


def detect_annotated_chart(
    img_bgr: np.ndarray,
    custom_bg_hex: Optional[str] = None,
    bg_tolerance: float = 18.0,
    sample_corners_bg: bool = False,
    detect_red_dividers: bool = False
) -> Optional[Tuple[np.ndarray, np.ndarray]]:
    """
    Detects if an image is an annotated fuse bead pattern chart
    (with outer coordinate rulers, grid lines, and text in cells).
    Extracts the bead matrix ignoring cell text codes and cleans background.
    """
    img = auto_strip_letterbox(img_bgr)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape

    # Detect horizontal and vertical grid lines using Sobel edge projections
    grad_y = np.abs(cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3))
    grad_x = np.abs(cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3))

    proj_y = np.mean(grad_y[:, int(w * 0.15):int(w * 0.85)], axis=1)
    proj_x = np.mean(grad_x[int(h * 0.15):int(h * 0.85), :], axis=0)

    peaks_y, _ = scipy.signal.find_peaks(proj_y, height=np.percentile(proj_y, 70), distance=12)
    peaks_x, _ = scipy.signal.find_peaks(proj_x, height=np.percentile(proj_x, 70), distance=12)

    if len(peaks_y) < 15 or len(peaks_x) < 15:
        return None

    diff_y = np.diff(peaks_y)
    diff_x = np.diff(peaks_x)
    pitch_y = float(np.median(diff_y[diff_y < 35]))
    pitch_x = float(np.median(diff_x[diff_x < 35]))

    if not (12 <= pitch_x <= 40 and 12 <= pitch_y <= 40):
        return None
    if abs(pitch_x - pitch_y) > 4:
        return None

    # Find the table boundaries excluding outer coordinate rulers
    x0 = int(peaks_x[1])
    x1 = int(peaks_x[-2] if (peaks_x[-1] - peaks_x[-2]) < pitch_x * 1.5 else peaks_x[-1])

    valid_y = [p for p in peaks_y if p > pitch_y * 1.8 and p < h - pitch_y * 2.2]
    if len(valid_y) < 12:
        return None
    y0 = int(valid_y[0])
    y1 = int(valid_y[-1])

    cols = int(round((x1 - x0) / pitch_x))
    rows = int(round((y1 - y0) / pitch_y))

    if cols < 10 or rows < 10:
        return None

    cell_w = (x1 - x0) / cols
    cell_h = (y1 - y0) / rows

    sampled_rgb = np.zeros((rows, cols, 3), dtype=np.uint8)
    is_bead = np.zeros((rows, cols), dtype=bool)

    for r in range(rows):
        for c in range(cols):
            cx0 = int(round(x0 + c * cell_w))
            cx1 = int(round(x0 + (c + 1) * cell_w))
            cy0 = int(round(y0 + r * cell_h))
            cy1 = int(round(y0 + (r + 1) * cell_h))

            pad_x = max(1, int((cx1 - cx0) * 0.18))
            pad_y = max(1, int((cy1 - cy0) * 0.18))
            patch = img[cy0 + pad_y:cy1 - pad_y, cx0 + pad_x:cx1 - pad_x]
            if patch.size == 0:
                continue

            patch_gray = cv2.cvtColor(patch, cv2.COLOR_BGR2GRAY)
            min_g = np.min(patch_gray)

            # Filter out dark text ink (e.g. 'C3', 'R15', 'H2') to find true cell background
            non_text = patch[patch_gray > 80]
            if len(non_text) > 0:
                med_bgr = np.median(non_text, axis=0).astype(np.uint8)
            else:
                med_bgr = np.median(patch.reshape(-1, 3), axis=0).astype(np.uint8)

            sampled_rgb[r, c] = med_bgr[::-1]  # BGR to RGB

            r_c, g_c, b_c = int(med_bgr[2]), int(med_bgr[1]), int(med_bgr[0])
            is_colored = (max(r_c, g_c, b_c) - min(r_c, g_c, b_c)) > 20 or np.mean([r_c, g_c, b_c]) < 220
            has_text_code = min_g < 135

            if is_colored or has_text_code:
                is_bead[r, c] = True

    # Floodfill empty cells from the outside borders (or 4 corners if sample_corners_bg is True)
    mask = np.zeros((rows + 2, cols + 2), dtype=np.uint8)
    empty_map = (~is_bead).astype(np.uint8)

    if sample_corners_bg:
        corners = [(0, 0), (cols - 1, 0), (0, rows - 1), (cols - 1, rows - 1)]
        for c, r in corners:
            if empty_map[r, c] == 1:
                cv2.floodFill(empty_map, mask, (c, r), 2)
    else:
        for r in range(rows):
            for c in [0, cols - 1]:
                if empty_map[r, c] == 1:
                    cv2.floodFill(empty_map, mask, (c, r), 2)
        for c in range(cols):
            for r in [0, rows - 1]:
                if empty_map[r, c] == 1:
                    cv2.floodFill(empty_map, mask, (c, r), 2)

    char_mask = (empty_map != 2).astype(np.uint8)

    # Filter stray perimeter noise & lines (keep body and accessories, reject ruler lines & watermarks)
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(char_mask, connectivity=4)
    final_mask = np.zeros_like(char_mask)
    if num_labels > 1:
        max_area = max(stats[lbl, cv2.CC_STAT_AREA] for lbl in range(1, num_labels))
        for lbl in range(1, num_labels):
            area = stats[lbl, cv2.CC_STAT_AREA]
            comp_h = stats[lbl, cv2.CC_STAT_HEIGHT]
            comp_w = stats[lbl, cv2.CC_STAT_WIDTH]
            if area >= max(16, int(max_area * 0.025)):
                if not (comp_h <= 2 and comp_w > cols * 0.4):
                    final_mask[labels == lbl] = 255

    coords = cv2.findNonZero(final_mask)
    if coords is not None:
        bx, by, bw, bh = cv2.boundingRect(coords)
        return sampled_rgb[by:by + bh, bx:bx + bw], final_mask[by:by + bh, bx:bx + bw]

    return sampled_rgb, final_mask


def detect_and_sample_grid_template(
    img_bgr: np.ndarray,
    force_grid: bool = False,
    bg_tolerance: float = 18.0,
    custom_bg_hex: Optional[str] = None,
    sample_corners_bg: bool = False,
    detect_red_dividers: bool = False
) -> Optional[Tuple[np.ndarray, np.ndarray]]:
    """
    If the image is an existing bead grid template (like Mario or Hello Kitty on pink grid),
    detects the periodic grid frequency (from 6px up to 45px) and extracts the pure pixel art matrix.
    Uses perimeter/corner color sampling + CIELAB Delta E floodfill to cleanly isolate the character.
    Returns (cell_matrix_rgb, character_mask) or None if not a grid template.
    """
    from skimage.color import rgb2lab

    h, w = img_bgr.shape[:2]
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

    # If red dividers detection is requested, check if red lines exist
    red_info = None
    if detect_red_dividers:
        red_info = detect_red_grid_lines(img_bgr)

    # Check for periodic dark grid lines
    col_darkness = np.mean(gray < 110, axis=0)
    row_darkness = np.mean(gray < 110, axis=1)

    min_dist = 5
    prominence = 0.04 if force_grid else 0.07

    col_peaks, _ = scipy.signal.find_peaks(col_darkness, distance=min_dist, prominence=prominence)
    row_peaks, _ = scipy.signal.find_peaks(row_darkness, distance=min_dist, prominence=prominence)

    min_peaks = 6 if force_grid else 8
    if (len(col_peaks) < min_peaks or len(row_peaks) < min_peaks) and not red_info:
        return None

    if red_info is not None:
        pitch_x = red_info["pitch_x"]
        pitch_y = red_info["pitch_y"]
        x0 = float(red_info["x0"] % pitch_x)
        y0 = float(red_info["y0"] % pitch_y)
    else:
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

    # Sample cell centers (with inner margin padding if red divider avoidance is active)
    grid_rgb = np.zeros((rows, cols, 3), dtype=np.uint8)
    for r in range(rows):
        cy0 = int(round(y0 + r * pitch_y))
        cy1 = int(round(y0 + (r + 1) * pitch_y))
        pad_y = max(1, int((cy1 - cy0) * 0.22)) if detect_red_dividers else 1

        for c in range(cols):
            cx0 = int(round(x0 + c * pitch_x))
            cx1 = int(round(x0 + (c + 1) * pitch_x))
            pad_x = max(1, int((cx1 - cx0) * 0.22)) if detect_red_dividers else 1

            if detect_red_dividers:
                # Sample inside the inner cell margin away from red and black divider lines
                patch = img_bgr[max(0, cy0 + pad_y):min(h, cy1 - pad_y), max(0, cx0 + pad_x):min(w, cx1 - pad_x)]
                if patch.size > 0:
                    b_p, g_p, r_p = cv2.split(patch.astype(np.float32))
                    redness = r_p - (g_p + b_p) / 2.0
                    clean_pixels = patch[redness <= 15]
                    if len(clean_pixels) > 0:
                        b_val, g_val, r_val = np.median(clean_pixels, axis=0)
                    else:
                        b_val, g_val, r_val = np.median(patch.reshape(-1, 3), axis=0)
                    grid_rgb[r, c] = [int(r_val), int(g_val), int(b_val)]
            else:
                cy = int(y0 + (r + 0.5) * pitch_y)
                cx = int(x0 + (c + 0.5) * pitch_x)
                if 0 <= cy < h and 0 <= cx < w:
                    patch = img_bgr[max(0, cy - 1):min(h, cy + 2), max(0, cx - 1):min(w, cx + 2)]
                    b_val, g_val, r_val = np.median(patch.reshape(-1, 3), axis=0)
                    grid_rgb[r, c] = [int(r_val), int(g_val), int(b_val)]

    # Detect background by sampling perimeter or 4 corners
    grid_lab = rgb2lab(grid_rgb / 255.0)

    if custom_bg_hex:
        try:
            c_rgb = np.array(hex_to_rgb(custom_bg_hex), dtype=np.float32) / 255.0
            bg_lab = rgb2lab(c_rgb.reshape(1, 1, 3)).reshape(3)
        except Exception:
            bg_lab = np.median(grid_lab.reshape(-1, 3), axis=0)
    elif sample_corners_bg:
        # Sample exclusively the 4 outer corners (guaranteed empty canvas)
        c_tl = grid_lab[0:min(2, rows), 0:min(2, cols)].reshape(-1, 3)
        c_tr = grid_lab[0:min(2, rows), max(0, cols - 2):cols].reshape(-1, 3)
        c_bl = grid_lab[max(0, rows - 2):rows, 0:min(2, cols)].reshape(-1, 3)
        c_br = grid_lab[max(0, rows - 2):rows, max(0, cols - 2):cols].reshape(-1, 3)
        corners = np.vstack([c_tl, c_tr, c_bl, c_br])
        bg_lab = np.median(corners, axis=0)
    else:
        border_lab = []
        for c in range(cols):
            border_lab.append(grid_lab[0, c])
            border_lab.append(grid_lab[rows - 1, c])
        for r in range(rows):
            border_lab.append(grid_lab[r, 0])
            border_lab.append(grid_lab[r, cols - 1])
        bg_lab = np.median(border_lab, axis=0)

    delta_e = np.linalg.norm(grid_lab - bg_lab, axis=2)

    # Floodfill based on CIELAB Delta E
    is_bg_candidate = (delta_e < float(bg_tolerance)).astype(np.uint8)

    flood_mask = np.zeros((rows + 2, cols + 2), dtype=np.uint8)
    temp = is_bg_candidate.copy() * 255

    if sample_corners_bg:
        # Seed floodfill specifically from the 4 corners so edge-touching character beads remain untouched
        corners = [(0, 0), (cols - 1, 0), (0, rows - 1), (cols - 1, rows - 1)]
        for c, r in corners:
            if is_bg_candidate[r, c] and temp[r, c] == 255:
                cv2.floodFill(temp, flood_mask, (c, r), 100)
    else:
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
        cropped_rgb = grid_rgb[by:by + bh, bx:bx + bw]
        cropped_mask = character_mask[by:by + bh, bx:bx + bw]
        return cropped_rgb, cropped_mask

    return grid_rgb, character_mask
