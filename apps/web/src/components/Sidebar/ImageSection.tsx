"use client";

import React, { useRef, useState } from "react";
import { Upload, Sparkles, Sliders, ChevronDown, ChevronRight, Check, Image as ImageIcon } from "lucide-react";
import { PhysicalParams } from "@/types";

interface ImageSectionProps {
  params: PhysicalParams;
  onParamsChange: (newParams: PhysicalParams) => void;
  selectedFile: File | null;
  onFileSelect: (file: File) => void;
}

export const ImageSection: React.FC<ImageSectionProps> = ({
  params,
  onParamsChange,
  selectedFile,
  onFileSelect,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [dragOver, setDragOver] = useState<boolean>(false);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Dropzone / Image Thumbnail */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            onFileSelect(e.target.files[0]);
          }
        }}
      />

      {selectedFile ? (
        <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700 overflow-hidden">
              <ImageIcon className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-200 truncate">{selectedFile.name}</div>
              <div className="text-[10px] text-slate-400">
                {(selectedFile.size / 1024).toFixed(0)} KB • Ready to process
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors cursor-pointer shrink-0"
          >
            Replace
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
            dragOver
              ? "border-indigo-500 bg-indigo-950/20"
              : "border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/60"
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-slate-800/80 mx-auto flex items-center justify-center mb-2 text-indigo-400 border border-slate-700/60">
            <Upload className="w-4 h-4" />
          </div>
          <div className="text-xs font-semibold text-slate-200">Click or Drag & Drop Image</div>
          <div className="text-[10px] text-slate-500 mt-0.5">PNG, JPG, WebP, Pixel Art or Photo</div>
        </div>
      )}

      {/* Archetype Pipeline Selector */}
      <div className="space-y-1.5 pt-1">
        <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
          <span>Tipo de Imagem / Modo</span>
          <span className="text-[10px] text-indigo-400 font-normal">Otimização dedicada</span>
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => onParamsChange({ ...params, inputMode: "craft_photo", dropSatellites: true, pruneMinority: true })}
            className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
              params.inputMode === "craft_photo"
                ? "bg-indigo-950/80 border-indigo-500 text-indigo-100 ring-1 ring-indigo-500/40"
                : "bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200"
            }`}
          >
            <div className="text-[11px] font-semibold flex items-center gap-1.5">
              <span>📸 Foto Real</span>
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5">Isolar peça e remover furos</div>
          </button>

          <button
            type="button"
            onClick={() => onParamsChange({ ...params, inputMode: "grid_chart", gridMode: "force", pruneMinority: true })}
            className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
              params.inputMode === "grid_chart"
                ? "bg-indigo-950/80 border-indigo-500 text-indigo-100 ring-1 ring-indigo-500/40"
                : "bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200"
            }`}
          >
            <div className="text-[11px] font-semibold flex items-center gap-1.5">
              <span>📐 Gráfico / Grade</span>
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5">Pinterest, Etsy, Caderno</div>
          </button>

          <button
            type="button"
            onClick={() => onParamsChange({ ...params, inputMode: "pixel_art", gridMode: "off", pruneMinority: false })}
            className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
              params.inputMode === "pixel_art"
                ? "bg-indigo-950/80 border-indigo-500 text-indigo-100 ring-1 ring-indigo-500/40"
                : "bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200"
            }`}
          >
            <div className="text-[11px] font-semibold flex items-center gap-1.5">
              <span>👾 Pixel Art 1:1</span>
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5">Sprite digital nítido</div>
          </button>

          <button
            type="button"
            onClick={() => onParamsChange({ ...params, inputMode: "auto" })}
            className={`p-2 rounded-xl border text-left transition-all cursor-pointer ${
              !params.inputMode || params.inputMode === "auto"
                ? "bg-indigo-950/80 border-indigo-500 text-indigo-100 ring-1 ring-indigo-500/40"
                : "bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200"
            }`}
          >
            <div className="text-[11px] font-semibold flex items-center gap-1.5">
              <span>🪄 Automático</span>
            </div>
            <div className="text-[9px] text-slate-400 mt-0.5">Auto-classificação IA</div>
          </button>
        </div>
      </div>

      {/* Background Cutout Mode */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={() => onParamsChange({ ...params, backgroundMode: "cutout" })}
          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
            params.backgroundMode === "cutout"
              ? "bg-indigo-950/70 border-indigo-500 shadow-sm shadow-indigo-950/50 ring-1 ring-indigo-500/50"
              : "bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200"
          }`}
        >
          <div className="flex items-center justify-between mb-0.5">
            <div className={`text-xs font-semibold flex items-center gap-1.5 ${params.backgroundMode === "cutout" ? "text-indigo-200" : "text-slate-300"}`}>
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              AI Cutout
            </div>
            {params.backgroundMode === "cutout" && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
          </div>
          <div className="text-[10px] text-slate-400">Silhueta vazada sem fundo</div>
        </button>

        <button
          type="button"
          onClick={() => onParamsChange({ ...params, backgroundMode: "solid" })}
          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
            params.backgroundMode === "solid"
              ? "bg-indigo-950/70 border-indigo-500 shadow-sm shadow-indigo-950/50 ring-1 ring-indigo-500/50"
              : "bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200"
          }`}
        >
          <div className="flex items-center justify-between mb-0.5">
            <div className={`text-xs font-semibold flex items-center gap-1.5 ${params.backgroundMode === "solid" ? "text-indigo-200" : "text-slate-300"}`}>
              <div className="w-3.5 h-3.5 rounded bg-slate-700 border border-slate-600" />
              Placa Sólida
            </div>
            {params.backgroundMode === "solid" && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
          </div>
          <div className="text-[10px] text-slate-400">Preenche toda a matriz</div>
        </button>
      </div>
    </div>
  );
};
