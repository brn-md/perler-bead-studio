"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { CanvasWorkspace } from "@/components/CanvasWorkspace";
import { ProcessResponse, PhysicalParams, BrandInfo } from "@/types";

const DEFAULT_BRANDS: BrandInfo[] = [
  { id: "perler", name: "Perler Beads", country: "USA", badge: "Perler", description: "Standard 5mm Midi & 2.6mm Mini beads with vibrant iconic shades.", count: 38, colors: [] },
  { id: "artkal", name: "Artkal Beads", country: "China", badge: "Artkal", description: "Over 200+ nuanced colors with ultra-smooth melting and high fidelity.", count: 38, colors: [] },
  { id: "hama", name: "Hama Beads", country: "Denmark", badge: "Hama", description: "Original European ironing beads with classic color matching.", count: 26, colors: [] },
  { id: "nabbi", name: "Nabbi / PhotoPearls", country: "Sweden", badge: "Nabbi", description: "Engineered specially in Scandinavia for realistic photo portraits.", count: 23, colors: [] },
  { id: "mard", name: "MARD Beads", country: "International", badge: "MARD", description: "High-durability pixel beads popular for gaming art and anime sprites.", count: 18, colors: [] },
];

export default function Home() {
  const [params, setParams] = useState<PhysicalParams>({
    widthCm: 14.5,
    heightCm: 14.5,
    beadSizeCm: 0.5,       // Default: 5.0mm Midi beads (29x29 pins standard)
    pegboardSizeCm: 14.5,  // 29x29 Midi Pegboard (14.5cm)
    cropX: 0.0,
    cropY: 0.0,
    cropW: 1.0,
    cropH: 1.0,
    enhanceEdges: true,
    backgroundMode: "cutout",
    gridMode: "auto",
    bgTolerance: 18,
    flatColors: false,
    decodeCellCodes: false,
    sampleCornersBg: false,
    detectRedDividers: false,
  });

  const [brands, setBrands] = useState<BrandInfo[]>(DEFAULT_BRANDS);
  const [selectedBrand, setSelectedBrand] = useState<string>("perler");
  const [palette, setPalette] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processedData, setProcessedData] = useState<ProcessResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  // Fetch full brand catalogs on mount
  useEffect(() => {
    async function fetchBrands() {
      try {
        const res = await fetch("/api/brands");
        if (res.ok) {
          const data = await res.json();
          if (data.brands && data.brands.length > 0) {
            setBrands(data.brands);
          }
        }
      } catch (err) {
        console.warn("Could not load brands from backend, using defaults:", err);
      }
    }
    fetchBrands();
  }, []);

  const DEFAULT_PARAMS: PhysicalParams = {
    widthCm: 14.5,
    heightCm: 14.5,
    beadSizeCm: 0.5,       // Default: 5.0mm Midi beads (29x29 pins standard)
    pegboardSizeCm: 14.5,  // 29x29 Midi Pegboard (14.5cm)
    cropX: 0.0,
    cropY: 0.0,
    cropW: 1.0,
    cropH: 1.0,
    enhanceEdges: true,
    backgroundMode: "cutout",
    gridMode: "auto",
    bgTolerance: 18,
    flatColors: false,
    decodeCellCodes: false,
    sampleCornersBg: false,
    detectRedDividers: false,
    customBgHex: undefined,
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setProcessedData(null);
    setParams(DEFAULT_PARAMS);
    setPalette([]);
  };

  const handleBrandChange = (brandId: string) => {
    setSelectedBrand(brandId);
    setPalette([]);
  };

  const handleProcess = async (file: File) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("width_cm", params.widthCm.toString());
      formData.append("height_cm", params.heightCm.toString());
      formData.append("bead_size_cm", params.beadSizeCm.toString());
      formData.append("brand", selectedBrand);
      formData.append("crop_x", params.cropX.toString());
      formData.append("crop_y", params.cropY.toString());
      formData.append("crop_w", params.cropW.toString());
      formData.append("crop_h", params.cropH.toString());
      formData.append("enhance_edges", params.enhanceEdges ? "true" : "false");
      formData.append("isolate_subject", "true");
      formData.append("background_mode", params.backgroundMode);
      formData.append("grid_mode", params.gridMode || "auto");
      formData.append("bg_tolerance", (params.bgTolerance ?? 18).toString());
      formData.append("flat_colors", params.flatColors ? "true" : "false");
      formData.append("decode_cell_codes", params.decodeCellCodes ? "true" : "false");
      formData.append("sample_corners_bg", params.sampleCornersBg ? "true" : "false");
      formData.append("detect_red_dividers", params.detectRedDividers ? "true" : "false");
      if (params.customBgHex) {
        formData.append("custom_bg_hex", params.customBgHex);
      }

      if (palette.length > 0) {
        formData.append("palette_hex", JSON.stringify(palette));
      }

      const response = await fetch("/api/process", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Server responded with ${response.status}`);
      }

      const data: ProcessResponse = await response.json();
      setProcessedData(data);
    } catch (err: any) {
      console.error("Processing failed:", err);
      alert(`Error processing pattern: ${err.message || "Network error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (!processedData) return;
    setIsExportingPdf(true);
    try {
      const currentBrandObj = brands.find((b) => b.id === selectedBrand) || brands[0];
      const payload = {
        matrix: processedData.matrix,
        grid: processedData.grid,
        color_counts: processedData.color_counts,
        brand: currentBrandObj?.id || selectedBrand || "perler",
        pegboard_size_cm: params.pegboardSizeCm || 14.5,
      };

      const res = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to generate PDF");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${currentBrandObj?.id || "perler"}-pattern-1to1-scale.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("PDF export failed:", err);
      alert(`Error generating PDF: ${err.message || "Network error"}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportPng = () => {
    const canvas = document.querySelector("canvas");
    if (!canvas || !processedData) return;
    const link = document.createElement("a");
    link.download = `perler-pattern-${selectedBrand}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#080B10] font-sans text-slate-100">
      {/* Global Precision Header */}
      <Header
        params={params}
        data={processedData}
        selectedBrand={selectedBrand}
        brands={brands}
        onExportPdf={handleExportPdf}
        onExportPng={handleExportPng}
        isExportingPdf={isExportingPdf}
      />

      {/* Main Workspace Layout */}
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          params={params}
          onParamsChange={setParams}
          selectedBrand={selectedBrand}
          onBrandChange={handleBrandChange}
          brands={brands}
          palette={palette}
          onPaletteChange={setPalette}
          onProcess={handleProcess}
          isLoading={isLoading}
          selectedFile={selectedFile}
          onFileSelect={handleFileSelect}
        />
        <CanvasWorkspace
          data={processedData}
          onDataChange={setProcessedData}
          params={params}
          previewUrl={previewUrl}
          selectedBrand={selectedBrand}
          brands={brands}
        />
      </div>
    </div>
  );
}