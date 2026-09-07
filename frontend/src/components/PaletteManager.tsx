"use client";

import React, { useState } from "react";
import { Plus, Trash2, Palette, Wand2, RefreshCw, Check, Search } from "lucide-react";
import { BrandInfo, BeadColor } from "@/types";

interface PaletteManagerProps {
  selectedBrand: string;
  brands: BrandInfo[];
  palette: string[];
  onChange: (palette: string[]) => void;
  selectedFile: File | null;
}

export const PaletteManager: React.FC<PaletteManagerProps> = ({
  selectedBrand,
  brands,
  palette,
  onChange,
  selectedFile,
}) => {
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showCatalogGrid, setShowCatalogGrid] = useState<boolean>(false);

  const activeBrandData = brands.find((b) => b.id === selectedBrand) || brands[0];

  // Helper map for looking up bead info by hex
  const colorNameMap = React.useMemo(() => {
    const map: Record<string, BeadColor> = {};
    if (activeBrandData && activeBrandData.colors) {
      activeBrandData.colors.forEach((c) => {
        map[c.hex.toUpperCase()] = c;
      });
    }
    return map;
  }, [activeBrandData]);

  const toggleBead = (beadHex: string) => {
    const formatted = beadHex.toUpperCase();
    if (palette.includes(formatted)) {
      onChange(palette.filter((h) => h !== formatted));
    } else {
      onChange([...palette, formatted]);
    }
  };

  const handleRemoveColor = (indexToRemove: number) => {
    onChange(palette.filter((_, idx) => idx !== indexToRemove));
  };

  const handleClear = () => {
    onChange([]);
  };

  const handleLoadFullBrandPalette = () => {
    if (activeBrandData && activeBrandData.colors) {
      const allHex = activeBrandData.colors.map((c) => c.hex.toUpperCase());
      onChange(allHex);
    }
  };

  // Auto-detect colors directly from the uploaded image mapped to the chosen brand
  const handleAutoDetect = async () => {
    if (!selectedFile) {
      alert("Upload an image first so we can analyze its colors!");
      return;
    }
    setIsExtracting(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("brand", selectedBrand);
      formData.append("max_colors", "10");

      const res = await fetch("http://localhost:8000/api/extract-palette", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.palette && data.palette.length > 0) {
          onChange(data.palette);
        }
      }
    } catch (e) {
      console.error("Auto detect failed:", e);
    } finally {
      setIsExtracting(false);
    }
  };

  const filteredCatalogColors = (activeBrandData?.colors || []).filter(
    (c) =>
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm font-semibold text-slate-200">
          <Palette className="w-4 h-4 text-purple-400" />
          <span>
            {activeBrandData ? activeBrandData.badge : "Bead"} Palette
            <span className="ml-1.5 text-xs text-purple-300 font-mono font-normal">
              ({palette.length} colors)
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Auto Detect Button */}
          <button
            type="button"
            onClick={handleAutoDetect}
            disabled={isExtracting || !selectedFile}
            className="text-[11px] bg-purple-950/80 hover:bg-purple-900 border border-purple-700/80 text-purple-200 px-2 py-1 rounded transition-colors flex items-center gap-1 font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            title={`Analyze image and match to official ${activeBrandData?.name || "beads"}`}
          >
            <Wand2 className="w-3 h-3 text-purple-400" />
            {isExtracting ? "Detecting..." : "Auto-Detect"}
          </button>
          {palette.length > 0 && (
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] text-rose-400 hover:text-rose-300 transition-colors p-1 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span>
          {palette.length === 0
            ? "Using all brand beads"
            : `Using ${palette.length} selected beads`}
        </span>
        <button
          type="button"
          onClick={handleLoadFullBrandPalette}
          className="text-purple-300 hover:text-purple-200 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw className="w-2.5 h-2.5" />
          Select All ({activeBrandData?.count || 0})
        </button>
      </div>

      {/* Button to toggle Brand Catalog Color Picker */}
      <button
        type="button"
        onClick={() => setShowCatalogGrid(!showCatalogGrid)}
        className="w-full py-1.5 px-2.5 bg-slate-950 hover:bg-purple-950/50 border border-slate-700 hover:border-purple-600 rounded-lg text-xs text-purple-200 flex items-center justify-between transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-1.5">
          <Palette className="w-3.5 h-3.5 text-purple-400" />
          Browse {activeBrandData?.badge} Catalog ({activeBrandData?.count} Beads)
        </span>
        <span className="text-[10px] text-slate-400">
          {showCatalogGrid ? "▲ Hide" : "▼ Pick Beads"}
        </span>
      </button>

      {/* Expandable Visual Bead Catalog Grid */}
      {showCatalogGrid && (
        <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2 max-h-56 flex flex-col">
          <div className="relative">
            <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search bead by code or name (e.g. White, P05)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-2 py-1 bg-slate-900 border border-slate-700 rounded-md text-[11px] text-slate-200 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="overflow-y-auto grid grid-cols-2 gap-1.5 pr-1">
            {filteredCatalogColors.map((bead) => {
              const isSelected = palette.includes(bead.hex.toUpperCase());
              return (
                <button
                  key={bead.code}
                  type="button"
                  onClick={() => toggleBead(bead.hex)}
                  className={`flex items-center gap-2 p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "bg-purple-950 border-purple-500 text-purple-200"
                      : "bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300"
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-black/40 shadow-inner shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: bead.hex }}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                  </span>
                  <div className="truncate text-[10px] leading-tight flex-1">
                    <span className="font-bold text-slate-200 font-mono mr-1">
                      {bead.code}
                    </span>
                    <span className="text-slate-400 truncate">{bead.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Selected Bead Chips */}
      {palette.length > 0 && (
        <div className="max-h-32 overflow-y-auto pr-1 flex flex-wrap gap-1.5 pt-1.5 border-t border-slate-800">
          {palette.map((hex, idx) => {
            const beadInfo = colorNameMap[hex.toUpperCase()];
            const displayName = beadInfo ? `${beadInfo.code} ${beadInfo.name}` : "Custom Bead";
            return (
              <div
                key={`${hex}-${idx}`}
                className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-md pl-1.5 pr-1 py-0.5"
                title={displayName}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-inner shrink-0"
                  style={{ backgroundColor: hex }}
                />
                <span className="text-[10px] font-mono font-medium text-purple-200">
                  {beadInfo ? beadInfo.code : "Bead"}
                </span>
                <span className="text-[9px] text-slate-400 truncate max-w-[70px]">
                  {beadInfo ? beadInfo.name : ""}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveColor(idx)}
                  className="text-slate-500 hover:text-rose-400 p-0.5 transition-colors cursor-pointer ml-0.5"
                  title="Remove bead"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};