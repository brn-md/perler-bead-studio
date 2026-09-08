from typing import List, Optional
from pydantic import BaseModel, Field

class DimensionCm(BaseModel):
    width: float = Field(..., description="Target width in centimeters")
    height: float = Field(..., description="Target height in centimeters")

class GridMetadata(BaseModel):
    columns: int = Field(..., description="Number of bead columns")
    rows: int = Field(..., description="Number of bead rows")
    total_beads: int = Field(..., description="Total bead count (columns * rows)")
    bead_size_cm: float = Field(..., description="Physical bead unit diameter in cm")
    dimensions_cm: DimensionCm

class ColorCount(BaseModel):
    hex: str = Field(..., description="Hexadecimal color code (e.g. #FFFFFF)")
    count: int = Field(..., description="Total beads required for this color")
    code: Optional[str] = Field(None, description="Manufacturer color code (e.g. P01, S01, H01)")
    name: Optional[str] = Field(None, description="Manufacturer color name")

class ProcessResponse(BaseModel):
    success: bool = Field(..., description="Indicates if processing succeeded")
    algorithm: str = Field(..., description="Algorithm applied")
    brand: Optional[str] = Field("perler", description="Selected bead brand")
    grid: GridMetadata
    color_counts: List[ColorCount] = Field(..., description="List of colors and their bead counts")
    matrix: List[List[str]] = Field(..., description="2D array of Hex colors [row][col]")
    image_base64: str = Field(..., description="Base64 Data URI of the processed PNG")
