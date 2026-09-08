"use client";

import React, { useState } from "react";
import { AlertTriangle, Copy, Check, X, Terminal, Clock } from "lucide-react";
import { ErrorDiagnostic } from "@/utils/logger";

interface ErrorModalProps {
  error: ErrorDiagnostic | null;
  onClose: () => void;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({ error, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!error) return null;

  const handleCopy = () => {
    const diagnosticText = `[PIXELWEAVER ERROR REPORT]
Timestamp: ${error.timestamp}
Title: ${error.title}
Stage: ${error.stage || "unknown"}
Status: ${error.status || "N/A"}
Message: ${error.message}
Technical Details:
${error.details || "No further details provided."}
`;
    navigator.clipboard.writeText(diagnosticText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-slate-900 border border-rose-600/60 rounded-2xl shadow-2xl shadow-rose-950/40 p-6 space-y-4 text-slate-100 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-950/80 border border-rose-500/60 flex items-center justify-center text-rose-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-rose-300">
                {error.title}
              </h3>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3" />
                  {error.timestamp}
                </span>
                {error.stage && (
                  <>
                    <span>•</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-rose-300 font-mono text-[10px] uppercase">
                      Etapa: {error.stage}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message */}
        <div className="bg-rose-950/25 border border-rose-900/50 rounded-xl p-3.5 text-sm text-slate-200">
          <p className="font-medium text-rose-200">{error.message}</p>
        </div>

        {/* Technical Details */}
        {error.details && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <Terminal className="w-3.5 h-3.5" />
              <span>Diagnóstico Técnico / Servidor</span>
            </div>
            <pre className="text-xs font-mono bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-300 max-h-40 overflow-y-auto whitespace-pre-wrap leading-relaxed select-all">
              {error.details}
            </pre>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Diagnóstico</span>
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-950/40 transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
