"""
Quantization Service Module (app/services/quantization.py)
---------------------------------------------------------
Contains mathematical algorithms for color reduction and matching:
1. K-Means Clustering (scikit-learn): Used when no custom palette is provided.
   Groups pixel colors into N dominant clusters in RGB space.
2. CIELAB Delta E Mapping (scikit-image & numpy): Used when a custom hex palette
   is provided. Maps each pixel to the perceptually closest inventory color
   using Euclidean distance in the CIELAB color space.
"""

from typing import List, Tuple, Dict, Any
import numpy as np
from sklearn.cluster import KMeans
from skimage.color import rgb2lab
from app.core.color_utils import hex_to_rgb, rgb_to_hex

def quantize_kmeans(
    image_rgb: np.ndarray,
    n_colors: int = 16
) -> Tuple[np.ndarray, List[Dict[str, Any]], List[List[str]]]:
    """
    Quantizes an RGB image using K-Means clustering to extract dominant colors.

    Args:
        image_rgb: Input RGB image numpy array of shape (H, W, 3).
        n_colors: Number of dominant clusters to extract.

    Returns:
        quantized_image: Output RGB numpy array of shape (H, W, 3).
        color_counts: List of dicts with {"hex": str, "count": int}, sorted by frequency.
        matrix_hex: 2D array of hexadecimal color strings.
    """
    h, w, _ = image_rgb.shape
    pixels = image_rgb.reshape(-1, 3).astype(np.float32)

    unique_pixels = np.unique(pixels, axis=0)
    actual_k = min(n_colors, len(unique_pixels))
    if actual_k <= 0:
        actual_k = 1

    kmeans = KMeans(n_clusters=actual_k, random_state=42, n_init="auto")
    labels = kmeans.fit_predict(pixels)
    centers = np.clip(np.round(kmeans.cluster_centers_), 0, 255).astype(np.uint8)

    quantized_pixels = centers[labels]
    quantized_image = quantized_pixels.reshape(h, w, 3)

    # Compute color frequency counts
    unique_labels, counts = np.unique(labels, return_counts=True)
    color_counts_map: Dict[str, int] = {}
    for label_idx, count in zip(unique_labels, counts):
        hex_code = rgb_to_hex(centers[label_idx])
        color_counts_map[hex_code] = color_counts_map.get(hex_code, 0) + int(count)

    color_counts = [
        {"hex": hex_code, "count": count}
        for hex_code, count in sorted(color_counts_map.items(), key=lambda x: x[1], reverse=True)
    ]

    # Build 2D matrix of hex colors
    matrix_hex: List[List[str]] = []
    for r in range(h):
        row_hex = [rgb_to_hex(quantized_image[r, col]) for col in range(w)]
        matrix_hex.append(row_hex)

    return quantized_image, color_counts, matrix_hex


def quantize_cielab(
    image_rgb: np.ndarray,
    palette_hex: List[str]
) -> Tuple[np.ndarray, List[Dict[str, Any]], List[List[str]]]:
    """
    Maps each pixel to the nearest palette color in CIELAB color space
    using Euclidean distance (Delta E CIE76).

    Args:
        image_rgb: Input RGB image numpy array of shape (H, W, 3).
        palette_hex: List of target hex color codes.

    Returns:
        quantized_image: Output RGB numpy array of shape (H, W, 3).
        color_counts: List of dicts with {"hex": str, "count": int}, sorted by frequency.
        matrix_hex: 2D array of hexadecimal color strings.
    """
    h, w, _ = image_rgb.shape

    # 1. Convert palette to RGB [0, 1] and then to CIELAB space
    palette_rgb_list = [hex_to_rgb(hx) for hx in palette_hex]
    palette_rgb_arr = np.array(palette_rgb_list, dtype=np.float32) / 255.0
    palette_lab = rgb2lab(palette_rgb_arr.reshape(-1, 1, 3)).reshape(-1, 3)

    # 2. Convert input image to CIELAB space
    img_rgb_norm = image_rgb.astype(np.float32) / 255.0
    img_lab = rgb2lab(img_rgb_norm).reshape(-1, 3)  # Shape: (H * W, 3)

    # 3. Calculate Euclidean distance (Delta E) across all pixels and palette entries
    distances = np.linalg.norm(img_lab[:, np.newaxis, :] - palette_lab[np.newaxis, :, :], axis=2)

    # Find the closest palette index for each pixel
    closest_indices = np.argmin(distances, axis=1)

    palette_rgb_uint8 = np.array(palette_rgb_list, dtype=np.uint8)
    mapped_pixels = palette_rgb_uint8[closest_indices]
    quantized_image = mapped_pixels.reshape(h, w, 3)

    # Compute color frequency counts
    unique_indices, counts = np.unique(closest_indices, return_counts=True)
    color_counts_map: Dict[str, int] = {}
    for idx, count in zip(unique_indices, counts):
        hex_code = palette_hex[idx].upper()
        if not hex_code.startswith("#"):
            hex_code = "#" + hex_code
        color_counts_map[hex_code] = color_counts_map.get(hex_code, 0) + int(count)

    color_counts = [
        {"hex": hex_code, "count": count}
        for hex_code, count in sorted(color_counts_map.items(), key=lambda x: x[1], reverse=True)
    ]

    # Build 2D matrix of hex colors
    matrix_hex: List[List[str]] = []
    for r in range(h):
        row_hex = []
        for col in range(w):
            idx = closest_indices[r * w + col]
            hx = palette_hex[idx].upper()
            if not hx.startswith("#"):
                hx = "#" + hx
            row_hex.append(hx)
        matrix_hex.append(row_hex)

    return quantized_image, color_counts, matrix_hex
