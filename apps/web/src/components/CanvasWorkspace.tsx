"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Eye,
  Grid3X3,
  Hash,
  CircleDot,
  Square,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  XCircle,
  Pencil,
  Eraser,
  Pipette,
  MousePointer,
  Undo2,
  Redo2,
  Printer,
  ArrowLeftRight,
  Flame,
} from "lucide-react";
import { ProcessResponse, PhysicalParams, BrandInfo } from "@/types";
import { ColorSwapModal } from "./ColorSwapModal";

interface CanvasWorkspaceProps {
  data: ProcessResponse | null;
  onDataChange?: (newData: ProcessResponse) => void;
  params: PhysicalParams;
  previewUrl: string | null;
  selectedBrand: string;
  brands: BrandInfo[];
}

type EditorTool = "select" | "pencil" | "eraser" | "eyedropper";

export const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = ({
  data,
  onDataChange,
  params,
  previewUrl,
  selectedBrand,
  brands,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [zoom, setZoom] = useState<number>(1);
  const [viewMode, setViewMode] = useState<"beads" | "melted" | "flat">("beads");
  const [meltStyle, setMeltStyle] = useState<"standard" | "flat_melt">("standard");
  const [showMeltMenu, setShowMeltMenu] = useState<boolean>(false);
  const [showRuler, setShowRuler] = useState<boolean>(true);
  const [showSymbols, setShowSymbols] = useState<boolean>(false);
  const [showPegboard, setShowPegboard] = useState<boolean>(true);
  const [focusedColor, setFocusedColor] = useState<string | null>(null);

  // Manual Canvas Editor States
  const [tool, setTool] = useState<EditorTool>("select");
  const [activeColor, setActiveColor] = useState<string>("#000000");
  const [showPaintPicker, setShowPaintPicker] = useState<boolean>(false);
  const [isPointerDown, setIsPointerDown] = useState<boolean>(false);
  const [hoveredCell, setHoveredCell] = useState<{ r: number; c: number } | null>(null);

  // Undo / Redo History Stack
  const [history, setHistory] = useState<string[][][]>([]);
  const [historyStep, setHistoryStep] = useState<number>(-1);

  // Color Swapper Modal States
  const [isSwapModalOpen, setIsSwapModalOpen] = useState<boolean>(false);
  const [swapSourceHex, setSwapSourceHex] = useState<string | null>(null);

  const currentBrandObj =
    brands.find((b) => b.id === (data?.brand || selectedBrand)) || brands[0];

  // Helper map for catalog colors (code, name, hex)
  const brandLookup = React.useMemo(() => {
    const map: Record<string, { code: string; name: string }> = {};
    if (currentBrandObj && currentBrandObj.colors) {
      currentBrandObj.colors.forEach((c) => {
        map[c.hex.toUpperCase()] = { code: c.code, name: c.name };
      });
    }
    return map;
  }, [currentBrandObj]);

  // Set initial active color from first palette bead
  useEffect(() => {
    if (data && data.color_counts.length > 0 && activeColor === "#000000") {
      setActiveColor(data.color_counts[0].hex);
    }
  }, [data]);

  // Initialize history with initial pattern matrix
  useEffect(() => {
    if (data && history.length === 0) {
      const clone = data.matrix.map((row) => [...row]);
      setHistory([clone]);
      setHistoryStep(0);
    }
  }, [data?.matrix]);

  // Recalculate color counts & bead totals from matrix
  const updateMatrixData = useCallback(
    (newMatrix: string[][], pushHistory: boolean = true) => {
      if (!data || !onDataChange) return;

      const counts: Record<string, number> = {};
      let totalBeads = 0;

      for (let r = 0; r < newMatrix.length; r++) {
        for (let c = 0; c < newMatrix[r].length; c++) {
          const val = newMatrix[r][c];
          if (val && val !== "TRANSPARENT") {
            const upper = val.toUpperCase();
            counts[upper] = (counts[upper] || 0) + 1;
            totalBeads++;
          }
        }
      }

      // Preserve existing codes or lookup from brand
      const newColorCounts = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([hex, count]) => {
          const existing = data.color_counts.find(
            (item) => item.hex.toUpperCase() === hex
          );
          const brandItem = brandLookup[hex];
          return {
            hex,
            count,
            code: existing?.code || brandItem?.code || "",
            name: existing?.name || brandItem?.name || `${currentBrandObj.name} Bead`,
          };
        });

      if (pushHistory) {
        const nextHistory = history.slice(0, historyStep + 1);
        nextHistory.push(newMatrix.map((row) => [...row]));
        if (nextHistory.length > 30) nextHistory.shift();
        setHistory(nextHistory);
        setHistoryStep(nextHistory.length - 1);
      }

      onDataChange({
        ...data,
        grid: {
          ...data.grid,
          total_beads: totalBeads,
        },
        color_counts: newColorCounts,
        matrix: newMatrix,
      });
    },
    [data, onDataChange, history, historyStep, brandLookup, currentBrandObj]
  );

  const handleUndo = useCallback(() => {
    if (historyStep > 0 && history[historyStep - 1]) {
      const prev = history[historyStep - 1];
      setHistoryStep(historyStep - 1);
      updateMatrixData(prev.map((r) => [...r]), false);
    }
  }, [historyStep, history, updateMatrixData]);

  const handleRedo = useCallback(() => {
    if (historyStep < history.length - 1 && history[historyStep + 1]) {
      const next = history[historyStep + 1];
      setHistoryStep(historyStep + 1);
      updateMatrixData(next.map((r) => [...r]), false);
    }
  }, [historyStep, history, updateMatrixData]);

  // Color Swapper Handlers
  const handleOpenSwapModal = useCallback(
    (sourceHex?: string) => {
      if (!data || data.color_counts.length === 0) return;

      let chosen: string = data.color_counts[0].hex;

      if (
        sourceHex &&
        data.color_counts.some(
          (c) => c.hex.toUpperCase() === sourceHex.toUpperCase()
        )
      ) {
        chosen = sourceHex;
      } else if (
        focusedColor &&
        data.color_counts.some(
          (c) => c.hex.toUpperCase() === focusedColor.toUpperCase()
        )
      ) {
        chosen = focusedColor;
      } else if (
        activeColor &&
        data.color_counts.some(
          (c) => c.hex.toUpperCase() === activeColor.toUpperCase()
        )
      ) {
        chosen = activeColor;
      }

      setSwapSourceHex(chosen);
      setIsSwapModalOpen(true);
    },
    [data, focusedColor, activeColor]
  );

  const handleSwapColors = useCallback(
    (sourceHex: string, targetHex: string) => {
      if (!data) return;
      const sourceUpper = sourceHex.toUpperCase();
      const targetUpper = targetHex.toUpperCase();
      if (sourceUpper === targetUpper) return;

      let swapped = 0;
      const newMatrix = data.matrix.map((row) =>
        row.map((cell) => {
          if (cell && cell.toUpperCase() === sourceUpper) {
            swapped++;
            return targetUpper;
          }
          return cell;
        })
      );

      if (swapped > 0) {
        updateMatrixData(newMatrix, true);
        if (focusedColor && focusedColor.toUpperCase() === sourceUpper) {
          setFocusedColor(targetUpper);
        }
        if (activeColor && activeColor.toUpperCase() === sourceUpper) {
          setActiveColor(targetUpper);
        }
      }
    },
    [data, updateMatrixData, focusedColor, activeColor]
  );

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      } else if (e.key.toLowerCase() === "b") {
        setTool("pencil");
      } else if (e.key.toLowerCase() === "e") {
        setTool("eraser");
      } else if (e.key.toLowerCase() === "i") {
        setTool("eyedropper");
      } else if (e.key.toLowerCase() === "v") {
        setTool("select");
      } else if (e.key.toLowerCase() === "r" && !e.ctrlKey && !e.metaKey) {
        handleOpenSwapModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo, handleOpenSwapModal]);

  const getCellFromPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const rulerOffset = showRuler ? 32 : 0;
    const beadCellPx = 28;

    const c = Math.floor((clickX - rulerOffset) / beadCellPx);
    const r = Math.floor((clickY - rulerOffset) / beadCellPx);

    if (r >= 0 && r < data.grid.rows && c >= 0 && c < data.grid.columns) {
      return { r, c };
    }
    return null;
  };

  const applyToolToCell = (r: number, c: number, isInitialClick: boolean = false) => {
    if (!data) return;
    const currentVal = data.matrix[r][c];

    if (tool === "pencil") {
      if (currentVal.toUpperCase() !== activeColor.toUpperCase()) {
        const nextMatrix = data.matrix.map((row) => [...row]);
        nextMatrix[r][c] = activeColor.toUpperCase();
        updateMatrixData(nextMatrix, isInitialClick);
      }
    } else if (tool === "eraser") {
      if (currentVal !== "TRANSPARENT") {
        const nextMatrix = data.matrix.map((row) => [...row]);
        nextMatrix[r][c] = "TRANSPARENT";
        updateMatrixData(nextMatrix, isInitialClick);
      }
    } else if (tool === "eyedropper" && isInitialClick) {
      if (currentVal && currentVal !== "TRANSPARENT") {
        setActiveColor(currentVal.toUpperCase());
        setTool("pencil");
      }
    } else if (tool === "select" && isInitialClick) {
      if (currentVal && currentVal !== "TRANSPARENT") {
        const upper = currentVal.toUpperCase();
        setFocusedColor(
          focusedColor?.toUpperCase() === upper ? null : upper
        );
        setActiveColor(upper);
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsPointerDown(true);
    const cell = getCellFromPointer(e);
    if (cell) {
      applyToolToCell(cell.r, cell.c, true);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const cell = getCellFromPointer(e);
    setHoveredCell(cell);
    if (isPointerDown && cell && (tool === "pencil" || tool === "eraser")) {
      applyToolToCell(cell.r, cell.c, false);
    }
  };

  const handlePointerUp = () => {
    setIsPointerDown(false);
  };
  const colorSymbolMap = React.useMemo(() => {
    if (!data) return {};
    const symbols = "123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ#*+@&$%?!";
    const map: Record<string, string> = {};
    data.color_counts.forEach((item, idx) => {
      map[item.hex.toUpperCase()] = symbols[idx % symbols.length];
    });
    return map;
  }, [data]);

  const handleNextColor = () => {
    if (!data || data.color_counts.length === 0) return;
    if (!focusedColor) {
      setFocusedColor(data.color_counts[0].hex);
      return;
    }
    const currentIndex = data.color_counts.findIndex(
      (c) => c.hex.toUpperCase() === focusedColor.toUpperCase()
    );
    const nextIndex = (currentIndex + 1) % data.color_counts.length;
    setFocusedColor(data.color_counts[nextIndex].hex);
  };

  const handlePrevColor = () => {
    if (!data || data.color_counts.length === 0) return;
    if (!focusedColor) {
      setFocusedColor(data.color_counts[data.color_counts.length - 1].hex);
      return;
    }
    const currentIndex = data.color_counts.findIndex(
      (c) => c.hex.toUpperCase() === focusedColor.toUpperCase()
    );
    const prevIndex =
      (currentIndex - 1 + data.color_counts.length) % data.color_counts.length;
    setFocusedColor(data.color_counts[prevIndex].hex);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cols = data.grid.columns;
    const rows = data.grid.rows;
    const beadCellPx = 28;
    const rulerOffset = showRuler ? 32 : 0;

    const renderWidth = cols * beadCellPx + rulerOffset;
    const renderHeight = rows * beadCellPx + rulerOffset;

    canvas.width = renderWidth;
    canvas.height = renderHeight;
    ctx.imageSmoothingEnabled = false;

    // 1. Clear background
    ctx.fillStyle = "#FAF8F5";
    ctx.fillRect(0, 0, renderWidth, renderHeight);

    // 2. Draw Coordinates Ruler
    if (showRuler) {
      ctx.fillStyle = "#E2E8F0";
      ctx.fillRect(0, 0, rulerOffset, renderHeight);
      ctx.fillRect(0, 0, renderWidth, rulerOffset);

      ctx.fillStyle = "#64748B";
      ctx.font = "bold 11px monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (let c = 0; c < cols; c++) {
        if ((c + 1) % 5 === 0 || c === 0) {
          const x = rulerOffset + c * beadCellPx + beadCellPx / 2;
          ctx.fillText((c + 1).toString(), x, rulerOffset / 2);
        }
      }

      for (let r = 0; r < rows; r++) {
        if ((r + 1) % 5 === 0 || r === 0) {
          const y = rulerOffset + r * beadCellPx + beadCellPx / 2;
          ctx.fillText((r + 1).toString(), rulerOffset / 2, y);
        }
      }
    }

    // 3. Faint Grid (Disabled in Melted View for authentic physical art appearance)
    if (viewMode !== "melted") {
      ctx.strokeStyle = "#E2E8F0";
      ctx.lineWidth = 1;

      for (let c = 0; c <= cols; c++) {
        const x = rulerOffset + c * beadCellPx;
        ctx.beginPath();
        ctx.moveTo(x, rulerOffset);
        ctx.lineTo(x, renderHeight);
        ctx.stroke();
      }

      for (let r = 0; r <= rows; r++) {
        const y = rulerOffset + r * beadCellPx;
        ctx.beginPath();
        ctx.moveTo(rulerOffset, y);
        ctx.lineTo(renderWidth, y);
        ctx.stroke();
      }
    }

    // 4. Render Perler Beads Matrix
    const matrix = data.matrix;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const hex = matrix[r] ? matrix[r][c] : null;
        if (!hex || hex === "TRANSPARENT") continue;

        const isMatch = focusedColor
          ? hex.toUpperCase() === focusedColor.toUpperCase()
          : true;

        const x = rulerOffset + c * beadCellPx;
        const y = rulerOffset + r * beadCellPx;
        const cx = x + beadCellPx / 2;
        const cy = y + beadCellPx / 2;

        ctx.save();

        if (focusedColor && !isMatch) {
          ctx.globalAlpha = 0.12;
        } else {
          ctx.globalAlpha = 1.0;
        }

        if (viewMode === "beads") {
          const outerR = (beadCellPx - 2) / 2;
          const innerR = outerR * 0.42;

          ctx.fillStyle = hex;
          ctx.beginPath();
          ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(cx, cy, outerR - 0.6, -Math.PI * 0.8, Math.PI * 0.2);
          ctx.stroke();

          ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(cx, cy, outerR - 0.6, Math.PI * 0.2, Math.PI * 1.2);
          ctx.stroke();

          ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
          ctx.beginPath();
          ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
          ctx.stroke();

          if (focusedColor && isMatch) {
            ctx.strokeStyle = "#C084FC";
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.arc(cx, cy, outerR + 1, 0, Math.PI * 2);
            ctx.stroke();
          }
        } else if (viewMode === "melted") {
          // Melted / Ironed Simulation:
          // In real life (like photo media_1788821283364.png), neighboring beads fuse seamlessly!
          // Only outer edges touching air/transparent have rounded curves.
          const isFilled = (nr: number, nc: number) => {
            if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) return false;
            const val = matrix[nr]?.[nc];
            return Boolean(val && val !== "TRANSPARENT");
          };

          const top = isFilled(r - 1, c);
          const bottom = isFilled(r + 1, c);
          const left = isFilled(r, c - 1);
          const right = isFilled(r, c + 1);

          // Outer scalloped corner radius (0 if fused into neighbor, outerR if edge)
          const outerR = beadCellPx * 0.44;
          const tl = top && left ? 0 : outerR;
          const tr = top && right ? 0 : outerR;
          const br = bottom && right ? 0 : outerR;
          const bl = bottom && left ? 0 : outerR;

          // 1. Fused solid plastic body
          ctx.fillStyle = hex;
          ctx.beginPath();
          if ((ctx as any).roundRect) {
            (ctx as any).roundRect(x, y, beadCellPx, beadCellPx, [tl, tr, br, bl]);
          } else {
            ctx.rect(x, y, beadCellPx, beadCellPx);
          }
          ctx.fill();

          // 2. Heat-pressed surface shine (subtle satin gradient across top)
          const shineGrad = ctx.createLinearGradient(x, y, x + beadCellPx, y + beadCellPx);
          shineGrad.addColorStop(0, "rgba(255, 255, 255, 0.16)");
          shineGrad.addColorStop(0.45, "rgba(255, 255, 255, 0.02)");
          shineGrad.addColorStop(1, "rgba(0, 0, 0, 0.08)");
          ctx.fillStyle = shineGrad;
          ctx.beginPath();
          if ((ctx as any).roundRect) {
            (ctx as any).roundRect(x, y, beadCellPx, beadCellPx, [tl, tr, br, bl]);
          } else {
            ctx.rect(x, y, beadCellPx, beadCellPx);
          }
          ctx.fill();

          // 3. Faint seam crease where beads meet
          if (right) {
            ctx.strokeStyle = "rgba(0, 0, 0, 0.09)";
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(x + beadCellPx, y + 1);
            ctx.lineTo(x + beadCellPx, y + beadCellPx - 1);
            ctx.stroke();
          }
          if (bottom) {
            ctx.strokeStyle = "rgba(0, 0, 0, 0.09)";
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(x + 1, y + beadCellPx);
            ctx.lineTo(x + beadCellPx - 1, y + beadCellPx);
            ctx.stroke();
          }

          // 4. Outer scalloped contour border
          ctx.strokeStyle = "rgba(0, 0, 0, 0.22)";
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          if ((ctx as any).roundRect) {
            (ctx as any).roundRect(x, y, beadCellPx, beadCellPx, [tl, tr, br, bl]);
          } else {
            ctx.rect(x, y, beadCellPx, beadCellPx);
          }
          ctx.stroke();

          // 5. Authentic Melted Pinhole Dimple in center (like real Hello Kitty craft!)
          if (meltStyle === "standard") {
            // Soft outer indentation
            const dimpleR = beadCellPx * 0.13;
            ctx.fillStyle = "rgba(0, 0, 0, 0.14)";
            ctx.beginPath();
            ctx.arc(cx, cy, dimpleR, 0, Math.PI * 2);
            ctx.fill();

            // Dark melted hole core
            const holeR = beadCellPx * 0.075;
            ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
            ctx.beginPath();
            ctx.arc(cx, cy, holeR, 0, Math.PI * 2);
            ctx.fill();

            // Subtle highlight on the upper rim of the pinhole
            ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.arc(cx, cy, holeR + 0.5, -Math.PI * 0.8, -Math.PI * 0.1);
            ctx.stroke();
          } else {
            // 100% Flat Melt (fully closed, faint center dimple)
            const dimpleR = beadCellPx * 0.07;
            ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
            ctx.beginPath();
            ctx.arc(cx, cy, dimpleR, 0, Math.PI * 2);
            ctx.fill();
          }

          // Focus indicator in melted view
          if (focusedColor && isMatch) {
            ctx.strokeStyle = "#F59E0B";
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            if ((ctx as any).roundRect) {
              (ctx as any).roundRect(x - 0.5, y - 0.5, beadCellPx + 1, beadCellPx + 1, [tl, tr, br, bl]);
            } else {
              ctx.strokeRect(x, y, beadCellPx, beadCellPx);
            }
            ctx.stroke();
          }
        } else {
          ctx.fillStyle = hex;
          ctx.fillRect(x, y, beadCellPx, beadCellPx);

          if (focusedColor && isMatch) {
            ctx.strokeStyle = "#C084FC";
            ctx.lineWidth = 2.0;
            ctx.strokeRect(x, y, beadCellPx, beadCellPx);
          }
        }

        if (showSymbols || (focusedColor && isMatch)) {
          const sym = colorSymbolMap[hex.toUpperCase()] || "";
          ctx.fillStyle =
            hex === "#FFFFFF" || hex.toLowerCase().includes("fff")
              ? "#000000"
              : "#FFFFFF";
          ctx.font = "bold 11px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(sym, cx, cy);
        }

        ctx.restore();
      }
    }

    // 5. Hover Brush Outline
    if (hoveredCell && (tool === "pencil" || tool === "eraser")) {
      const hx = rulerOffset + hoveredCell.c * beadCellPx;
      const hy = rulerOffset + hoveredCell.r * beadCellPx;
      ctx.save();
      ctx.strokeStyle = tool === "pencil" ? "#A855F7" : "#EF4444";
      ctx.lineWidth = 2;
      ctx.strokeRect(hx + 1, hy + 1, beadCellPx - 2, beadCellPx - 2);
      ctx.restore();
    }

    // 6. Grid line every 5 (Disabled in Melted View)
    if (viewMode !== "melted") {
      ctx.strokeStyle = "rgba(100, 116, 139, 0.4)";
      ctx.lineWidth = 1.8;

      for (let c = 0; c <= cols; c += 5) {
        const x = rulerOffset + c * beadCellPx;
        ctx.beginPath();
        ctx.moveTo(x, rulerOffset);
        ctx.lineTo(x, renderHeight);
        ctx.stroke();
      }

      for (let r = 0; r <= rows; r += 5) {
        const y = rulerOffset + r * beadCellPx;
        ctx.beginPath();
        ctx.moveTo(rulerOffset, y);
        ctx.lineTo(renderWidth, y);
        ctx.stroke();
      }
    }

    // 7. Pegboard Modular Lines (Disabled in Melted View)
    if (showPegboard && params.pegboardSizeCm > 0 && viewMode !== "melted") {
      const beadsPerPegboard = Math.round(params.pegboardSizeCm / params.beadSizeCm);
      const pegboardIntervalPx = beadsPerPegboard * beadCellPx;

      ctx.strokeStyle = "#DC2626";
      ctx.lineWidth = 3;

      let x = rulerOffset + pegboardIntervalPx;
      while (x < renderWidth) {
        ctx.beginPath();
        ctx.moveTo(x, rulerOffset);
        ctx.lineTo(x, renderHeight);
        ctx.stroke();
        x += pegboardIntervalPx;
      }

      let y = rulerOffset + pegboardIntervalPx;
      while (y < renderHeight) {
        ctx.beginPath();
        ctx.moveTo(rulerOffset, y);
        ctx.lineTo(renderWidth, y);
        ctx.stroke();
        y += pegboardIntervalPx;
      }

      ctx.strokeStyle = "#DC2626";
      ctx.lineWidth = 3.5;
      ctx.strokeRect(rulerOffset, rulerOffset, cols * beadCellPx, rows * beadCellPx);
    }
  }, [
    data,
    viewMode,
    showRuler,
    showSymbols,
    showPegboard,
    focusedColor,
    hoveredCell,
    tool,
    params.pegboardSizeCm,
    params.beadSizeCm,
    colorSymbolMap,
  ]);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  const handleDownloadPDF = async () => {
    if (!data) return;
    setIsExportingPdf(true);
    try {
      const payload = {
        matrix: data.matrix,
        grid: data.grid,
        color_counts: data.color_counts,
        brand: currentBrandObj?.id || selectedBrand || "perler",
        pegboard_size_cm: params.pegboardSizeCm || 14.5,
      };

      const res = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to generate PDF");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${currentBrandObj?.id || "perler"}-pattern-1to1-scale.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("PDF export failed:", err);
      alert(`Error generating PDF: ${err.message || "Network error"}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;
    const link = document.createElement("a");
    link.download = `${currentBrandObj?.id || "perler"}-pattern-${data.grid.columns}x${data.grid.rows}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const focusedItemInfo = data?.color_counts.find(
    (c) => c.hex.toUpperCase() === focusedColor?.toUpperCase()
  );

  const activeColorInfo = brandLookup[activeColor.toUpperCase()];

  return (
    <div className="flex-1 h-screen flex flex-col bg-slate-950 relative overflow-hidden">
      {/* Top Main Toolbar */}
      {/* Top Main Toolbar */}
      <header className="h-14 border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 flex items-center justify-between gap-3 z-10 shrink-0 min-w-0 select-none">
        {/* LEFT SECTION: Zoom & Edit Tools */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Zoom controls */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1 shrink-0">
            <button
              onClick={() => setZoom((z) => Math.max(0.2, z - 0.15))}
              className="p-1.5 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono text-slate-300 px-1.5 min-w-[3rem] text-center select-none whitespace-nowrap">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(3, z + 0.15))}
              className="p-1.5 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1.5 text-slate-400 hover:text-white rounded border-l border-slate-800/80 transition-colors ml-0.5 cursor-pointer"
              title="Reset Zoom (100%)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* EDIT TOOLS: Select, Pencil, Eraser, Eyedropper, Undo, Redo, Swap */}
          {data && (
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1 gap-0.5 shrink-0">
              <button
                onClick={() => setTool("select")}
                className={`p-1.5 rounded transition-colors cursor-pointer flex items-center gap-1 text-xs font-medium ${
                  tool === "select"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Select / Focus Tool (V)"
              >
                <MousePointer className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTool("pencil")}
                className={`p-1.5 rounded transition-colors cursor-pointer flex items-center gap-1 text-xs font-medium ${
                  tool === "pencil"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Pencil / Paint Bead (B)"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTool("eraser")}
                className={`p-1.5 rounded transition-colors cursor-pointer flex items-center gap-1 text-xs font-medium ${
                  tool === "eraser"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Eraser / Remove Bead (E)"
              >
                <Eraser className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setTool("eyedropper")}
                className={`p-1.5 rounded transition-colors cursor-pointer flex items-center gap-1 text-xs font-medium ${
                  tool === "eyedropper"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Eyedropper / Pick Color from Bead (I)"
              >
                <Pipette className="w-3.5 h-3.5" />
              </button>

              <div className="w-[1px] h-4 bg-slate-800 mx-0.5 shrink-0" />

              <button
                onClick={handleUndo}
                disabled={historyStep <= 0}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors cursor-pointer"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleRedo}
                disabled={historyStep >= history.length - 1}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors cursor-pointer"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>

              <div className="w-[1px] h-4 bg-slate-800 mx-0.5 shrink-0" />

              <button
                type="button"
                onClick={() => handleOpenSwapModal()}
                className="px-2 py-1 text-slate-300 hover:text-white hover:bg-purple-950/60 rounded text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                title="Mass Color Swap (Shortcut: R)"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span className="hidden xl:inline text-[11px] whitespace-nowrap">Swap</span>
              </button>
            </div>
          )}

          {/* ACTIVE BRUSH COLOR SELECTOR (100% Bead Brand Catalog) */}
          {data && (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowPaintPicker(!showPaintPicker)}
                className="flex items-center gap-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-purple-600 rounded-lg px-2.5 py-1.5 text-xs transition-all cursor-pointer whitespace-nowrap"
                title="Choose bead color to paint"
              >
                <span className="text-[10px] uppercase font-semibold text-slate-400 hidden sm:inline">
                  Color:
                </span>
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-inner shrink-0"
                  style={{ backgroundColor: activeColor }}
                />
                <span className="font-mono text-purple-300 font-bold whitespace-nowrap">
                  {activeColorInfo ? activeColorInfo.code : "Bead"}
                </span>
                {activeColorInfo?.name && (
                  <span className="hidden 2xl:inline text-slate-400 max-w-[90px] truncate text-[11px]">
                    {activeColorInfo.name}
                  </span>
                )}
                <ChevronRight
                  className={`w-3 h-3 text-slate-400 shrink-0 transition-transform ${
                    showPaintPicker ? "rotate-90" : ""
                  }`}
                />
              </button>

              {/* Bead Picker Dropdown with Backdrop */}
              {showPaintPicker && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowPaintPicker(false)}
                  />
                  <div className="absolute left-0 top-full mt-2 w-72 max-h-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2.5 z-50 overflow-y-auto space-y-3">
                    {/* Current Pattern Beads */}
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 px-1">
                        Beads in this Pattern ({data.color_counts.length})
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        {data.color_counts.map((item) => (
                          <button
                            key={item.hex}
                            type="button"
                            onClick={() => {
                              setActiveColor(item.hex);
                              setShowPaintPicker(false);
                            }}
                            className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-left transition-colors cursor-pointer ${
                              activeColor.toUpperCase() === item.hex.toUpperCase()
                                ? "bg-purple-950 border-purple-500 text-purple-200"
                                : "bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300"
                            }`}
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-inner shrink-0"
                              style={{ backgroundColor: item.hex }}
                            />
                            <span className="text-[10px] font-mono font-bold text-slate-200 whitespace-nowrap">
                              {item.code || ""}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate">
                              {item.name || ""}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* All Brand Beads */}
                    {currentBrandObj && currentBrandObj.colors && (
                      <div className="border-t border-slate-800 pt-2">
                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 px-1">
                          All {currentBrandObj.name} Beads ({currentBrandObj.count})
                        </div>
                        <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto pr-1">
                          {currentBrandObj.colors.map((c) => (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => {
                                setActiveColor(c.hex);
                                setShowPaintPicker(false);
                              }}
                              className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-left transition-colors cursor-pointer ${
                                activeColor.toUpperCase() === c.hex.toUpperCase()
                                  ? "bg-purple-950 border-purple-500 text-purple-200"
                                  : "bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300"
                              }`}
                            >
                              <span
                                className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-inner shrink-0"
                                style={{ backgroundColor: c.hex }}
                              />
                              <span className="text-[10px] font-mono font-bold text-slate-200 whitespace-nowrap">
                                {c.code}
                              </span>
                              <span className="text-[10px] text-slate-400 truncate">
                                {c.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* CENTER SECTION: View Modes (3D, Melted, Flat) & Overlays */}
        <div className="flex items-center gap-2 shrink-0">
          {/* VIEW MODES: Bead View (3D) vs Melted View (Ironed) vs Flat View */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1 gap-0.5 shrink-0">
            <button
              onClick={() => setViewMode("beads")}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                viewMode === "beads"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Bead View (3D open beads before ironing)"
            >
              <CircleDot className="w-3.5 h-3.5 shrink-0" />
              <span>Beads</span>
            </button>

            {/* Melted Button with Dropdown Chevron - 100% FIXED WIDTH, ZERO LAYOUT SHIFT */}
            <div className="relative flex items-center">
              <button
                onClick={() => setViewMode("melted")}
                className={`px-2 py-1 rounded-l text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                  viewMode === "melted"
                    ? "bg-amber-600 text-white shadow-sm shadow-amber-950/40"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Melted View (Ironed beads simulation)"
              >
                <Flame className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>Melted</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (viewMode !== "melted") setViewMode("melted");
                  setShowMeltMenu(!showMeltMenu);
                }}
                className={`px-1 py-1 rounded-r border-l text-xs font-semibold transition-all flex items-center cursor-pointer ${
                  viewMode === "melted"
                    ? "bg-amber-600 text-white border-amber-700 hover:bg-amber-500"
                    : "text-slate-400 hover:text-white border-slate-800 hover:bg-slate-900"
                }`}
                title="Melt options: Standard vs Full Melt"
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${showMeltMenu ? "rotate-180" : ""}`} />
              </button>

              {/* Floating Popover Dropdown - ZERO LAYOUT SHIFT */}
              {showMeltMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMeltMenu(false)}
                  />
                  <div
                    className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 space-y-1 animate-in fade-in zoom-in-95 duration-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 tracking-wider">
                      Melt Fusion Style
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMeltStyle("standard");
                        setShowMeltMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                        meltStyle === "standard"
                          ? "bg-amber-600 text-white font-semibold shadow-sm"
                          : "text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <span>Standard Melt</span>
                      <span className="text-[10px] opacity-75 font-mono">Pinholes</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMeltStyle("flat_melt");
                        setShowMeltMenu(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                        meltStyle === "flat_melt"
                          ? "bg-amber-600 text-white font-semibold shadow-sm"
                          : "text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <span>Full Melt</span>
                      <span className="text-[10px] opacity-75 font-mono">Solid</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setViewMode("flat")}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                viewMode === "flat"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Flat 2D pixel view"
            >
              <Square className="w-3.5 h-3.5 shrink-0" />
              <span>Flat</span>
            </button>
          </div>

          {/* FEATURE TOGGLES */}
          <div className="flex items-center gap-1 pl-1.5 border-l border-slate-800 shrink-0">
            <button
              onClick={() => setShowRuler(!showRuler)}
              className={`px-2 py-1 rounded text-xs font-medium border flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                showRuler
                  ? "bg-purple-950 border-purple-600 text-purple-200"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
              }`}
              title="Toggle coordinate ruler numbers (123)"
            >
              <Eye className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xl:inline">Ruler</span>
            </button>

            <button
              onClick={() => setShowSymbols(!showSymbols)}
              className={`px-2 py-1 rounded text-xs font-medium border flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                showSymbols
                  ? "bg-purple-950 border-purple-600 text-purple-200"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
              }`}
              title="Toggle color symbols inside beads"
            >
              <Hash className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xl:inline">Symbols</span>
            </button>

            <button
              onClick={() => setShowPegboard(!showPegboard)}
              className={`px-2 py-1 rounded text-xs font-medium border flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap ${
                showPegboard
                  ? "bg-rose-950 border-rose-600 text-rose-300"
                  : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
              }`}
              title="Toggle pegboard modular boundaries"
            >
              <Grid3X3 className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden xl:inline">Pegboards</span>
            </button>
          </div>
        </div>

        {/* RIGHT SECTION: Grid Specs Badge & Print / Export Action Buttons */}
        {data && (
          <div className="flex items-center gap-2 shrink-0">
            {/* Specs Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 whitespace-nowrap shrink-0">
              <span className="text-purple-300 font-semibold">{data.grid.columns}×{data.grid.rows}</span>
              <span className="text-slate-600">•</span>
              <span>{data.grid.total_beads.toLocaleString()} beads</span>
            </div>

            {/* Print 1:1 Scale PDF */}
            <button
              onClick={handleDownloadPDF}
              disabled={isExportingPdf}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold border border-emerald-500/80 flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-emerald-950/40 whitespace-nowrap shrink-0"
              title="Printable 1:1 scale actual size PDF pattern"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" />
              <span>{isExportingPdf ? "Generating..." : "Print 1:1 (PDF)"}</span>
            </button>

            {/* Export PNG */}
            <button
              onClick={handleDownloadPNG}
              className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-900 text-slate-200 rounded-lg text-xs font-semibold border border-slate-800 hover:border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Download pattern image as PNG"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>PNG</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Canvas Viewport */}
      <div
        ref={containerRef}
        className={`flex-1 overflow-auto flex items-center justify-center p-8 transition-colors ${
          viewMode === "melted"
            ? "bg-[#090d16]"
            : "bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]"
        }`}
      >
        {data ? (
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "center center",
              transition: "transform 0.1s ease-out",
            }}
            className={`rounded-sm select-none p-1.5 transition-all ${
              viewMode === "melted"
                ? "shadow-[0_25px_60px_rgba(0,0,0,0.85)] border border-amber-900/30 bg-slate-900/90"
                : "shadow-2xl border-2 border-slate-700 bg-white"
            }`}
          >
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={() => {
                setIsPointerDown(false);
                setHoveredCell(null);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                const cell = getCellFromPointer(e as any);
                if (cell && data) {
                  const val = data.matrix[cell.r][cell.c];
                  if (val && val !== "TRANSPARENT") {
                    setActiveColor(val.toUpperCase());
                    handleOpenSwapModal(val);
                  }
                }
              }}
              className={`block ${
                tool === "pencil" || tool === "eraser"
                  ? "cursor-crosshair"
                  : tool === "eyedropper"
                  ? "cursor-copy"
                  : "cursor-pointer"
              }`}
              style={{
                imageRendering: "pixelated",
                touchAction: "none",
              }}
            />
          </div>
        ) : previewUrl ? (
          <div className="flex flex-col items-center gap-3 text-center max-w-sm">
            <div className="w-48 h-48 rounded-xl border-2 border-dashed border-slate-700 overflow-hidden relative shadow-lg bg-slate-900/60">
              <img
                src={previewUrl}
                alt="Source Preview"
                className="w-full h-full object-contain"
              />
            </div>
            <p className="text-sm font-medium text-slate-300">Ready to Generate Pattern</p>
          </div>
        ) : (
          <div className="text-center text-slate-500 max-w-xs space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <CircleDot className="w-6 h-6 text-purple-400" />
            </div>
            <p className="text-sm font-medium text-slate-200">No Pattern Loaded</p>
            <p className="text-xs text-slate-400">
              Upload a photo or template to generate an official {currentBrandObj?.name} bead pattern on your pegboard.
            </p>
          </div>
        )}
      </div>

      {/* Color Focus Assembly Controls & Shopping List Bottom Bar */}
      {data && data.color_counts.length > 0 && (
        <div className="h-16 border-t border-slate-800/80 bg-slate-900/95 backdrop-blur px-6 flex items-center justify-between gap-4 z-10 shrink-0 select-none">
          {/* Left: Focus Navigator */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevColor}
                className="p-1.5 bg-slate-950 hover:bg-purple-950 border border-slate-800 hover:border-purple-600 rounded-lg text-slate-400 hover:text-purple-300 transition-colors cursor-pointer"
                title="Previous color"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextColor}
                className="p-1.5 bg-slate-950 hover:bg-purple-950 border border-slate-800 hover:border-purple-600 rounded-lg text-slate-400 hover:text-purple-300 transition-colors cursor-pointer"
                title="Next color"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {focusedColor && focusedItemInfo ? (
              <div className="flex items-center gap-2 bg-purple-950/80 border border-purple-500/80 rounded-lg px-2.5 py-1 text-xs">
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-inner"
                  style={{ backgroundColor: focusedItemInfo.hex }}
                />
                <span className="font-semibold text-purple-200">
                  Focusing: {focusedItemInfo.code} {focusedItemInfo.name}
                </span>
                <span className="font-mono font-bold text-purple-300 ml-1">
                  ({focusedItemInfo.count} beads)
                </span>
                <button
                  type="button"
                  onClick={() => handleOpenSwapModal(focusedItemInfo.hex)}
                  className="px-2 py-0.5 rounded bg-purple-900/80 hover:bg-purple-800 border border-purple-500/60 text-purple-200 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ml-1"
                  title="Swap all beads of this color (R)"
                >
                  <ArrowLeftRight className="w-3 h-3" />
                  <span>Swap</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFocusedColor(null)}
                  className="text-purple-300 hover:text-white ml-1 p-0.5 cursor-pointer"
                  title="Clear focus (Show all colors)"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                {currentBrandObj?.name || "Perler"} Inventory:
                <span className="text-[10px] text-slate-500 font-normal lowercase">
                  (click to focus or paint)
                </span>
              </span>
            )}
          </div>

          {/* Right / Scrollable Color Chips with Click-to-Focus & Click-to-Select Brush */}
          <div className="flex items-center gap-2.5 overflow-x-auto py-1">
            {data.color_counts.map((item) => {
              const isFocused =
                focusedColor &&
                focusedColor.toUpperCase() === item.hex.toUpperCase();
              const isBrushActive =
                activeColor.toUpperCase() === item.hex.toUpperCase();
              const sym = colorSymbolMap[item.hex.toUpperCase()] || "";

              return (
                <div
                  key={item.hex}
                  onClick={() => {
                    setActiveColor(item.hex);
                    setFocusedColor(isFocused ? null : item.hex);
                  }}
                  className={`group/chip flex items-center gap-2 px-2.5 py-1 rounded-md border transition-all shrink-0 cursor-pointer ${
                    isFocused
                      ? "bg-purple-950 border-purple-400 ring-2 ring-purple-500/50 shadow-md shadow-purple-950/60"
                      : isBrushActive && tool === "pencil"
                      ? "bg-purple-950/60 border-purple-500 text-purple-200"
                      : "bg-slate-950 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                  }`}
                  title={`Paint with or highlight ${item.code || ""} ${item.name}`}
                >
                  <span
                    className="w-4 h-4 rounded-full border border-black/40 shadow-inner shrink-0 flex items-center justify-center text-[9px] font-bold"
                    style={{
                      backgroundColor: item.hex,
                      color:
                        item.hex === "#FFFFFF" ||
                        item.hex.toLowerCase().includes("fff")
                          ? "#000"
                          : "#FFF",
                    }}
                  >
                    {sym}
                  </span>
                  <div className="flex flex-col text-left leading-tight whitespace-nowrap">
                    <span className="text-[10px] text-slate-300 font-mono truncate max-w-[110px]" title={item.code ? `${item.code} ${item.name}` : item.name}>
                      {item.code ? `${item.code} ${item.name}` : item.name}
                    </span>
                    <span
                      className={`text-[11px] font-mono font-bold whitespace-nowrap ${
                        isFocused ? "text-purple-300" : "text-slate-400"
                      }`}
                    >
                      {item.count} beads
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenSwapModal(item.hex);
                    }}
                    className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-purple-300 transition-colors opacity-70 group-hover/chip:opacity-100 ml-0.5"
                    title={`Swap all ${item.count} beads of this color...`}
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Color Swap Modal */}
      {data && (
        <ColorSwapModal
          isOpen={isSwapModalOpen}
          onClose={() => setIsSwapModalOpen(false)}
          initialSourceHex={swapSourceHex}
          colorCounts={data.color_counts}
          brand={currentBrandObj}
          onSwap={handleSwapColors}
        />
      )}
    </div>
  );
};