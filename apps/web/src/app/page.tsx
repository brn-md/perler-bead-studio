"use client";

import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { CanvasWorkspace } from "@/components/CanvasWorkspace";
import { ErrorModal } from "@/components/ErrorModal";
import { ProcessResponse, PhysicalParams, BrandInfo } from "@/types";
import { logger, ErrorDiagnostic } from "@/utils/logger";

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
  const [errorModal, setErrorModal] = useState<ErrorDiagnostic | null>(null);

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
    logger.info("Upload", `Arquivo selecionado: "${file.name}" (${(file.size / 1024).toFixed(1)} KB, type: ${file.type || "unknown"})`);
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setProcessedData(null);
    setParams(DEFAULT_PARAMS);
    setPalette([]);
  };

  const handleBrandChange = (brandId: string) => {
    logger.info("Brand", `Marca alterada para: ${brandId}`);
    setSelectedBrand(brandId);
    setPalette([]);
  };

  const handleProcess = async (file: File) => {
    setIsLoading(true);
    const t0 = performance.now();
    logger.info("Process", `Iniciando processamento de "${file.name}"...`, {
      widthCm: params.widthCm,
      heightCm: params.heightCm,
      brand: selectedBrand,
      gridMode: params.gridMode,
      bgTolerance: params.bgTolerance,
    });

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
      formData.append("input_mode", params.inputMode || "auto");
      formData.append("drop_satellites", params.dropSatellites !== false ? "true" : "false");
      formData.append("prune_minority", params.pruneMinority !== false ? "true" : "false");
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
        const errorData = await response.json().catch(() => ({ detail: `HTTP ${response.status} ${response.statusText}` }));
        const errorMsg = typeof errorData.detail === "string" ? errorData.detail : (errorData.detail?.message || `Erro do servidor (${response.status})`);
        logger.error("Process", `Falha na requisição /api/process (${response.status})`, errorData);
        setErrorModal({
          title: "Erro no Processamento da Imagem",
          message: errorMsg,
          stage: "process",
          status: response.status,
          details: JSON.stringify(errorData, null, 2),
          timestamp: new Date().toLocaleTimeString(),
        });
        return;
      }

      const data: ProcessResponse = await response.json();
      const elapsed = (performance.now() - t0).toFixed(0);
      logger.success("Process", `Padrão gerado com sucesso em ${elapsed}ms: ${data.grid.columns}x${data.grid.rows} (${data.grid.total_beads} beads)`, data.grid);
      setProcessedData(data);
    } catch (err: any) {
      logger.error("Process", "Falha de rede ou exceção no cliente", err);
      setErrorModal({
        title: "Erro de Conexão ou Processamento",
        message: err.message || "Não foi possível conectar ao servidor backend (FastAPI na porta 8000).",
        stage: "client_network",
        details: err.stack || String(err),
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPdf = async () => {
    if (!processedData) return;
    setIsExportingPdf(true);
    const t0 = performance.now();
    try {
      const currentBrandObj = brands.find((b) => b.id === selectedBrand) || brands[0];
      const payload = {
        matrix: processedData.matrix,
        grid: processedData.grid,
        color_counts: processedData.color_counts,
        brand: currentBrandObj?.id || selectedBrand || "perler",
        pegboard_size_cm: params.pegboardSizeCm || 14.5,
      };

      logger.info("Export PDF", "Solicitando PDF calibrado 1:1...", payload);

      const res = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
        const errorMsg = typeof errorData.detail === "string" ? errorData.detail : "Falha ao gerar o arquivo PDF.";
        logger.error("Export PDF", "Falha na exportação de PDF", errorData);
        setErrorModal({
          title: "Erro ao Exportar PDF",
          message: errorMsg,
          stage: "export_pdf",
          status: res.status,
          details: JSON.stringify(errorData, null, 2),
          timestamp: new Date().toLocaleTimeString(),
        });
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${currentBrandObj?.id || "perler"}-pattern-1to1-scale.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      const elapsed = (performance.now() - t0).toFixed(0);
      logger.success("Export PDF", `PDF 1:1 gerado e baixado em ${elapsed}ms.`);
    } catch (err: any) {
      logger.error("Export PDF", "Exceção ao gerar PDF", err);
      setErrorModal({
        title: "Falha na Exportação do PDF",
        message: err.message || "Erro inesperado ao criar o documento PDF.",
        stage: "client_export_pdf",
        details: err.stack || String(err),
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportPng = () => {
    try {
      const canvas = document.querySelector("canvas");
      if (!canvas || !processedData) return;
      logger.info("Export PNG", "Exportando matriz do canvas como PNG...");
      const link = document.createElement("a");
      link.download = `perler-pattern-${selectedBrand}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      logger.success("Export PNG", "Imagem PNG salva com sucesso.");
    } catch (err: any) {
      logger.error("Export PNG", "Falha ao exportar PNG", err);
      setErrorModal({
        title: "Erro ao Salvar PNG",
        message: err.message || "Não foi possível extrair os pixels do canvas.",
        stage: "export_png",
        details: err.stack || String(err),
        timestamp: new Date().toLocaleTimeString(),
      });
    }
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

      {/* Structured Error Diagnostics Modal */}
      <ErrorModal
        error={errorModal}
        onClose={() => setErrorModal(null)}
      />
    </div>
  );
}