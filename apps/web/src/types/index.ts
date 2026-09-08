export interface DimensionCm {
  width: number;
  height: number;
}

export interface GridMetadata {
  columns: number;
  rows: number;
  total_beads: number;
  bead_size_cm: number;
  dimensions_cm: DimensionCm;
}

export interface ColorCount {
  hex: string;
  count: number;
  code?: string;
  name?: string;
}

export interface ProcessResponse {
  success: boolean;
  algorithm: string;
  brand?: string;
  grid: GridMetadata;
  color_counts: ColorCount[];
  matrix: string[][];
  image_base64: string;
}

export interface PhysicalParams {
  widthCm: number;
  heightCm: number;
  beadSizeCm: number;
  pegboardSizeCm: number;
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
  enhanceEdges: boolean;
  backgroundMode: "cutout" | "solid";
  gridMode?: "auto" | "force" | "off";
  bgTolerance?: number;
  flatColors?: boolean;
  customBgHex?: string;
  decodeCellCodes?: boolean;
}

export interface BeadColor {
  code: string;
  name: string;
  hex: string;
}

export interface BrandInfo {
  id: string;
  name: string;
  country: string;
  badge: string;
  description: string;
  count: number;
  colors: BeadColor[];
}