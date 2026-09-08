"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  Sparkles,
  Palette,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Wand2,
  AlertCircle,
  LayoutGrid,
  Settings2,
  Sliders,
  Maximize2,
  Minimize2,
  AlertTriangle,
} from "lucide-react";
import { PhysicalParams, BrandInfo } from "@/types";
import { HardwareSection } from "./HardwareSection";
import { ImageSection } from "./ImageSection";
import { PaletteSection } from "./PaletteSection";
import { AdvancedProcessingSection } from "./AdvancedProcessingSection";

interface SidebarProps {
  params: PhysicalParams;
  onParamsChange: (newParams: PhysicalParams) => void;
  selectedBrand: string;
  onBrandChange: (brand: string) => void;
  brands: BrandInfo[];
  palette: string[];
  onPaletteChange: (newPalette: string[]) => void;
  onProcess: (file: File) => void;
  isLoading: boolean;
  selectedFile: File | null;
  onFileSelect: (file: File) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  params,
  onParamsChange,
  selectedBrand,
  onBrandChange,
  brands,
  palette,
  onPaletteChange,
  onProcess,
  isLoading,
  selectedFile,
  onFileSelect,
}) => {
  const [lockAspect, setLockAspect] = useState<boolean>(true);
  const [aspectRatio, setAspectRatio] = useState<number>(1.0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);

  // Independent toggle state for every accordion section
  const [openSections, setOpenSections] = useState({
    hardware: true,
    image: true,
    advanced: false,
    palette: true,
  });

  // Calculate grid resolution & pegboard requirements
  const cols = Math.max(1, Math.round(params.widthCm / params.beadSizeCm));
  const rows = Math.max(1, Math.round(params.heightCm / params.beadSizeCm));
  const pegboardCols = Math.max(1, Math.ceil(params.widthCm / params.pegboardSizeCm));
  const pegboardRows = Math.max(1, Math.ceil(params.heightCm / params.pegboardSizeCm));
  const totalPegboards = pegboardCols * pegboardRows;

  // Proportional distortion guard
  const currentRatio = params.widthCm / (params.heightCm || 1);
  const isDistorted = !lockAspect && aspectRatio > 0 && Math.abs(currentRatio - aspectRatio) / aspectRatio > 0.08;

  // Check if any advanced option is active to auto-expand or badge
  const hasActiveAdvanced =
    params.gridMode === "force" ||
    params.gridMode === "off" ||
    params.flatColors ||
    params.decodeCellCodes ||
    params.sampleCornersBg ||
    params.detectRedDividers ||
    params.customBgHex ||
    (params.bgTolerance && params.bgTolerance !== 18);

  useEffect(() => {
    if (selectedFile) {
      const img = new Image();
      const url = URL.createObjectURL(selectedFile);
      img.onload = () => {
        if (img.width > 0 && img.height > 0) {
          const ratio = img.width / img.height;
          setAspectRatio(ratio);
          if (lockAspect) {
            const newWidth = parseFloat((params.heightCm * ratio).toFixed(1));
            onParamsChange({
              ...params,
              widthCm: newWidth,
            });
          }
        }
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }
  }, [selectedFile]);

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAllSections = () => {
    setOpenSections({
      hardware: true,
      image: true,
      advanced: true,
      palette: true,
    });
  };

  const collapseAllSections = () => {
    setOpenSections({
      hardware: false,
      image: false,
      advanced: false,
      palette: false,
    });
  };

  const handleProcessClick = () => {
    if (selectedFile) {
      onProcess(selectedFile);
    }
  };

  return (
    <aside
      className={`bg-[#0B0F17] border-r border-slate-800/80 flex flex-col h-full select-none z-20 shrink-0 transition-all duration-300 ease-in-out relative ${
        isSidebarCollapsed ? "w-14" : "w-[340px] xl:w-[380px]"
      }`}
    >
      {isSidebarCollapsed ? (
        /* MINI DOCK RAIL WHEN COLLAPSED */
        <div className="flex flex-col items-center py-4 h-full w-full">
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(false)}
            className="w-10 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center border border-slate-800 transition-colors cursor-pointer mb-6"
            title="Expandir barra lateral"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="space-y-4 flex flex-col items-center w-full px-2">
            <button
              type="button"
              onClick={() => {
                setIsSidebarCollapsed(false);
                setOpenSections((prev) => ({ ...prev, hardware: true }));
              }}
              className="w-10 h-10 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 flex items-center justify-center border border-slate-800/80 transition-colors cursor-pointer"
              title="1. Hardware & Placa"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setIsSidebarCollapsed(false);
                setOpenSections((prev) => ({ ...prev, image: true }));
              }}
              className="w-10 h-10 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 flex items-center justify-center border border-slate-800/80 transition-colors cursor-pointer"
              title="2. Imagem & Modo de Fundo"
            >
              <Sparkles className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                setIsSidebarCollapsed(false);
                setOpenSections((prev) => ({ ...prev, advanced: true }));
              }}
              className="w-10 h-10 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-pink-400 flex items-center justify-center border border-slate-800/80 transition-colors cursor-pointer relative"
              title="3. Filtros Avançados & Correção"
            >
              <Settings2 className="w-4 h-4" />
              {hasActiveAdvanced && (
                <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-pink-400" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsSidebarCollapsed(false);
                setOpenSections((prev) => ({ ...prev, palette: true }));
              }}
              className="w-10 h-10 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 flex items-center justify-center border border-slate-800/80 transition-colors cursor-pointer"
              title="4. Paleta & Marcas"
            >
              <Palette className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-auto">
            <button
              type="button"
              onClick={handleProcessClick}
              disabled={isLoading || !selectedFile}
              className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white flex items-center justify-center shadow-md shadow-indigo-950/60 transition-colors cursor-pointer"
              title="Gerar Padrão"
            >
              <Wand2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* FULL EXPANDED WORKFLOW SIDEBAR */
        <>
          {/* Top Sidebar Controls */}
          <div className="px-4 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Workflow Studio
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950/80 text-indigo-400 border border-indigo-800/40 font-mono">
                Alpha
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={openSections.hardware && openSections.image && openSections.palette ? collapseAllSections : expandAllSections}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title={openSections.hardware && openSections.image && openSections.palette ? "Recolher todas as seções" : "Expandir todas as seções"}
              >
                {openSections.hardware && openSections.image && openSections.palette ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(true)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title="Recolher barra lateral inteira"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Workflow Steps */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
            {/* Step 1: Pegboard & Hardware */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  toggleSection("hardware");
                }}
                className={`w-full px-4 py-3 bg-slate-900/40 hover:bg-slate-900/70 flex items-center justify-between transition-colors cursor-pointer select-none ${
                  openSections.hardware ? "border-b border-slate-800/60" : ""
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-mono font-bold flex items-center justify-center">
                    1
                  </span>
                  <span className="text-xs font-bold text-slate-100 uppercase tracking-wide">
                    Hardware & Placa
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    openSections.hardware ? "rotate-180" : ""
                  }`}
                />
              </button>

              {openSections.hardware && (
                <div className="p-4 animate-in fade-in duration-150">
                  <HardwareSection
                    params={params}
                    onParamsChange={onParamsChange}
                    lockAspect={lockAspect}
                    onLockAspectChange={setLockAspect}
                    aspectRatio={aspectRatio}
                  />
                </div>
              )}
            </div>

            {/* Step 2: Image & Ingestion */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  toggleSection("image");
                }}
                className={`w-full px-4 py-3 bg-slate-900/40 hover:bg-slate-900/70 flex items-center justify-between transition-colors cursor-pointer select-none ${
                  openSections.image ? "border-b border-slate-800/60" : ""
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-mono font-bold flex items-center justify-center">
                    2
                  </span>
                  <span className="text-xs font-bold text-slate-100 uppercase tracking-wide">
                    Imagem & Modo de Fundo
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    openSections.image ? "rotate-180" : ""
                  }`}
                />
              </button>

              {openSections.image && (
                <div className="p-4 animate-in fade-in duration-150">
                  <ImageSection
                    params={params}
                    onParamsChange={onParamsChange}
                    selectedFile={selectedFile}
                    onFileSelect={onFileSelect}
                  />
                </div>
              )}
            </div>

            {/* Step 3: Advanced Pre & Post Processing Filters */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  toggleSection("advanced");
                }}
                className={`w-full px-4 py-3 bg-slate-900/40 hover:bg-slate-900/70 flex items-center justify-between transition-colors cursor-pointer select-none ${
                  openSections.advanced ? "border-b border-slate-800/60" : ""
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-md bg-pink-500/10 text-pink-400 border border-pink-500/20 text-xs font-mono font-bold flex items-center justify-center">
                    3
                  </span>
                  <span className="text-xs font-bold text-slate-100 uppercase tracking-wide flex items-center gap-1.5">
                    Filtros Avançados & Correção
                    {hasActiveAdvanced && (
                      <span className="px-1.5 py-0.2 text-[9px] bg-pink-500/20 text-pink-300 rounded-full border border-pink-500/30">
                        Ativo
                      </span>
                    )}
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    openSections.advanced ? "rotate-180" : ""
                  }`}
                />
              </button>

              {openSections.advanced && (
                <div className="p-4 animate-in fade-in duration-150">
                  <AdvancedProcessingSection
                    params={params}
                    onParamsChange={onParamsChange}
                  />
                </div>
              )}
            </div>

            {/* Step 4: Color Palette & Brands */}
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  toggleSection("palette");
                }}
                className={`w-full px-4 py-3 bg-slate-900/40 hover:bg-slate-900/70 flex items-center justify-between transition-colors cursor-pointer select-none ${
                  openSections.palette ? "border-b border-slate-800/60" : ""
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-md bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-mono font-bold flex items-center justify-center">
                    4
                  </span>
                  <span className="text-xs font-bold text-slate-100 uppercase tracking-wide">
                    Paleta & Catálogo de Marcas
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    openSections.palette ? "rotate-180" : ""
                  }`}
                />
              </button>

              {openSections.palette && (
                <div className="p-4 animate-in fade-in duration-150">
                  <PaletteSection
                    selectedBrand={selectedBrand}
                    onBrandChange={onBrandChange}
                    brands={brands}
                    palette={palette}
                    onPaletteChange={onPaletteChange}
                    selectedFile={selectedFile}
                  />
                </div>
              )}
            </div>

            {/* Resumo Técnico & Alertas de Segurança */}
            <div className="space-y-2 bg-slate-900/60 p-3.5 rounded-2xl border border-indigo-950/50 shadow-inner">
              <div className="text-[11px] text-slate-300 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    Matriz Total de Beads:
                  </span>
                  <span className="font-mono text-indigo-300 font-semibold">
                    {cols} × {rows} ({cols * rows} contas)
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <LayoutGrid className="w-3.5 h-3.5 text-purple-400" />
                    Placas Necessárias:
                  </span>
                  <span className="font-mono text-purple-300 font-semibold">
                    {pegboardCols} × {pegboardRows} ({totalPegboards} {totalPegboards === 1 ? "placa" : "placas"})
                  </span>
                </div>
              </div>

              {/* Distortion Alert */}
              {isDistorted && (
                <div className="p-2.5 bg-amber-950/40 border border-amber-800/60 rounded-xl flex items-start gap-2 text-amber-300 text-[11px] mt-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                  <span>A proporção manual está diferente da imagem original. Trave a proporção para evitar distorção.</span>
                </div>
              )}
            </div>
          </div>

          {/* Primary Action Button Bar */}
          <div className="p-4 border-t border-slate-800/80 bg-[#0B0F17]/90 shrink-0">
            <button
              type="button"
              onClick={handleProcessClick}
              disabled={isLoading || !selectedFile}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                !selectedFile
                  ? "bg-slate-800 text-slate-400 border border-slate-700/50 cursor-not-allowed"
                  : isLoading
                  ? "bg-indigo-700 text-white cursor-wait opacity-80"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950/50 border border-indigo-400/30"
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Gerando Padrão de Beads...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>{!selectedFile ? "Selecione uma imagem acima" : "Gerar Padrão de Beads"}</span>
                </>
              )}
            </button>
          </div>
        </>
      )}
    </aside>
  );
};
