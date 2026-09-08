"use client";

import React from "react";
import {
  Settings2,
  Sparkles,
  Wand2,
  FileText,
  Crop,
  LayoutGrid,
  Pipette,
  Check,
  RotateCcw,
} from "lucide-react";
import { PhysicalParams } from "@/types";

interface AdvancedProcessingSectionProps {
  params: PhysicalParams;
  onParamsChange: (newParams: PhysicalParams) => void;
}

export const AdvancedProcessingSection: React.FC<AdvancedProcessingSectionProps> = ({
  params,
  onParamsChange,
}) => {
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
        // User cancelled
      }
    }
  };

  const isCustomized =
    params.gridMode === "force" ||
    params.gridMode === "off" ||
    params.flatColors ||
    params.decodeCellCodes ||
    params.sampleCornersBg ||
    params.detectRedDividers ||
    params.customBgHex ||
    (params.bgTolerance && params.bgTolerance !== 18);

  const resetToDefaults = () => {
    onParamsChange({
      ...params,
      gridMode: "auto",
      bgTolerance: 18,
      flatColors: false,
      customBgHex: undefined,
      decodeCellCodes: false,
      sampleCornersBg: false,
      detectRedDividers: false,
    });
  };

  return (
    <div className="space-y-3.5 text-xs">
      {/* Quick Presets */}
      <div className="space-y-2">
        <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
          <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
          Presets de Correção Rápida
        </span>
        <div className="grid grid-cols-1 gap-1.5">
          {/* Preset 1: Pixel Art / Fundo Colorido */}
          <button
            type="button"
            onClick={() => {
              onParamsChange({
                ...params,
                gridMode: "auto",
                flatColors: true,
                bgTolerance: 18,
                decodeCellCodes: false,
                backgroundMode: "cutout",
              });
            }}
            className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              params.flatColors && !params.decodeCellCodes
                ? "bg-indigo-950/70 border-indigo-500 text-indigo-200 shadow-sm"
                : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold text-xs text-slate-100">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Otimizar Pixel Art & Fundo Colorido</span>
              </span>
              {params.flatColors && !params.decodeCellCodes && (
                <Check className="w-3.5 h-3.5 text-indigo-400" />
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-normal mt-1 leading-tight">
              Alinha a grade pino por pino, isola o fundo pela borda e unifica sombras em branco puro.
            </p>
          </button>

          {/* Preset 2: Gabarito Técnico com Letras */}
          <button
            type="button"
            onClick={() => {
              onParamsChange({
                ...params,
                gridMode: "force",
                decodeCellCodes: true,
                sampleCornersBg: true,
                detectRedDividers: true,
                bgTolerance: 18,
                flatColors: false,
                backgroundMode: "cutout",
              });
            }}
            className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
              params.decodeCellCodes && params.sampleCornersBg && params.detectRedDividers
                ? "bg-indigo-950/70 border-indigo-500 text-indigo-200 shadow-sm"
                : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-semibold text-xs text-slate-100">
                <FileText className="w-3.5 h-3.5 text-purple-400" />
                <span>Ler Gabarito Técnico / Print com Letras</span>
              </span>
              {params.decodeCellCodes && params.sampleCornersBg && params.detectRedDividers && (
                <Check className="w-3.5 h-3.5 text-purple-400" />
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-normal mt-1 leading-tight">
              Para gabaritos com réguas (ex: 29×46), letras nas células e linhas vermelhas divisórias.
            </p>
          </button>
        </div>
      </div>

      {/* Checkbox 1: Letras no Meio das Células */}
      <div className="pt-2 border-t border-slate-800/60">
        <button
          type="button"
          onClick={() => handleInputChange("decodeCellCodes", !params.decodeCellCodes)}
          className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-colors cursor-pointer text-left ${
            params.decodeCellCodes
              ? "bg-indigo-950/40 border-indigo-500/70 text-indigo-200"
              : "bg-slate-900/40 border-slate-800 text-slate-300 hover:bg-slate-900"
          }`}
        >
          <div className="pr-2">
            <span className="block font-semibold text-xs text-slate-200 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-400" />
              Ignorar letras e símbolos nas células
            </span>
            <span className="block text-[10px] text-slate-400 mt-0.5 leading-tight">
              Filtra letras pretas internas e remove réguas de contagem de prints técnicos.
            </span>
          </div>
          <div
            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
              params.decodeCellCodes ? "bg-indigo-600 border-indigo-400 text-white" : "border-slate-700 bg-slate-900"
            }`}
          >
            {params.decodeCellCodes && <Check className="w-3 h-3" />}
          </div>
        </button>
      </div>

      {/* Checkbox 2: Amostragem pelos 4 Cantos */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => handleInputChange("sampleCornersBg", !params.sampleCornersBg)}
          className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-colors cursor-pointer text-left ${
            params.sampleCornersBg
              ? "bg-indigo-950/40 border-indigo-500/70 text-indigo-200"
              : "bg-slate-900/40 border-slate-800 text-slate-300 hover:bg-slate-900"
          }`}
        >
          <div className="pr-2">
            <span className="block font-semibold text-xs text-slate-200 flex items-center gap-1.5">
              <Crop className="w-3.5 h-3.5 text-indigo-400" />
              Amostragem pelos 4 Cantos Extremos
            </span>
            <span className="block text-[10px] text-slate-400 mt-0.5 leading-tight">
              Amostra apenas as pontas extremas da imagem para nunca comer contornos do desenho.
            </span>
          </div>
          <div
            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
              params.sampleCornersBg ? "bg-indigo-600 border-indigo-400 text-white" : "border-slate-700 bg-slate-900"
            }`}
          >
            {params.sampleCornersBg && <Check className="w-3 h-3" />}
          </div>
        </button>
      </div>

      {/* Checkbox 3: Divisórias Vermelhas da Grade */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => handleInputChange("detectRedDividers", !params.detectRedDividers)}
          className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-colors cursor-pointer text-left ${
            params.detectRedDividers
              ? "bg-indigo-950/40 border-indigo-500/70 text-indigo-200"
              : "bg-slate-900/40 border-slate-800 text-slate-300 hover:bg-slate-900"
          }`}
        >
          <div className="pr-2">
            <span className="block font-semibold text-xs text-slate-200 flex items-center gap-1.5">
              <LayoutGrid className="w-3.5 h-3.5 text-rose-400" />
              Alinhar por Divisórias Vermelhas
            </span>
            <span className="block text-[10px] text-slate-400 mt-0.5 leading-tight">
              Amostra o miolo interno das células para nunca tocar nas linhas divisórias vermelhas.
            </span>
          </div>
          <div
            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
              params.detectRedDividers ? "bg-indigo-600 border-indigo-400 text-white" : "border-slate-700 bg-slate-900"
            }`}
          >
            {params.detectRedDividers && <Check className="w-3 h-3" />}
          </div>
        </button>
      </div>

      {/* Detector Universal de Grade */}
      <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium text-slate-300">Detector Universal de Grade</label>
          <span className="text-[10px] text-indigo-300 font-mono">
            {params.gridMode === "force" ? "Forçar Grade" : params.gridMode === "off" ? "Desativado" : "Automático"}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { id: "auto", label: "Auto" },
            { id: "force", label: "Forçar" },
            { id: "off", label: "Desativar" },
          ].map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => handleInputChange("gridMode", mode.id)}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                (!params.gridMode && mode.id === "auto") || params.gridMode === mode.id
                  ? "bg-indigo-600/30 border-indigo-500 text-slate-100 shadow-sm"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-white"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Origem da Cor de Fundo & Conta-gotas */}
      <div className="pt-2 border-t border-slate-800/60 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium text-slate-300">Origem da Cor de Fundo</label>
          <span className="text-[10px] text-slate-400 font-mono">
            {params.customBgHex ? "Personalizada" : "Auto (Bordas)"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => handleInputChange("customBgHex", undefined)}
            className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              !params.customBgHex
                ? "bg-indigo-600/30 border-indigo-500 text-slate-100 font-semibold"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-white"
            }`}
          >
            Auto (Bordas)
          </button>
          <button
            type="button"
            onClick={() => handleInputChange("customBgHex", params.customBgHex || "#FFFFFF")}
            className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
              params.customBgHex
                ? "bg-indigo-600/30 border-indigo-500 text-slate-100 font-semibold"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850 hover:text-white"
            }`}
          >
            Manual / Pipeta
          </button>
        </div>

        {params.customBgHex && (
          <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800 space-y-2">
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
                className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono uppercase focus:outline-none focus:border-indigo-500"
              />
              {typeof window !== "undefined" && "EyeDropper" in window && (
                <button
                  type="button"
                  onClick={handlePickColor}
                  className="flex-1 py-1 px-2 bg-indigo-900/60 hover:bg-indigo-800 border border-indigo-600/70 rounded-lg text-[10px] text-indigo-200 font-medium flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  title="Capturar cor com o conta-gotas na tela"
                >
                  <Pipette className="w-3 h-3" />
                  <span>Conta-gotas</span>
                </button>
              )}
            </div>
            <p className="text-[9.5px] text-slate-400 leading-tight">
              O removedor eliminará essa cor exata por proximidade perceptual (ΔE).
            </p>
          </div>
        )}
      </div>

      {/* Tolerância de Fundo (ΔE) */}
      <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-medium text-slate-300">Tolerância de Fundo (ΔE)</label>
          <span className="text-[10px] text-indigo-300 font-mono font-semibold">
            {params.bgTolerance ?? 18} ΔE
          </span>
        </div>
        <input
          type="range"
          min="5"
          max="50"
          step="1"
          value={params.bgTolerance ?? 18}
          onChange={(e) => handleInputChange("bgTolerance", parseFloat(e.target.value))}
          className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
        />
        <div className="flex justify-between text-[9px] text-slate-500 font-mono">
          <span>5 (Estrito)</span>
          <span>18 (Padrão)</span>
          <span>50 (Amplo)</span>
        </div>
      </div>

      {/* Filtro de Sombras / Unificar em Branco Liso */}
      <div className="pt-2 border-t border-slate-800/60 space-y-1.5">
        <button
          type="button"
          onClick={() => handleInputChange("flatColors", !params.flatColors)}
          className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-colors cursor-pointer text-left ${
            params.flatColors
              ? "bg-indigo-950/40 border-indigo-500/70 text-indigo-200"
              : "bg-slate-900/40 border-slate-800 text-slate-300 hover:bg-slate-900"
          }`}
        >
          <div className="pr-2">
            <span className="block font-semibold text-xs text-slate-200">Unificar sombras em Branco Liso</span>
            <span className="block text-[10px] text-slate-400 mt-0.5 leading-tight">
              Elimina sombreamentos cinzas secundários no corpo para deixar a figura uniforme.
            </span>
          </div>
          <div
            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
              params.flatColors ? "bg-indigo-600 border-indigo-400 text-white" : "border-slate-700 bg-slate-900"
            }`}
          >
            {params.flatColors && <Check className="w-3 h-3" />}
          </div>
        </button>
      </div>

      {/* Botão Restaurar Padrões */}
      {isCustomized && (
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={resetToDefaults}
            className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer underline"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Restaurar padrões de imagem</span>
          </button>
        </div>
      )}
    </div>
  );
};
