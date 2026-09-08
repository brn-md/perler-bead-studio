"use client";

import React, { useState, useEffect } from "react";
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
    widthCm: 13.0,
    heightCm: 13.0,
    beadSizeCm: 0.26,      // 2.6mm Mini beads (50x50 pins)
    pegboardSizeCm: 13.0,  // 50x50 Mini Pegboard (13.0cm)
    cropX: 0.0,
    cropY: 0.0,
    cropW: 1.0,
    cropH: 1.0,
    enhanceEdges: true,
    backgroundMode: "cutout",
    gridMode: "auto",
    bgTolerance: 30,
    flatColors: false,
  });

  const [brands, setBrands] = useState<BrandInfo[]>(DEFAULT_BRANDS);
  const [selectedBrand, setSelectedBrand] = useState<string>("perler");
  const [palette, setPalette] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processedData, setProcessedData] = useState<ProcessResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

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

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setProcessedData(null);
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
      formData.append("bg_tolerance", (params.bgTolerance ?? 30).toString());
      formData.append("flat_colors", params.flatColors ? "true" : "false");

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

  return (
    <main className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans">
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
    </main>
  );
}