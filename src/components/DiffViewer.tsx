import React, { useState } from 'react';
import { SensitiveEntity } from '../types';
import { ShieldCheck, Eye, EyeOff, Lock, AlertTriangle, Crosshair } from 'lucide-react';

interface DiffViewerProps {
  originalText: string;
  sanitizedText: string;
  entities: SensitiveEntity[];
  highlightedEntity?: SensitiveEntity | null;
  onSelectEntity?: (entity: SensitiveEntity | null) => void;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  originalText,
  sanitizedText,
  entities,
  highlightedEntity,
  onSelectEntity
}) => {
  const [showRawTokens, setShowRawTokens] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'sanitized' | 'side-by-side'>('sanitized');

  // Highlight masked tokens in the sanitized text
  const renderHighlightedSanitized = (text: string) => {
    if (!entities.length) return text;

    // Pattern matching [REDACTED_*]
    const parts = text.split(/(\[REDACTED_[A-Z0-9_]+\])/g);
    return parts.map((part, index) => {
      if (part.startsWith('[REDACTED_') && part.endsWith(']')) {
        const entity = entities.find((e) => e.masked === part);
        return (
          <span
            key={index}
            className="inline-block px-1.5 py-0.5 rounded text-xs font-mono font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 my-0.5 mx-0.5"
            title={entity ? `Raw Secret: ${showRawTokens ? entity.raw : '•••••••• (Masked Locally)'}` : undefined}
          >
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="flex flex-col space-y-3">
      {/* Top Header of Diff Box */}
      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between border-b border-zinc-800 pb-2.5 gap-2">
        <div className="flex items-center space-x-2 shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-mono font-medium text-zinc-200 whitespace-nowrap">
            Redaction Audit ({entities.length} {entities.length === 1 ? 'secret' : 'secrets'})
          </span>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setShowRawTokens(!showRawTokens)}
            className="flex items-center space-x-1 text-[11px] font-mono px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors cursor-pointer whitespace-nowrap"
          >
            {showRawTokens ? <EyeOff className="w-3 h-3 text-amber-400" /> : <Eye className="w-3 h-3" />}
            <span>{showRawTokens ? 'Hide Raw' : 'Reveal Raw'}</span>
          </button>

          <div className="flex items-center rounded-lg bg-zinc-900 p-0.5 border border-zinc-800 shrink-0">
            <button
              onClick={() => setViewMode('sanitized')}
              className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'sanitized' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-400'
              }`}
            >
              Safe View
            </button>
            <button
              onClick={() => setViewMode('side-by-side')}
              className={`px-2 py-0.5 text-[11px] font-mono rounded transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'side-by-side' ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-400'
              }`}
            >
              Split Diff
            </button>
          </div>
        </div>
      </div>

      {/* Detected Entities Tag Bar */}
      {entities.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg bg-zinc-950/60 border border-zinc-900">
          <span className="text-[10px] uppercase font-mono text-zinc-500 mr-1 flex items-center shrink-0">
            <Lock className="w-2.5 h-2.5 mr-1 text-rose-400" />
            Quarantined:
          </span>
          {entities.map((e) => {
            const isSelected = highlightedEntity?.id === e.id || highlightedEntity?.masked === e.masked;
            return (
              <div
                key={e.id}
                onClick={() => onSelectEntity?.(isSelected ? null : e)}
                className={`group flex items-center space-x-1.5 px-2 py-0.5 rounded text-[11px] font-mono transition-all cursor-pointer max-w-full overflow-hidden select-none active:scale-95 ${
                  isSelected
                    ? 'bg-rose-500/20 border border-rose-500/60 shadow-[0_0_12px_rgba(244,63,94,0.35)] ring-1 ring-rose-500/50'
                    : 'bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80'
                }`}
                title={`Click to locate & highlight in editor\n${showRawTokens ? `Raw: ${e.raw}` : `Masked: ${e.masked}`}`}
              >
                <span className="text-zinc-400 text-[10px] shrink-0">{e.type}:</span>
                <span className="text-rose-400 font-semibold shrink-0">{e.masked}</span>
                <span className="text-zinc-600 shrink-0">→</span>
                <span
                  className="text-zinc-300 font-mono max-w-[140px] sm:max-w-[200px] truncate inline-block align-middle"
                  title={showRawTokens ? `Raw: ${e.raw}` : 'Masked locally (Click "Reveal Raw" above to view plaintext)'}
                >
                  {showRawTokens
                    ? e.raw
                    : e.raw.length > 10
                    ? `${e.raw.substring(0, 4)}••••${e.raw.substring(e.raw.length - 3)}`
                    : '••••••••'}
                </span>
                <Crosshair
                  className={`w-3 h-3 shrink-0 ml-0.5 transition-all ${
                    isSelected
                      ? 'text-rose-400 opacity-100 scale-110'
                      : 'text-zinc-500 opacity-0 group-hover:opacity-100'
                  }`}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Main Diff Code Display */}
      {viewMode === 'side-by-side' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
          {/* Left: Original with red danger highlight */}
          <div className="flex flex-col rounded-lg border border-rose-900/40 bg-zinc-950/80 overflow-hidden">
            <div className="px-3 py-1.5 bg-rose-950/30 border-b border-rose-900/30 flex items-center justify-between text-[11px] text-rose-300 font-medium">
              <span className="flex items-center">
                <AlertTriangle className="w-3 h-3 mr-1 text-rose-400" />
                Raw Content (Blocked from Egress)
              </span>
              <span className="text-[10px] text-rose-400/80">Local Raw</span>
            </div>
            <pre className="p-3 overflow-x-auto text-zinc-300 whitespace-pre-wrap max-h-72 leading-relaxed">
              {originalText}
            </pre>
          </div>

          {/* Right: Sanitized Safe view */}
          <div className="flex flex-col rounded-lg border border-emerald-900/40 bg-zinc-950/80 overflow-hidden">
            <div className="px-3 py-1.5 bg-emerald-950/30 border-b border-emerald-900/30 flex items-center justify-between text-[11px] text-emerald-300 font-medium">
              <span className="flex items-center">
                <ShieldCheck className="w-3 h-3 mr-1 text-emerald-400" />
                Sanitized Safe Buffer (Safe for Cloud)
              </span>
              <span className="text-[10px] text-emerald-400/80">Cloud Safe</span>
            </div>
            <pre className="p-3 overflow-x-auto text-zinc-300 whitespace-pre-wrap max-h-72 leading-relaxed">
              {renderHighlightedSanitized(sanitizedText)}
            </pre>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 overflow-hidden">
          <div className="px-3 py-1.5 bg-zinc-900/60 border-b border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Sanitized Output Buffer (Safe for LLM)</span>
            <span className="text-emerald-400 text-[10px] font-mono">100% Secrets Redacted</span>
          </div>
          <pre className="p-3.5 overflow-x-auto text-xs font-mono text-zinc-200 whitespace-pre-wrap max-h-80 leading-relaxed">
            {renderHighlightedSanitized(sanitizedText)}
          </pre>
        </div>
      )}
    </div>
  );
};
