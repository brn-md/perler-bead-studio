"use client";

import React, { useRef, useState, useEffect } from "react";
import { Upload, Sliders, Layers, Sparkles, AlertCircle, Lock, Unlock, Tag, CircleDot } from "lucide-react";
import { PaletteManager } from "./PaletteManager";
import { PhysicalParams, BrandInfo } from "@/types";

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
  const [aspectRatio, setAspectRatio] = useState<number>(10 / 11.5);

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
    const w = Math.max(0.5, val);
    if (lockAspect && aspectRatio > 0) {
      const h = parseFloat((w / aspectRatio).toFixed(1));
      onParamsChange({ ...params, widthCm: w, heightCm: h });
    } else {
      onParamsChange({ ...params, widthCm: w });
    }
  };

  const handleHeightChange = (val: number) => {
    const h = Math.max(0.5, val);
    if (lockAspect && aspectRatio > 0) {
      const w = parseFloat((h * aspectRatio).toFixed(1));
      onParamsChange({ ...params, widthCm: w, heightCm: h });
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

  const applyHardwarePreset = (beadCm: number) => {
    onParamsChange({
      ...params,
      beadSizeCm: beadCm,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Please upload an image or bead template first.");
      return;
    }
    setError(null);
    onProcess(selectedFile);
  };

  const cols = Math.max(1, Math.round(params.widthCm / params.beadSizeCm));
  const rows = Math.max(1, Math.round(params.heightCm / params.beadSizeCm));
  const pegboardCols = Math.ceil(params.widthCm / params.pegboardSizeCm);
  const pegboardRows = Math.ceil(params.heightCm / params.pegboardSizeCm);

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

        {/* Bead Brand Selector */}
        <div className="space-y-2 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-purple-400" />
              Bead Brand
            </label>
            <span className="text-[10px] text-slate-400">
              {activeBrandObj ? `${activeBrandObj.count} Colors` : ""}
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
                  <div className="text-[9px] text-slate-500">{b.count} colors</div>
                </button>
              );
            })}
          </div>
          {activeBrandObj && (
            <p className="text-[11px] text-slate-400 italic">
              {activeBrandObj.description}
            </p>
          )}
        </div>

        {/* Physical Dimensions & Proportional Scaling */}
        <div className="space-y-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm font-semibold text-slate-200">
              <Sliders className="w-4 h-4 text-purple-400" />
              <span>Dimensions & Scaling</span>
            </div>

            {/* Aspect Ratio Lock Toggle */}
            <button
              type="button"
              onClick={() => setLockAspect(!lockAspect)}
              className={`px-2 py-1 rounded text-[11px] font-medium border flex items-center gap-1 transition-colors cursor-pointer ${
                lockAspect
                  ? "bg-purple-950/80 border-purple-700 text-purple-200"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
              }`}
              title={lockAspect ? "Aspect Ratio Locked (Proportional)" : "Aspect Ratio Unlocked"}
            >
              {lockAspect ? <Lock className="w-3 h-3 text-purple-400" /> : <Unlock className="w-3 h-3" />}
              <span>{lockAspect ? "Proportional" : "Free"}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Final Width (cm)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                value={params.widthCm}
                onChange={(e) => handleWidthChange(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Final Height (cm)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                value={params.heightCm}
                onChange={(e) => handleHeightChange(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          {/* Bead Size Presets */}
          <div className="pt-1">
            <label className="text-[11px] font-medium text-slate-400 block mb-1.5">
              Bead Hardware Size
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => applyHardwarePreset(0.5)}
                className={`py-1 px-2 rounded text-xs font-mono border text-center transition-all cursor-pointer ${
                  params.beadSizeCm === 0.5
                    ? "bg-purple-950 border-purple-600 text-purple-200 font-semibold"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                Midi (5.0 mm - Standard)
              </button>
              <button
                type="button"
                onClick={() => applyHardwarePreset(0.26)}
                className={`py-1 px-2 rounded text-xs font-mono border text-center transition-all cursor-pointer ${
                  params.beadSizeCm === 0.26
                    ? "bg-purple-950 border-purple-600 text-purple-200 font-semibold"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                Mini (2.6 mm - Detailed)
              </button>
            </div>
          </div>

          <div className="pt-1">
            <label className="text-[11px] font-medium text-slate-400 block mb-1">
              Pegboard Size (cm)
            </label>
            <input
              type="number"
              step="0.5"
              min="1.0"
              value={params.pegboardSizeCm}
              onChange={(e) => handleInputChange("pegboardSizeCm", parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Result Specs Summary */}
          <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Layers className="w-3 h-3 text-slate-500" />
                Bead Grid:
              </span>
              <span className="font-mono text-purple-300 font-semibold">
                {cols} × {rows} ({cols * rows} beads)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Pegboards Needed:</span>
              <span className="font-mono text-rose-400 font-semibold">
                {pegboardCols} × {pegboardRows} ({pegboardCols * pegboardRows} boards)
              </span>
            </div>
          </div>
        </div>

        {/* Palette Manager */}
        <PaletteManager
          selectedBrand={selectedBrand}
          brands={brands}
          palette={palette}
          onChange={onPaletteChange}
          selectedFile={selectedFile}
        />

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