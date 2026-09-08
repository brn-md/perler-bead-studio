"use client";

import React, { useState } from "react";
import { Tag, Palette, Check, SlidersHorizontal, ShoppingBag } from "lucide-react";
import { BrandInfo } from "@/types";
import { PaletteManager } from "../PaletteManager";

interface PaletteSectionProps {
  selectedBrand: string;
  onBrandChange: (brandId: string) => void;
  brands: BrandInfo[];
  palette: string[];
  onPaletteChange: (newPalette: string[]) => void;
  selectedFile: File | null;
}

export const PaletteSection: React.FC<PaletteSectionProps> = ({
  selectedBrand,
  onBrandChange,
  brands,
  palette,
  onPaletteChange,
  selectedFile,
}) => {
  const [showPaletteManager, setShowPaletteManager] = useState<boolean>(false);
  const currentBrand = brands.find((b) => b.id === selectedBrand) || brands[0];

  return (
    <div className="space-y-3.5">
      {/* Brand Selection Grid */}
      <div className="space-y-2">
        <label className="text-[11px] text-slate-400 block font-medium">Manufacturer Brand Catalog</label>
        <div className="grid grid-cols-1 gap-1.5">
          {brands.map((brand) => {
            const isSelected = selectedBrand === brand.id;
            return (
              <button
                key={brand.id}
                type="button"
                onClick={() => onBrandChange(brand.id)}
                className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  isSelected
                    ? "bg-indigo-950/40 border-indigo-500 shadow-sm shadow-indigo-950/40"
                    : "bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-3 h-3 rounded-full border shrink-0 ${
                      isSelected ? "bg-indigo-400 border-indigo-300" : "bg-slate-700 border-slate-600"
                    }`}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${isSelected ? "text-slate-100" : "text-slate-300"}`}>
                        {brand.name}
                      </span>
                      <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                        {brand.country}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">{brand.description}</div>
                  </div>
                </div>

                <div className="text-[10px] font-mono text-slate-400 shrink-0 ml-2">
                  {brand.count > 0 ? `${brand.count} colors` : ""}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stock Customization Button */}
      {currentBrand && currentBrand.colors && currentBrand.colors.length > 0 && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowPaletteManager(true)}
            className="w-full py-2 px-3 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-medium border border-slate-800 hover:border-slate-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
            <span>Customize Stock Colors ({palette.length > 0 ? `${palette.length} active` : "All active"})</span>
          </button>
        </div>
      )}

      {/* Palette Manager Modal / Drawer */}
      {showPaletteManager && (
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
          <PaletteManager
            selectedBrand={selectedBrand}
            brands={brands}
            palette={palette}
            onChange={onPaletteChange}
            selectedFile={selectedFile}
          />
          <button
            type="button"
            onClick={() => setShowPaletteManager(false)}
            className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors cursor-pointer"
          >
            Close Stock Customizer
          </button>
        </div>
      )}
    </div>
  );
};
