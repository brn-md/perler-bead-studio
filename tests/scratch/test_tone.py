import cv2
import numpy as np

def normalize_craft_tones(rgb: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """
    Normalizes color and contrast inside the craft:
    - Removes yellow/dim camera lighting cast.
    - Stretches bright beads so the face is pure white (#FFFFFF).
    - Deepens dark regions (black eyes become pure black #000000).
    """
    valid_pixels = rgb[mask > 20]
    if len(valid_pixels) == 0:
        return rgb

    # Separate channels
    out = rgb.copy().astype(np.float32)

    # Apply per-channel min-max percentile stretch to cancel warm indoor lighting
    for c in range(3):
        vals = valid_pixels[:, c]
        p_low = np.percentile(vals, 2)
        p_high = np.percentile(vals, 92)
        if p_high > p_low:
            out[:, :, c] = np.clip((out[:, :, c] - p_low) * (255.0 / (p_high - p_low)), 0, 255)

    return out.astype(np.uint8)
