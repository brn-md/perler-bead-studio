"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  X,
  ArrowRight,
  ArrowLeftRight,
  Search,
  Check,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { BrandInfo, ColorCount } from "@/types";

interface ColorSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSourceHex?: string | null;
  colorCounts: ColorCount[];
  brand: BrandInfo;
  onSwap: (sourceHex: string, targetHex: string) => void;
}

export const ColorSwapModal: React.FC<ColorSwapModalProps> = ({
  isOpen,
  onClose,
  initialSourceHex,
  colorCounts,
  brand,
  onSwap,
}) => {
  // Source color state
  const [sourceHex, setSourceHex] = useState<string>("");
  // Target color state
  const [targetHex, setTargetHex] = useState<string>("");
  // Target palette view mode: "catalog" or "used"
  const [targetMode, setTargetMode] = useState<"catalog" | "used">("catalog");
  // Search query for target color
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Initialize source and target when modal opens
  useEffect(() => {
    if (isOpen && colorCounts.length > 0) {
      const initial =
        initialSourceHex &&
        colorCounts.some(
          (c) => c.hex.toUpperCase() === initialSourceHex.toUpperCase()
        )
          ? initialSourceHex
          : colorCounts[0].hex;
      setSourceHex(initial);

      // Default target: choose different color or first catalog color
      if (colorCounts.length > 1) {
        const alt = colorCounts.find(
          (c) => c.hex.toUpperCase() !== initial.toUpperCase()
        );
        setTargetHex(alt ? alt.hex : colorCounts[0].hex);
      } else if (brand.colors && brand.colors.length > 0) {
        const alt = brand.colors.find(
          (c) => c.hex.toUpperCase() !== initial.toUpperCase()
        );
        setTargetHex(alt ? alt.hex : brand.colors[0].hex);
      }
      setSearchQuery("");
    }
  }, [isOpen, initialSourceHex, colorCounts, brand]);

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lookup helpers
  const brandLookup = useMemo(() => {
    const map: Record<string, { code: string; name: string }> = {};
    if (brand && brand.colors) {
      brand.colors.forEach((c) => {
        map[c.hex.toUpperCase()] = { code: c.code, name: c.name };
      });
    }
    return map;
  }, [brand]);

  const sourceItem = useMemo(() => {
    if (!sourceHex) return null;
    const existing = colorCounts.find(
      (c) => c.hex.toUpperCase() === sourceHex.toUpperCase()
    );
    const lookup = brandLookup[sourceHex.toUpperCase()];
    return {
      hex: sourceHex,
      count: existing?.count || 0,
      code: existing?.code || lookup?.code || "",
      name: existing?.name || lookup?.name || "Bead",
    };
  }, [sourceHex, colorCounts, brandLookup]);

  const targetItem = useMemo(() => {
    if (!targetHex) return null;
    const existing = colorCounts.find(
      (c) => c.hex.toUpperCase() === targetHex.toUpperCase()
    );
    const lookup = brandLookup[targetHex.toUpperCase()];
    return {
      hex: targetHex,
      count: existing?.count || 0,
      code: existing?.code || lookup?.code || "",
      name: existing?.name || lookup?.name || "Bead",
    };
  }, [targetHex, colorCounts, brandLookup]);

  // Filtered target colors
  const filteredTargetColors = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    if (targetMode === "used") {
      return colorCounts.filter((c) => {
        if (!query) return true;
        const code = (c.code || "").toLowerCase();
        const name = (c.name || "").toLowerCase();
        return code.includes(query) || name.includes(query);
      });
    } else {
      // Entire brand catalog
      const list = brand.colors || [];
      return list.filter((c) => {
        if (!query) return true;
        const code = (c.code || "").toLowerCase();
        const name = (c.name || "").toLowerCase();
        return code.includes(query) || name.includes(query);
      });
    }
  }, [targetMode, colorCounts, brand.colors, searchQuery]);

  if (!isOpen) return null;

  const isSameColor =
    sourceHex && targetHex && sourceHex.toUpperCase() === targetHex.toUpperCase();
  const canSwap = sourceItem && targetItem && !isSameColor && sourceItem.count > 0;

  const handleConfirm = () => {
    if (!canSwap) return;
    onSwap(sourceHex, targetHex);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-950/80 border border-purple-600 flex items-center justify-center text-purple-300">
              <ArrowLeftRight className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Substituição de Cor em Massa
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-950 border border-purple-800 text-purple-300">
                  {brand.name}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Substitua todas as miçangas de uma cor por outra no molde com 1 clique.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Comparison Preview Card */}
          <div className="grid grid-cols-1 sm:grid-cols-11 items-center gap-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            {/* Source Box */}
            <div className="sm:col-span-5 flex items-center gap-3 p-3 rounded-lg bg-slate-900 border border-slate-700">
              <span
                className="w-8 h-8 rounded-full border-2 border-white/20 shadow-md shrink-0 flex items-center justify-center"
                style={{ backgroundColor: sourceItem?.hex || "#333" }}
              />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Cor Atual (Origem)
                </span>
                <span className="text-sm font-bold text-white block truncate">
                  {sourceItem?.code} {sourceItem?.name}
                </span>
                <span className="text-xs font-mono font-semibold text-purple-300">
                  {sourceItem?.count} miçangas no molde
                </span>
              </div>
            </div>

            {/* Transition Arrow */}
            <div className="sm:col-span-1 flex justify-center py-1 sm:py-0">
              <div className="w-8 h-8 rounded-full bg-purple-950/90 border border-purple-500/60 flex items-center justify-center text-purple-300 shadow-lg">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* Target Box */}
            <div className="sm:col-span-5 flex items-center gap-3 p-3 rounded-lg bg-slate-900 border border-slate-700">
              <span
                className="w-8 h-8 rounded-full border-2 border-white/20 shadow-md shrink-0 flex items-center justify-center"
                style={{ backgroundColor: targetItem?.hex || "#333" }}
              />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                  Nova Cor (Destino)
                </span>
                <span className="text-sm font-bold text-emerald-300 block truncate">
                  {targetItem?.code} {targetItem?.name}
                </span>
                <span className="text-xs text-slate-400">
                  {targetItem?.count
                    ? `Já tem ${targetItem.count} miçangas`
                    : "Nova cor no molde"}
                </span>
              </div>
            </div>
          </div>

          {/* Two-Column Selection: Pick Source vs Pick Target */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Column 1: Choose Source Color */}
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  1. Escolha a cor a substituir:
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  {colorCounts.length} cores no molde
                </span>
              </div>

              <div className="space-y-1 max-h-60 overflow-y-auto pr-1 border border-slate-800 rounded-lg p-1.5 bg-slate-950/40">
                {colorCounts.map((item) => {
                  const isSelected =
                    sourceHex.toUpperCase() === item.hex.toUpperCase();
                  return (
                    <button
                      key={item.hex}
                      type="button"
                      onClick={() => setSourceHex(item.hex)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-purple-950/90 border-purple-500 text-white shadow-sm ring-1 ring-purple-500"
                          : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-4 h-4 rounded-full border border-black/40 shadow-inner shrink-0"
                          style={{ backgroundColor: item.hex }}
                        />
                        <div className="truncate">
                          <span className="text-xs font-mono font-bold text-slate-200 mr-1.5">
                            {item.code || ""}
                          </span>
                          <span className="text-xs text-slate-300">
                            {item.name}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-purple-300 shrink-0 ml-2">
                        {item.count} pcs
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Column 2: Choose Target Color */}
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  2. Escolha a nova cor:
                </label>
                <div className="flex bg-slate-950 border border-slate-800 rounded-md p-0.5 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setTargetMode("catalog")}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      targetMode === "catalog"
                        ? "bg-purple-600 text-white font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Catálogo
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetMode("used")}
                    className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                      targetMode === "used"
                        ? "bg-purple-600 text-white font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    No Molde
                  </button>
                </div>
              </div>

              {/* Search input for target colors */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar código ou nome da cor..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Grid of target options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-1 border border-slate-800 rounded-lg p-1.5 bg-slate-950/40">
                {filteredTargetColors.length > 0 ? (
                  filteredTargetColors.map((c) => {
                    const isSelected =
                      targetHex.toUpperCase() === c.hex.toUpperCase();
                    const isSameAsSource =
                      sourceHex.toUpperCase() === c.hex.toUpperCase();

                    return (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => setTargetHex(c.hex)}
                        disabled={isSameAsSource}
                        className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "bg-emerald-950/90 border-emerald-500 text-white shadow-sm ring-1 ring-emerald-500"
                            : isSameAsSource
                            ? "bg-slate-950/50 border-slate-900 opacity-40 cursor-not-allowed"
                            : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-300"
                        }`}
                        title={
                          isSameAsSource
                            ? "Cor atual já selecionada como origem"
                            : `${c.code} ${c.name}`
                        }
                      >
                        <span
                          className="w-4 h-4 rounded-full border border-black/40 shadow-inner shrink-0"
                          style={{ backgroundColor: c.hex }}
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-mono font-bold text-slate-200 mr-1 block">
                            {c.code}
                          </span>
                          <span className="text-[11px] text-slate-400 block truncate">
                            {c.name}
                          </span>
                        </div>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="col-span-2 py-6 text-center text-xs text-slate-500">
                    Nenhuma cor encontrada para "{searchQuery}".
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Validation or Info Banner */}
          {isSameColor ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-950/40 border border-amber-700/60 text-amber-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                A cor de destino selecionada é idêntica à cor de origem. Escolha uma
                cor diferente para realizar a troca.
              </span>
            </div>
          ) : sourceItem && targetItem ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-purple-950/40 border border-purple-800/60 text-purple-200 text-xs">
              <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                Confirmando a troca, todas as <strong>{sourceItem.count} miçangas</strong>{" "}
                de <strong>{sourceItem.code} {sourceItem.name}</strong> serão convertidas para{" "}
                <strong>{targetItem.code} {targetItem.name}</strong>. Esta ação pode ser desfeita com <strong>Ctrl+Z</strong>.
              </span>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canSwap}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold border border-purple-500 flex items-center gap-2 transition-colors cursor-pointer shadow-lg shadow-purple-950/50"
          >
            <ArrowLeftRight className="w-4 h-4" />
            Substituir {sourceItem?.count || 0} Miçangas
          </button>
        </div>
      </div>
    </div>
  );
};
