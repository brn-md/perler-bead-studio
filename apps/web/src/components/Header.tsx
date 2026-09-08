"use client";

import React from "react";
import { Printer, Download, Sparkles, HelpCircle, Layers, Ruler } from "lucide-react";
import { ProcessResponse, PhysicalParams, BrandInfo } from "@/types";

interface HeaderProps {
  params: PhysicalParams;
  data: ProcessResponse | null;
  selectedBrand: string;
  brands: BrandInfo[];
  onExportPdf: () => void;
  onExportPng: () => void;
  isExportingPdf: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  params,
  data,
  selectedBrand,
  brands,
  onExportPdf,
  onExportPng,
  isExportingPdf,
}) => {
  const currentBrand = brands.find((b) => b.id === selectedBrand) || brands[0];
  const isMini = params.beadSizeCm === 0.26;
  const boardPins = isMini ? 50 : 29;

  // Calculate required pegboard modules
  const boardCols = data ? Math.max(1, Math.ceil(data.grid.columns / boardPins)) : 1;
  const boardRows = data ? Math.max(1, Math.ceil(data.grid.rows / boardPins)) : 1;
  const totalBoards = boardCols * boardRows;

  return (
    <header className="h-14 bg-[#0B0F17] border-b border-slate-800/80 px-4 flex items-center justify-between select-none z-30 shrink-0">
      {/* Brand & Project Identity */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-purple-500 to-pink-500 p-0.5 shadow-md shadow-indigo-950/50 flex items-center justify-center">
          <div className="w-full h-full bg-slate-950/80 rounded-[6px] flex items-center justify-center">
            {/* Bead circle icon */}
            <div className="w-4 h-4 rounded-full border-2 border-indigo-400 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-300" />
            </div>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-slate-100 tracking-tight">Perler Bead Studio</h1>
            <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Pro
            </span>
          </div>
        </div>
      </div>

      {/* Center Metrics HUD (Physical Dimensions, Bead Count, Pegboard Modules) */}
      <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[#111827]/90 border border-slate-800 text-xs font-mono text-slate-300 shadow-inner">
        <div className="flex items-center gap-1.5 text-slate-200 font-semibold">
          <Ruler className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>{params.widthCm.toFixed(1)} × {params.heightCm.toFixed(1)} cm</span>
        </div>

        <span className="text-slate-700">•</span>

        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="font-semibold text-emerald-400">
            {data ? data.grid.total_beads.toLocaleString() : "0"}
          </span>
          <span className="text-slate-400">beads</span>
        </div>

        <span className="text-slate-700">•</span>

        <div className="flex items-center gap-1.5 text-slate-300">
          <Layers className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span>
            {totalBoards} {totalBoards === 1 ? "Pegboard" : "Pegboards"} ({boardCols}×{boardRows})
          </span>
          <span className="text-[10px] font-sans px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
            {isMini ? "Mini 2.6mm" : "Midi 5.0mm"}
          </span>
        </div>
      </div>

      {/* Right Actions: 1:1 Scale PDF & PNG Export */}
      <div className="flex items-center gap-2">
        {data ? (
          <>
            {/* PNG export */}
            <button
              onClick={onExportPng}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-medium border border-slate-700/80 transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Download pattern image as PNG"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>PNG</span>
            </button>

            {/* Glowing 1:1 Scale Printable PDF */}
            <button
              onClick={onExportPdf}
              disabled={isExportingPdf}
              className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-md shadow-indigo-950/60 border border-indigo-400/30 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Generate actual-size 1:1 scale printable PDF for direct under-board placement"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span>{isExportingPdf ? "Generating PDF..." : "Export 1:1 PDF"}</span>
            </button>
          </>
        ) : (
          <div className="text-xs text-slate-500 flex items-center gap-1">
            <span>Import an image to start</span>
          </div>
        )}
      </div>
    </header>
  );
};
