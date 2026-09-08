"use client";

import React, { useState, useEffect } from "react";
import { Lock, Unlock, LayoutGrid, Info, Sliders, ChevronDown, ChevronRight, HelpCircle, Check } from "lucide-react";
import { PhysicalParams } from "@/types";

interface PegboardPreset {
  id: string;
  name: string;
  brandHint: string;
  beadSizeCm: number;
  pegboardSizeCm: number;
  pinsText: string;
  sizeText: string;
}

export const PEGBOARD_PRESETS: PegboardPreset[] = [
  {
    id: "midi_29",
    name: "Midi 29×29",
    brandHint: "Perler / Hama Standard (5.0mm)",
    beadSizeCm: 0.5,
    pegboardSizeCm: 14.5,
    pinsText: "29×29 pinos",
    sizeText: "14.5 × 14.5 cm",
  },
  {
    id: "mini_50",
    name: "Mini 50×50",
    brandHint: "Artkal Mini / Pêssego (2.6mm)",
    beadSizeCm: 0.26,
    pegboardSizeCm: 13.0,
    pinsText: "50×50 pinos",
    sizeText: "13.0 × 13.0 cm",
  },
];

interface HardwareSectionProps {
  params: PhysicalParams;
  onParamsChange: (newParams: PhysicalParams) => void;
  lockAspect: boolean;
  onLockAspectChange: (locked: boolean) => void;
  aspectRatio: number;
}

export const HardwareSection: React.FC<HardwareSectionProps> = ({
  params,
  onParamsChange,
  lockAspect,
  onLockAspectChange,
  aspectRatio,
}) => {
  const [showSizingHelp, setShowSizingHelp] = useState<boolean>(false);
  const [activeShortcut, setActiveShortcut] = useState<"fit" | "1x1" | "2x1" | "2x2" | null>("1x1");

  const isMini = params.beadSizeCm === 0.26;
  const currentPresetId = isMini ? "mini_50" : "midi_29";
  const boardCm = params.pegboardSizeCm || (isMini ? 13.0 : 14.5);
  const boardPins = isMini ? 50 : 29;

  // Real-time dimensional checks
  const is1x1 = Math.abs(params.widthCm - boardCm) < 0.15 && Math.abs(params.heightCm - boardCm) < 0.15;
  const is2x1 = Math.abs(params.widthCm - (boardCm * 2)) < 0.15 && Math.abs(params.heightCm - boardCm) < 0.15;
  const is2x2 = Math.abs(params.widthCm - (boardCm * 2)) < 0.15 && Math.abs(params.heightCm - (boardCm * 2)) < 0.15;

  const isFitSingle =
    activeShortcut === "fit" &&
    !is1x1 &&
    (Math.abs(params.widthCm - boardCm) < 0.15 || Math.abs(params.heightCm - boardCm) < 0.15);

  const handleSelectPreset = (preset: PegboardPreset) => {
    setActiveShortcut("1x1");
    onParamsChange({
      ...params,
      beadSizeCm: preset.beadSizeCm,
      pegboardSizeCm: preset.pegboardSizeCm,
      widthCm: preset.pegboardSizeCm,
      heightCm: preset.pegboardSizeCm,
    });
  };

  const handleSetBoardCount = (colsCount: number, rowsCount: number, shortcutKey: "1x1" | "2x1" | "2x2") => {
    setActiveShortcut(shortcutKey);
    const w = parseFloat((colsCount * boardCm).toFixed(1));
    const h = parseFloat((rowsCount * boardCm).toFixed(1));
    onParamsChange({
      ...params,
      widthCm: w,
      heightCm: h,
    });
  };

  const handleFitToSingleBoard = () => {
    setActiveShortcut("fit");
    if (!aspectRatio || aspectRatio <= 0) {
      handleSetBoardCount(1, 1, "1x1");
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

  const handleWidthChange = (val: number) => {
    setActiveShortcut(null);
    const clampedVal = Math.max(2.0, Math.min(100.0, val));
    if (lockAspect && aspectRatio > 0) {
      const newHeight = parseFloat((clampedVal / aspectRatio).toFixed(1));
      onParamsChange({
        ...params,
        widthCm: clampedVal,
        heightCm: newHeight,
      });
    } else {
      onParamsChange({
        ...params,
        widthCm: clampedVal,
      });
    }
  };

  const handleHeightChange = (val: number) => {
    setActiveShortcut(null);
    const clampedVal = Math.max(2.0, Math.min(100.0, val));
    if (lockAspect && aspectRatio > 0) {
      const newWidth = parseFloat((clampedVal * aspectRatio).toFixed(1));
      onParamsChange({
        ...params,
        widthCm: newWidth,
        heightCm: clampedVal,
      });
    } else {
      onParamsChange({
        ...params,
        heightCm: clampedVal,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Visual Pegboard Standard Preset Cards */}
      <div className="grid grid-cols-2 gap-2">
        {PEGBOARD_PRESETS.map((preset) => {
          const isSelected = currentPresetId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden ${
                isSelected
                  ? "bg-indigo-950/70 border-indigo-500 shadow-sm shadow-indigo-950/50 ring-1 ring-indigo-500/50"
                  : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <LayoutGrid className={`w-3.5 h-3.5 ${isSelected ? "text-indigo-400" : "text-slate-400"}`} />
                  <span className={`text-xs font-semibold ${isSelected ? "text-slate-100 font-bold" : "text-slate-300"}`}>
                    {preset.name}
                  </span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
              </div>
              <div className="text-[11px] font-mono text-slate-400">{preset.sizeText}</div>
              <div className="text-[10px] text-slate-500 mt-1 truncate">{preset.brandHint}</div>
            </button>
          );
        })}
      </div>

      {/* Atalhos Rápidos por Placas (1 Placa, 2 Placas, 4 Placas) COM HIGHLIGHT ATIVO */}
      <div className="space-y-1.5 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
            <LayoutGrid className="w-3.5 h-3.5 text-indigo-400" />
            Atalhos por Quantidade de Placas
          </span>
          <span className="text-[10px] text-indigo-300 font-mono">
            1 placa = {boardCm}cm
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* Enquadrar 1 Placa */}
          <button
            type="button"
            onClick={handleFitToSingleBoard}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
              isFitSingle
                ? "bg-indigo-950/70 border-indigo-500 shadow-sm shadow-indigo-950/50 ring-1 ring-indigo-500/50"
                : "bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${isFitSingle ? "text-indigo-300 font-bold" : "text-slate-200"}`}>
                Enquadrar 1 Placa
              </span>
              {isFitSingle && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
            </div>
            <div className="text-[9.5px] text-slate-400 mt-0.5">
              Máximo sem distorcer
            </div>
          </button>

          {/* 1 Placa Cheia (1x1) */}
          <button
            type="button"
            onClick={() => handleSetBoardCount(1, 1, "1x1")}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
              is1x1 && activeShortcut !== "fit"
                ? "bg-indigo-950/70 border-indigo-500 shadow-sm shadow-indigo-950/50 ring-1 ring-indigo-500/50"
                : "bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${is1x1 && activeShortcut !== "fit" ? "text-indigo-300 font-bold" : "text-slate-200"}`}>
                1 Placa Cheia
              </span>
              {is1x1 && activeShortcut !== "fit" && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
            </div>
            <div className="text-[9.5px] text-slate-400 mt-0.5 font-mono">
              {boardPins}×{boardPins} pinos ({boardCm}cm)
            </div>
          </button>

          {/* 2 Placas (2×1) */}
          <button
            type="button"
            onClick={() => handleSetBoardCount(2, 1, "2x1")}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
              is2x1
                ? "bg-indigo-950/70 border-indigo-500 shadow-sm shadow-indigo-950/50 ring-1 ring-indigo-500/50"
                : "bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${is2x1 ? "text-indigo-300 font-bold" : "text-slate-200"}`}>
                2 Placas (2×1)
              </span>
              {is2x1 && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
            </div>
            <div className="text-[9.5px] text-slate-400 mt-0.5 font-mono">
              Horizontal ({(boardCm * 2).toFixed(1)}×{boardCm}cm)
            </div>
          </button>

          {/* 4 Placas (2×2) */}
          <button
            type="button"
            onClick={() => handleSetBoardCount(2, 2, "2x2")}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
              is2x2
                ? "bg-indigo-950/70 border-indigo-500 shadow-sm shadow-indigo-950/50 ring-1 ring-indigo-500/50"
                : "bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${is2x2 ? "text-indigo-300 font-bold" : "text-slate-200"}`}>
                4 Placas (2×2)
              </span>
              {is2x2 && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
            </div>
            <div className="text-[9.5px] text-slate-400 mt-0.5 font-mono">
              Painel Grande ({(boardCm * 2).toFixed(1)}cm²)
            </div>
          </button>
        </div>
      </div>

      {/* Dimensões Manuais Livres em cm */}
      <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300 font-semibold flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            Dimensões Personalizadas (cm)
          </span>
          <button
            type="button"
            onClick={() => onLockAspectChange(!lockAspect)}
            className={`px-2 py-0.5 rounded text-[11px] flex items-center gap-1 transition-colors cursor-pointer ${
              lockAspect
                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                : "bg-slate-800 text-slate-400 border border-slate-700"
            }`}
            title={lockAspect ? "Proporção Travada (Aspect Ratio)" : "Proporção Livre"}
          >
            {lockAspect ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            <span>{lockAspect ? "Travada" : "Livre"}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Largura (cm)</label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="2"
                max="100"
                value={params.widthCm}
                onChange={(e) => handleWidthChange(parseFloat(e.target.value) || 2)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              <span className="absolute right-2 top-1.5 text-[10px] text-slate-500">cm</span>
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 block mb-1">Altura (cm)</label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="2"
                max="100"
                value={params.heightCm}
                onChange={(e) => handleHeightChange(parseFloat(e.target.value) || 2)}
                className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              <span className="absolute right-2 top-1.5 text-[10px] text-slate-500">cm</span>
            </div>
          </div>
        </div>

        {/* Calculated pin resolution */}
        <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">
          <span>Resolução da Matriz:</span>
          <span className="text-indigo-300 font-semibold">
            {Math.round(params.widthCm / params.beadSizeCm)} × {Math.round(params.heightCm / params.beadSizeCm)} pinos
          </span>
        </div>
      </div>

      {/* Guia de Tamanhos e Pinos (Colapsável) */}
      <div className="border border-slate-800/80 rounded-xl bg-slate-900/30 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowSizingHelp(!showSizingHelp)}
          className="w-full px-3 py-2 flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 cursor-pointer transition-colors"
        >
          <span className="flex items-center gap-1.5 font-medium">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            Guia de Tamanhos e Pinos
          </span>
          {showSizingHelp ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {showSizingHelp && (
          <div className="p-3 border-t border-slate-800/60 space-y-2 text-[11px] text-slate-400 leading-relaxed">
            <p>
              • <strong className="text-slate-200">Midi (5.0 mm):</strong> 1 placa padrão Perler/Hama mede 14.5 × 14.5 cm e tem 29 × 29 pinos (841 contas).
            </p>
            <p>
              • <strong className="text-slate-200">Mini (2.6 mm):</strong> 1 placa padrão Artkal Mini mede 13.0 × 13.0 cm e tem 50 × 50 pinos (2.500 contas).
            </p>
            <p>
              • <strong className="text-indigo-300">Escala 1:1:</strong> Ao exportar em PDF, a impressão sai exatamente nestas dimensões milimétricas para ser colocada embaixo da placa acrílica transparente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
