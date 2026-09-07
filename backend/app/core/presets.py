"""
Official Perler Bead Palette Catalog (app/core/presets.py)
---------------------------------------------------------
Complete official Perler Bead catalog with standard codes and names.
Provides realistic color matching for Perler bead crafting.
"""

from typing import List, Dict

PERLER_BEAD_CATALOG: List[Dict[str, str]] = [
    # Neutrals / Essentials
    {"code": "P01", "name": "White", "hex": "#FFFFFF"},
    {"code": "P18", "name": "Black", "hex": "#000000"},
    {"code": "P92", "name": "Grey", "hex": "#808080"},
    {"code": "P93", "name": "Dark Grey", "hex": "#404040"},
    {"code": "P94", "name": "Light Grey", "hex": "#D3D3D3"},
    {"code": "P60", "name": "Toasted Marshmallow", "hex": "#F5F5DC"},
    {"code": "P12", "name": "Brown", "hex": "#6F4E37"},
    {"code": "P21", "name": "Light Brown", "hex": "#A0522D"},
    {"code": "P35", "name": "Tan", "hex": "#D2B48C"},

    # Pinks & Reds (Kawaii essentials)
    {"code": "P05", "name": "Pink", "hex": "#FF99C8"},
    {"code": "P83", "name": "Bubblegum", "hex": "#FF6B97"},
    {"code": "P79", "name": "Magenta", "hex": "#FF1493"},
    {"code": "P04", "name": "Blush / Peach", "hex": "#FFB6C1"},
    {"code": "P09", "name": "Red", "hex": "#E60000"},
    {"code": "P88", "name": "Cherry", "hex": "#8B0000"},
    {"code": "P17", "name": "Plum", "hex": "#8B008B"},
    {"code": "P54", "name": "Raspberry", "hex": "#C71585"},

    # Yellows & Oranges
    {"code": "P03", "name": "Yellow", "hex": "#FFD700"},
    {"code": "P02", "name": "Pastel Yellow", "hex": "#FFF799"},
    {"code": "P57", "name": "Cheddar", "hex": "#FFAE00"},
    {"code": "P59", "name": "Orange", "hex": "#FF7F00"},
    {"code": "P91", "name": "Tangerine", "hex": "#FF4500"},

    # Purples & Blues
    {"code": "P13", "name": "Purple", "hex": "#6A0DAD"},
    {"code": "P07", "name": "Pastel Lavender", "hex": "#E0BBE4"},
    {"code": "P08", "name": "Dark Blue", "hex": "#00008B"},
    {"code": "P06", "name": "Blue", "hex": "#0000CD"},
    {"code": "P10", "name": "Light Blue", "hex": "#00BFFF"},
    {"code": "P62", "name": "Pastel Blue", "hex": "#AEC6CF"},
    {"code": "P96", "name": "Turquoise", "hex": "#40E0D0"},

    # Greens
    {"code": "P11", "name": "Green", "hex": "#008000"},
    {"code": "P16", "name": "Lime Green", "hex": "#32CD32"},
    {"code": "P61", "name": "Kiwi Lime", "hex": "#7FFF00"},
    {"code": "P58", "name": "Pastel Green", "hex": "#77DD77"},
    {"code": "P14", "name": "Dark Green", "hex": "#006400"},
]

# Standard hex list for CIELAB matching
STANDARD_PERLER_PALETTE: List[str] = [item["hex"] for item in PERLER_BEAD_CATALOG]
