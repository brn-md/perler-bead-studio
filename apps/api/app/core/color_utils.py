"""
Color Utilities Module (app/core/color_utils.py)
------------------------------------------------
Provides pure mathematical utility functions for color representation
and format conversions between Hexadecimal strings and RGB integer tuples.
"""

from typing import Tuple

def hex_to_rgb(hex_str: str) -> Tuple[int, int, int]:
    """
    Converts a hexadecimal color string (#RRGGBB, RRGGBB, #RGB, or RGB)
    to an integer RGB tuple in the range [0, 255].
    """
    hex_clean = hex_str.strip().lstrip("#")
    if len(hex_clean) == 3:
        hex_clean = "".join([c * 2 for c in hex_clean])
    if len(hex_clean) != 6:
        raise ValueError(f"Invalid hexadecimal color format: {hex_str}")
    return tuple(int(hex_clean[i:i + 2], 16) for i in (0, 2, 4))


def rgb_to_hex(rgb: Tuple[int, int, int]) -> str:
    """
    Converts an RGB integer tuple (0-255) to a standard uppercase
    hexadecimal string representation (#RRGGBB).
    """
    return f"#{int(rgb[0]):02X}{int(rgb[1]):02X}{int(rgb[2]):02X}"
