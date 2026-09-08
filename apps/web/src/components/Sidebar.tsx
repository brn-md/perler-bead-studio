"use client";

import React, { useRef, useState, useEffect } from "react";
import {
  Upload,
  Sliders,
  Layers,
  Sparkles,
  AlertCircle,
  Lock,
  Unlock,
  Tag,
  CircleDot,
  LayoutGrid,
  Settings2,
  Check,
  HelpCircle,
  X,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronRight,
  Wand2,
  Pipette,
  FileText,
} from "lucide-react";
import { PaletteManager } from "./PaletteManager";
import { PhysicalParams, BrandInfo } from "@/types";

interface PegboardPreset {
  id: string;
  name: string;
  brandHint: string;
  beadSizeCm: number;
  pegboardSizeCm: number;
  pinsText: string;
  sizeText: string;
}

const PEGBOARD_PRESETS: PegboardPreset[] = [
  {
    id: "mini_50",
    name: "Mini 50×50",
    brandHint: "Pêssego / Artkal Mini",
    beadSizeCm: 0.26,
    pegboardSizeCm: 13.0,
    pinsText: "50×50 pinos (2.6mm)",
    sizeText: "13.0 × 13.0 cm",
  },
  {
    id: "midi_29",
    name: "Midi 29×29",
    brandHint: "Perler / Hama Standard",
    beadSizeCm: 0.5,
    pegboardSizeCm: 14.5,
    pinsText: "29×29 pinos (5.0mm)",
    sizeText: "14.5 × 14.5 cm",
  },
];

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [lockAspect, setLockAspect] = useState<boolean>(true);
  const [aspectRatio, setAspectRatio] = useState<number>(1.0);
  const [showAdvancedHardware, setShowAdvancedHardware] = useState<boolean>(false);
  const [showSizingHelp, setShowSizingHelp] = useState<boolean>(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith("image/")) {
        setError("Please select a valid image file (PNG, JPG, WebP).");
        return;
      }
      setError(null);
      onFileSelect(file);
    }
  };

  const handleWidthChange = (val: number) => {
    const w = Math.min(120, Math.max(0.5, isNaN(val) ? 0.5 : val));
    if (lockAspect && aspectRatio > 0) {
      const h = parseFloat((w / aspectRatio).toFixed(1));
      onParamsChange({ ...params, widthCm: w, heightCm: Math.min(120, Math.max(0.5, h)) });
    } else {
      onParamsChange({ ...params, widthCm: w });
    }
  };

  const handleHeightChange = (val: number) => {
    const h = Math.min(120, Math.max(0.5, isNaN(val) ? 0.5 : val));
    if (lockAspect && aspectRatio > 0) {
      const w = parseFloat((h * aspectRatio).toFixed(1));
      onParamsChange({ ...params, widthCm: Math.min(120, Math.max(0.5, w)), heightCm: h });
    } else {
      onParamsChange({ ...params, heightCm: h });
    }
  };

  const handleInputChange = (field: keyof PhysicalParams, value: any) => {
    onParamsChange({
      ...params,
      [field]: value,
    });
  };

  const handlePickColor = async () => {
    if (typeof window !== "undefined" && "EyeDropper" in window) {
      try {
        // @ts-ignore
        const eyeDropper = new window.EyeDropper();
        const result = await eyeDropper.open();
        if (result?.sRGBHex) {
          handleInputChange("customBgHex", result.sRGBHex.toUpperCase());
        }
      } catch {
        // User cancelled picker
      }
    }
  };

  const isMini50 = Math.abs(params.beadSizeCm - 0.26) < 0.01 && Math.abs(params.pegboardSizeCm - 13.0) < 0.1;
  const isMidi29 = Math.abs(params.beadSizeCm - 0.5) < 0.01 && Math.abs(params.pegboardSizeCm - 14.5) < 0.1;
  const isCustomHardware = !isMini50 && !isMidi29;

  const applyBoardPreset = (preset: PegboardPreset) => {
    onParamsChange({
      ...params,
      beadSizeCm: preset.beadSizeCm,
      pegboardSizeCm: preset.pegboardSizeCm,
    });
  };

  const setBoardCount = (colsCount: number, rowsCount: number) => {
    const boardCm = params.pegboardSizeCm || 13.0;
    const w = parseFloat((colsCount * boardCm).toFixed(1));
    const h = parseFloat((rowsCount * boardCm).toFixed(1));
    onParamsChange({
      ...params,
      widthCm: w,
      heightCm: h,
    });
  };

  const fitToSingleBoard = () => {
    const boardCm = params.pegboardSizeCm || 13.0;
    if (!aspectRatio || aspectRatio <= 0) {
      setBoardCount(1, 1);
      return;
    }
    if (aspectRatio >= 1) {
      // Landscape or square
      const w = boardCm;
      const h = parseFloat((boardCm / aspectRatio).toFixed(1));
      onParamsChange({ ...params, widthCm: w, heightCm: h });
    } else {
      // Portrait
      const h = boardCm;
      const w = parseFloat((boardCm * aspectRatio).toFixed(1));
      onParamsChange({ ...params, widthCm: w, heightCm: h });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Por favor, faça o upload de uma imagem ou modelo primeiro.");
      return;
    }
    setError(null);
    onProcess(selectedFile);
  };

  const cols = Math.max(1, Math.round(params.widthCm / params.beadSizeCm));
  const rows = Math.max(1, Math.round(params.heightCm / params.beadSizeCm));
  const pegboardCols = Math.ceil(params.widthCm / params.pegboardSizeCm);
  const pegboardRows = Math.ceil(params.heightCm / params.pegboardSizeCm);

  // Guards / Intelligent Warnings
  const currentRatio = params.widthCm / (params.heightCm || 1);
  const isDistorted = !lockAspect && aspectRatio > 0 && Math.abs(currentRatio - aspectRatio) / aspectRatio > 0.08;
  const isLowRes = cols < 12 || rows < 12;

  const activeBrandObj = brands.find((b) => b.id === selectedBrand);

  return (
    <aside className="w-96 h-screen bg-slate-900 border-r border-slate-800 flex flex-col z-20 shrink-0 select-none shadow-2xl">
      {/* Perler Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-500 via-purple-500 to-emerald-400 flex items-center justify-center font-bold text-white shadow-md shadow-purple-500/20">
            <CircleDot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
              Perler Studio
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-purple-950 border border-purple-800/60 text-purple-300">
                {activeBrandObj ? activeBrandObj.badge : "Perler"}
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Bead Craft Pattern & Pegboard Generator</p>
          </div>
        </div>
      </div>

      {/* Form Controls Body */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Upload Area */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5 text-purple-400" />
            Photo or Template (Dog, Hello Kitty, Craft...)
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="group relative cursor-pointer border-2 border-dashed border-slate-700 hover:border-purple-500/70 bg-slate-950/60 hover:bg-slate-950 transition-all rounded-xl p-3 flex flex-col items-center justify-center text-center gap-1.5"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-7 h-7 rounded-full bg-slate-800/80 group-hover:bg-purple-950/60 text-slate-300 group-hover:text-purple-300 flex items-center justify-center transition-colors">
              <Upload className="w-3.5 h-3.5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-200 truncate max-w-[220px]">
                {selectedFile ? selectedFile.name : "Select photo or bead template"}
              </p>
              <p className="text-[10px] text-slate-500">Auto cleans background & isolates bead craft</p>
            </div>
          </div>
        </div>

        {/* ETAPA 2: Hardware Físico (Placa & Tamanho do Bead) */}
        <div className="space-y-2.5 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm font-semibold text-slate-200">
              <LayoutGrid className="w-4 h-4 text-purple-400" />
              <span>2. Placa Base (Hardware)</span>
            </div>
            {isCustomHardware && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-800 text-amber-300 font-mono">
                Personalizado
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {PEGBOARD_PRESETS.map((p) => {
              const active = p.id === "mini_50" ? isMini50 : isMidi29;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyBoardPreset(p)}
                  className={`p-2.5 rounded-lg text-left border transition-all cursor-pointer relative flex flex-col justify-between ${
                    active
                      ? "bg-purple-950/70 border-purple-500 shadow-sm shadow-purple-500/20 text-white"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold font-mono tracking-tight text-slate-100 flex items-center gap-1">
                      {p.name}
                    </span>
                    {active && <Check className="w-3.5 h-3.5 text-purple-400" />}
                  </div>
                  <div className="text-[10px] text-slate-400 font-sans leading-tight">
                    {p.brandHint}
                  </div>
                  <div className="text-[9px] font-mono text-purple-300/80 mt-1.5">
                    {p.pinsText}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Nota dimensional técnica neutra */}
          {isMini50 && (
            <p className="text-[10px] text-slate-400 leading-relaxed bg-slate-950/60 p-2 rounded border border-slate-800/60">
              <span className="text-slate-300 font-medium">Área útil:</span> 13,0 × 13,0 cm (50×50 pinos). Bordas externas e travas somam ~14 cm na régua.
            </p>
          )}
          {isMidi29 && (
            <p className="text-[10px] text-slate-400 leading-relaxed bg-slate-950/60 p-2 rounded border border-slate-800/60">
              <span className="text-slate-300 font-medium">Área útil:</span> 14,5 × 14,5 cm (29×29 pinos). Borda plástica externa soma ~15 cm na régua.
            </p>
          )}

          {/* Configurações Avançadas de Hardware (Colapsável) */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowAdvancedHardware(!showAdvancedHardware)}
              className="flex items-center justify-between w-full text-[11px] text-slate-400 hover:text-slate-200 transition-colors py-0.5 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5 text-slate-500" />
                Ajustar Diâmetro ou Placa Livre
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {showAdvancedHardware ? "▲ Fechar" : "▼ Personalizar"}
              </span>
            </button>

            {showAdvancedHardware && (
              <div className="mt-2 p-2.5 bg-slate-950/70 rounded-lg border border-slate-800/80 space-y-2">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-medium text-slate-400">
                      Tamanho do Bead (cm)
                    </label>
                    <span className="text-[9px] font-mono text-slate-500">
                      {(params.beadSizeCm * 10).toFixed(1)} mm
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    max="1.5"
                    value={params.beadSizeCm}
                    onChange={(e) => handleInputChange("beadSizeCm", Math.max(0.1, parseFloat(e.target.value) || 0.26))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono focus:outline-none focus:border-purple-500"
                  />
                  <span className="text-[9px] text-slate-500">
                    Mini: 0.26 cm (2.6mm) | Midi: 0.50 cm (5.0mm)
                  </span>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] font-medium text-slate-400">
                      Tamanho da Placa (cm)
                    </label>
                    <span className="text-[9px] font-mono text-slate-500">
                      {Math.round(params.pegboardSizeCm / params.beadSizeCm)} pinos
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    min="1.0"
                    max="100.0"
                    value={params.pegboardSizeCm}
                    onChange={(e) => handleInputChange("pegboardSizeCm", Math.max(1.0, parseFloat(e.target.value) || 13.0))}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ETAPA 3: Tamanho do Projeto & Enquadramento */}
        <div className="space-y-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm font-semibold text-slate-200">
              <Sliders className="w-4 h-4 text-purple-400" />
              <span>3. Tamanho do Projeto</span>
            </div>

            {/* Botão de Ajuda dos Tamanhos */}
            <button
              type="button"
              onClick={() => setShowSizingHelp(!showSizingHelp)}
              className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
              title="Explicação sobre cada modo de enquadramento"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Como escolher?</span>
            </button>
          </div>

          {/* Modal / Card Explicativo de Enquadramento */}
          {showSizingHelp && (
            <div className="p-3 bg-slate-950 rounded-lg border border-purple-800/80 space-y-2 text-[11px] text-slate-300 relative">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-semibold text-slate-100">
                <span>Guia de Tamanhos e Placas</span>
                <button
                  type="button"
                  onClick={() => setShowSizingHelp(false)}
                  className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <ul className="space-y-1.5 leading-relaxed text-slate-300">
                <li>
                  <strong className="text-purple-300">Enquadrar 1 Placa:</strong> Faz a figura caber dentro de 1 placa mantendo a proporção original sem esticar (ideal para bonecos e sprites).
                </li>
                <li>
                  <strong className="text-purple-300">1 Placa Cheia:</strong> Preenche o quadrado inteiro ({Math.round(params.pegboardSizeCm / params.beadSizeCm)}×{Math.round(params.pegboardSizeCm / params.beadSizeCm)} pinos). Ideal para porta-copos ou quadros.
                </li>
                <li>
                  <strong className="text-purple-300">2 Placas (2×1):</strong> Encaixa duas placas na horizontal para desenhos compridos (espadas, letreiros).
                </li>
                <li>
                  <strong className="text-purple-300">4 Placas (2×2):</strong> Junta 4 placas formando um grande painel quadrado para projetos grandes.
                </li>
                <li>
                  <strong className="text-purple-300">Medidas Livres:</strong> Digite os centímetros que desejar nos campos abaixo.
                </li>
              </ul>
            </div>
          )}

          {/* Atalhos Rápidos por Placas */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400">
                Atalhos Frequentes
              </span>
              <span className="text-[10px] text-purple-400 font-mono">
                1 placa = {params.pegboardSizeCm}cm
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={fitToSingleBoard}
                className="py-1.5 px-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-purple-600 text-left transition-colors cursor-pointer group"
              >
                <div className="text-xs font-semibold text-slate-200 group-hover:text-purple-300">
                  Enquadrar 1 Placa
                </div>
                <div className="text-[9px] text-slate-400">
                  Máximo sem distorcer
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBoardCount(1, 1)}
                className="py-1.5 px-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-purple-600 text-left transition-colors cursor-pointer group"
              >
                <div className="text-xs font-semibold text-slate-200 group-hover:text-purple-300">
                  1 Placa Cheia
                </div>
                <div className="text-[9px] text-slate-400">
                  {Math.round(params.pegboardSizeCm / params.beadSizeCm)}×{Math.round(params.pegboardSizeCm / params.beadSizeCm)} pinos
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBoardCount(2, 1)}
                className="py-1.5 px-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-purple-600 text-left transition-colors cursor-pointer group"
              >
                <div className="text-xs font-semibold text-slate-200 group-hover:text-purple-300">
                  2 Placas (2×1)
                </div>
                <div className="text-[9px] text-slate-400">
                  Horizontal ({(params.pegboardSizeCm * 2).toFixed(1)}×{params.pegboardSizeCm}cm)
                </div>
              </button>

              <button
                type="button"
                onClick={() => setBoardCount(2, 2)}
                className="py-1.5 px-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-purple-600 text-left transition-colors cursor-pointer group"
              >
                <div className="text-xs font-semibold text-slate-200 group-hover:text-purple-300">
                  4 Placas (2×2)
                </div>
                <div className="text-[9px] text-slate-400">
                  Painel Grande ({(params.pegboardSizeCm * 2).toFixed(1)}cm²)
                </div>
              </button>
            </div>
          </div>

          {/* Dimensões Manuais Livres com Bloqueio de Proporção */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400">
                Dimensões Personalizadas
              </span>

              {/* Aspect Ratio Lock Toggle */}
              <button
                type="button"
                onClick={() => setLockAspect(!lockAspect)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 transition-colors cursor-pointer ${
                  lockAspect
                    ? "bg-purple-950/80 border-purple-700 text-purple-200"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                }`}
                title={lockAspect ? "Proporção Travada: alterar um lado ajusta o outro automaticamente" : "Proporção Livre: permite esticar ou achatar a imagem livremente"}
              >
                {lockAspect ? <Lock className="w-3 h-3 text-purple-400" /> : <Unlock className="w-3 h-3" />}
                <span>{lockAspect ? "Proporcional" : "Livre"}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] font-medium text-slate-400 block mb-1">
                  Largura (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="120"
                  value={params.widthCm}
                  onChange={(e) => handleWidthChange(parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-400 block mb-1">
                  Altura (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  max="120"
                  value={params.heightCm}
                  onChange={(e) => handleHeightChange(parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Avisos Inteligentes de Segurança (Guards) */}
            {isDistorted && (
              <div className="p-2 bg-amber-950/40 border border-amber-800/60 rounded text-[10px] text-amber-300 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                <span>
                  <strong>Atenção:</strong> Proporção livre ativa. A imagem original será esticada ou achatada nessas medidas.
                </span>
              </div>
            )}

            {isLowRes && (
              <div className="p-2 bg-blue-950/40 border border-blue-800/60 rounded text-[10px] text-blue-300 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-blue-400" />
                <span>
                  Resolução muito compacta ({cols}×{rows} pinos). Rostos e detalhes finos podem perder nitidez.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ETAPA 4: Cores & Catálogo de Marcas */}
        <div className="space-y-2 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-purple-400" />
              4. Marca das Contas (Catálogo)
            </label>
            <span className="text-[10px] text-slate-400 font-mono">
              {activeBrandObj ? `${activeBrandObj.count} Cores` : ""}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {brands.map((b) => {
              const isSelected = b.id === selectedBrand;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onBrandChange(b.id)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                    isSelected
                      ? "bg-purple-950 border-purple-500 text-purple-200 font-semibold shadow-sm"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
                  }`}
                >
                  <div className="truncate">{b.badge}</div>
                  <div className="text-[9px] text-slate-500">{b.count} cores</div>
                </button>
              );
            })}
          </div>
          {activeBrandObj && (
            <p className="text-[11px] text-slate-400 italic">
              {activeBrandObj.description}
            </p>
          )}

          {/* Gerenciador de Paleta Específica da Marca */}
          <div className="pt-2 border-t border-slate-800/80">
            <PaletteManager
              selectedBrand={selectedBrand}
              brands={brands}
              palette={palette}
              onChange={onPaletteChange}
              selectedFile={selectedFile}
            />
          </div>
        </div>

        {/* ETAPA 5: Modo de Montagem (Silhueta vs Placa Sólida) */}
        <div className="space-y-2 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-200">
              5. Modo de Fundo
            </label>
            <span className="text-[10px] text-slate-400 font-mono">
              {params.backgroundMode === "cutout" ? "Silhueta Vazada" : "Placa Inteira"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleInputChange("backgroundMode", "cutout")}
              className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                params.backgroundMode === "cutout"
                  ? "bg-purple-950 border-purple-600 text-purple-200 font-semibold shadow-sm"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
              }`}
              title="Gera apenas o personagem/figura com o fundo transparente vazado (chaveiros, figuras soltas)"
            >
              <span>✂ Silhueta</span>
            </button>
            <button
              type="button"
              onClick={() => handleInputChange("backgroundMode", "solid")}
              className={`py-1.5 px-2 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                params.backgroundMode === "solid"
                  ? "bg-purple-950 border-purple-600 text-purple-200 font-semibold shadow-sm"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
              }`}
              title="Preenche todo o retângulo da placa com beads de fundo (porta-copos, quadros)"
            >
              <span>▦ Placa Sólida</span>
            </button>
          </div>
        </div>

        {/* MODO AVANÇADO / CORREÇÃO DE IMAGEM */}
        <div className="space-y-2 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer text-left w-full"
            >
              <Settings2 className="w-3.5 h-3.5 text-pink-400 shrink-0" />
              <div className="flex-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  Filtros Avançados & Correção
                  {(params.gridMode === "force" || params.flatColors || (params.bgTolerance && params.bgTolerance !== 30)) && (
                    <span className="px-1.5 py-0.2 text-[9px] bg-pink-500/20 text-pink-300 rounded-full border border-pink-500/30">
                      Ativo
                    </span>
                  )}
                </span>
                {showAdvancedFilters ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
            </button>
          </div>

          {showAdvancedFilters && (
            <div className="pt-2 border-t border-slate-800/80 space-y-3 animate-in fade-in duration-200">
              {/* Presets de Correção Inteligente */}
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-pink-400" />
                  Presets de Correção Rápida
                </span>
                <div className="grid grid-cols-1 gap-1.5">
                  {/* Preset 1: Pixel Art / Fundo Colorido */}
                  <button
                    type="button"
                    onClick={() => {
                      onParamsChange({
                        ...params,
                        gridMode: "force",
                        bgTolerance: 35,
                        flatColors: true,
                        backgroundMode: "cutout",
                      });
                    }}
                    className={`w-full py-2 px-2.5 rounded-lg text-xs font-semibold border text-left transition-all cursor-pointer ${
                      params.gridMode === "force" && params.flatColors
                        ? "bg-pink-950/80 border-pink-500 text-pink-200 shadow-sm"
                        : "bg-slate-950/80 border-slate-800 text-slate-300 hover:border-pink-900 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <span>✨ Otimizar Pixel Art & Fundo Colorido</span>
                      </span>
                      {params.gridMode === "force" && params.flatColors && (
                        <Check className="w-3.5 h-3.5 text-pink-400" />
                      )}
                    </div>
                    <p className="text-[9.5px] text-slate-400 font-normal mt-0.5 leading-tight">
                      Alinha a grade pino por pino, isola o fundo por proximidade cromática da borda e unifica tons secundários em branco liso.
                    </p>
                  </button>

                  {/* Preset 2: Gabarito / Print de Celular */}
                  <button
                    type="button"
                    onClick={() => {
                      onParamsChange({
                        ...params,
                        gridMode: "force",
                        bgTolerance: 30,
                        flatColors: false,
                        backgroundMode: "cutout",
                      });
                    }}
                    className={`w-full py-2 px-2.5 rounded-lg text-xs font-semibold border text-left transition-all cursor-pointer ${
                      params.gridMode === "force" && !params.flatColors
                        ? "bg-purple-950/80 border-purple-500 text-purple-200 shadow-sm"
                        : "bg-slate-950/80 border-slate-800 text-slate-300 hover:border-purple-900 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3 h-3 text-purple-400" />
                        <span>📋 Ler Gabarito Técnico / Print</span>
                      </span>
                      {params.gridMode === "force" && !params.flatColors && (
                        <Check className="w-3.5 h-3.5 text-purple-400" />
                      )}
                    </div>
                    <p className="text-[9.5px] text-slate-400 font-normal mt-0.5 leading-tight">
                      Para prints com réguas numeradas (ex: 29×46) e letrinhas nas células (C3, R15). Corta réguas e ignora códigos internos.
                    </p>
                  </button>
                </div>
              </div>

              {/* Controle 1: Detector de Grade */}
              <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-slate-300">
                    Detector Universal de Grade
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {params.gridMode === "force" ? "Forçar Grade" : params.gridMode === "off" ? "Desativado" : "Automático"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleInputChange("gridMode", "auto")}
                    className={`py-1 px-2 rounded text-[10px] font-medium border transition-colors cursor-pointer ${
                      (!params.gridMode || params.gridMode === "auto")
                        ? "bg-purple-950 border-purple-600 text-purple-200"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    Auto
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange("gridMode", "force")}
                    className={`py-1 px-2 rounded text-[10px] font-medium border transition-colors cursor-pointer ${
                      params.gridMode === "force"
                        ? "bg-purple-950 border-purple-600 text-purple-200"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    Forçar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange("gridMode", "off")}
                    className={`py-1 px-2 rounded text-[10px] font-medium border transition-colors cursor-pointer ${
                      params.gridMode === "off"
                        ? "bg-purple-950 border-purple-600 text-purple-200"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    Desativar
                  </button>
                </div>
                <p className="text-[9.5px] text-slate-400 leading-tight">
                  Identifica a frequência dos pixels desenhados (5px a 45px) para que cada quadrado vire exatamente 1 bead.
                </p>
              </div>

              {/* Controle 2: Cor e Remoção de Fundo */}
              <div className="space-y-2 pt-1 border-t border-slate-800/60">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-slate-300">
                    Origem da Cor de Fundo
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {params.customBgHex ? "Cor Manual" : "Amostragem da Borda"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleInputChange("customBgHex", undefined)}
                    className={`py-1 px-2 rounded text-[10px] font-medium border transition-colors cursor-pointer ${
                      !params.customBgHex
                        ? "bg-purple-950 border-purple-600 text-purple-200"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    Auto (Bordas)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInputChange("customBgHex", params.customBgHex || "#FFFFFF")}
                    className={`py-1 px-2 rounded text-[10px] font-medium border transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                      params.customBgHex
                        ? "bg-purple-950 border-purple-600 text-purple-200"
                        : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    <Pipette className="w-2.5 h-2.5" />
                    <span>Personalizada</span>
                  </button>
                </div>

                {/* Seletor de Cor Customizada & Conta-gotas */}
                {params.customBgHex && (
                  <div className="p-2 bg-slate-950/90 border border-slate-700/80 rounded-lg space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={params.customBgHex}
                        onChange={(e) => handleInputChange("customBgHex", e.target.value.toUpperCase())}
                        className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={params.customBgHex}
                        onChange={(e) => handleInputChange("customBgHex", e.target.value.toUpperCase())}
                        placeholder="#FFFFFF"
                        className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono uppercase focus:outline-none focus:border-purple-500"
                      />
                      {typeof window !== "undefined" && "EyeDropper" in window && (
                        <button
                          type="button"
                          onClick={handlePickColor}
                          className="flex-1 py-1 px-2 bg-purple-900/60 hover:bg-purple-800 border border-purple-600/70 rounded text-[10px] text-purple-200 font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          title="Clique para capturar qualquer cor da imagem na tela com o conta-gotas"
                        >
                          <Pipette className="w-3 h-3" />
                          <span>Conta-gotas</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[9px] text-slate-400 leading-tight">
                      O app usará essa cor exata para eliminar o fundo por proximidade perceptual (ΔE).
                    </p>
                  </div>
                )}

                {/* Tolerância de Fundo (ΔE) */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-medium text-slate-400">
                      Tolerância de Fundo (ΔE):
                    </label>
                    <span className="text-[10px] text-purple-300 font-mono font-semibold">
                      {params.bgTolerance ?? 30}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    step="5"
                    value={params.bgTolerance ?? 30}
                    onChange={(e) => handleInputChange("bgTolerance", parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-[8.5px] text-slate-500 font-mono">
                    <span>10 (Estrito)</span>
                    <span>30 (Padrão)</span>
                    <span>60 (Amplo)</span>
                  </div>
                </div>
              </div>

              {/* Controle 3: Simplificação de Sombras / Tons Secundários */}
              <div className="space-y-1.5 pt-1 border-t border-slate-800/60">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-slate-300">
                    Filtro de Sombras / Corpo Branco
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => handleInputChange("flatColors", !params.flatColors)}
                  className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-medium border flex items-center justify-between transition-colors cursor-pointer ${
                    params.flatColors
                      ? "bg-purple-950/80 border-purple-600 text-purple-200"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <span>Unificar cinzas claros em Branco Liso</span>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                    params.flatColors ? "bg-purple-600 border-purple-400 text-white" : "border-slate-700 bg-slate-900"
                  }`}>
                    {params.flatColors && <Check className="w-3 h-3" />}
                  </div>
                </button>
                <p className="text-[9.5px] text-slate-400 leading-tight">
                  Elimina sombreamento cinza secundário no corpo (ex: músculos/sombra de pixel art) para deixar a peça 100% branca e uniforme.
                </p>
              </div>

              {/* Botão Reset */}
              {(params.gridMode !== "auto" || params.flatColors || params.bgTolerance !== 30 || params.customBgHex) && (
                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      onParamsChange({
                        ...params,
                        gridMode: "auto",
                        bgTolerance: 30,
                        flatColors: false,
                        customBgHex: undefined,
                      });
                    }}
                    className="text-[10px] text-slate-400 hover:text-slate-200 underline cursor-pointer"
                  >
                    Restaurar padrões de imagem
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ETAPA 6: Resumo Técnico & Botão de Geração */}
        <div className="space-y-3 bg-slate-900/80 p-3.5 rounded-xl border border-purple-900/40 shadow-inner">
          <div className="text-[11px] text-slate-300 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-slate-400">
                <Layers className="w-3.5 h-3.5 text-slate-500" />
                Total de Beads (Grade):
              </span>
              <span className="font-mono text-purple-300 font-semibold">
                {cols} × {rows} ({cols * rows} contas)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Placas Necessárias:</span>
              <span className="font-mono text-rose-400 font-semibold">
                {pegboardCols} × {pegboardRows} ({pegboardCols * pegboardRows} {pegboardCols * pegboardRows === 1 ? "placa" : "placas"})
              </span>
            </div>
          </div>
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl flex items-start gap-2 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit Action */}
        <button
          type="submit"
          disabled={isLoading || !selectedFile}
          className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 active:bg-purple-700 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold text-xs tracking-wide uppercase rounded-xl shadow-lg shadow-purple-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span>Generating Pattern...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generate Perler Bead Pattern</span>
            </>
          )}
        </button>
      </form>
    </aside>
  );
};