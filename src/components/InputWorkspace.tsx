import React, { useRef, useEffect } from 'react';
import { TaskType, SensitiveEntity } from '../types';
import { Terminal, Braces, Sparkles, Shield, Play, RotateCcw, Crosshair, X } from 'lucide-react';

interface InputWorkspaceProps {
  taskType: TaskType;
  onTaskTypeChange: (type: TaskType) => void;
  inputText: string;
  onInputChange: (text: string) => void;
  onRunLocalTask: () => void;
  isLoadingLocal: boolean;
  detectedCount: number;
  highlightedEntity?: SensitiveEntity | null;
  onClearHighlight?: () => void;
}

export const InputWorkspace: React.FC<InputWorkspaceProps> = ({
  taskType,
  onTaskTypeChange,
  inputText,
  onInputChange,
  onRunLocalTask,
  isLoadingLocal,
  detectedCount,
  highlightedEntity,
  onClearHighlight
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineCount = inputText ? inputText.split('\n').length : 0;
  const charCount = inputText.length;

  // Auto-locate, highlight and scroll to selected entity in textarea dynamically
  useEffect(() => {
    if (highlightedEntity && textareaRef.current) {
      const ta = textareaRef.current;
      const raw = highlightedEntity.raw;

      // Dynamically locate the entity in current text (in case user edited text)
      let start = -1;
      let end = -1;

      if (raw && inputText.includes(raw)) {
        start = inputText.indexOf(raw);
        end = start + raw.length;
      } else if (
        highlightedEntity.startIndex >= 0 &&
        highlightedEntity.endIndex <= inputText.length &&
        inputText.substring(highlightedEntity.startIndex, highlightedEntity.endIndex) === raw
      ) {
        start = highlightedEntity.startIndex;
        end = highlightedEntity.endIndex;
      }

      // If entity was removed from text, do not highlight arbitrary code!
      if (start === -1 || end === -1) {
        return;
      }

      ta.focus();
      ta.setSelectionRange(start, end);

      // Compute exact line number of the target secret
      const textBefore = inputText.substring(0, start);
      const lineNumber = textBefore.split('\n').length - 1; // 0-indexed line number

      // Get computed line-height (text-xs leading-relaxed is ~19.5px)
      const computedStyle = window.getComputedStyle(ta);
      const parsedLineHeight = parseFloat(computedStyle.lineHeight);
      const lineHeight = isNaN(parsedLineHeight) || parsedLineHeight <= 0 ? 19.5 : parsedLineHeight;

      // Smoothly center the target line inside the textarea
      const targetScrollTop = Math.max(
        0,
        lineNumber * lineHeight - ta.clientHeight / 2 + lineHeight
      );

      ta.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      });

      // Also ensure the textarea is within the browser window's view
      ta.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [highlightedEntity, inputText]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd + Enter or Ctrl + Enter to run local task
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!isLoadingLocal && inputText.trim()) {
        onRunLocalTask();
      }
    }
  };

  return (
    <div className="flex flex-col bg-zinc-900/50 rounded-xl border border-zinc-800/80 overflow-hidden shadow-xl">
      {/* Tab Navigation Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950/60 px-3 py-2 gap-2">
        <div className="flex items-center space-x-1 shrink-0 overflow-x-auto">
          <button
            onClick={() => onTaskTypeChange('log-explainer')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all shrink-0 whitespace-nowrap ${
              taskType === 'log-explainer'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Log Explainer</span>
          </button>

          <button
            onClick={() => onTaskTypeChange('json-to-interface')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all shrink-0 whitespace-nowrap ${
              taskType === 'json-to-interface'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Braces className="w-3.5 h-3.5 text-sky-400" />
            <span>JSON to Model</span>
          </button>

          <button
            onClick={() => onTaskTypeChange('quick-scratchpad')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all shrink-0 whitespace-nowrap ${
              taskType === 'quick-scratchpad'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/60'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Scratchpad</span>
          </button>
        </div>

        {/* Real-time pre-scan warning */}
        {detectedCount > 0 && (
          <div className="shrink-0 whitespace-nowrap flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-mono bg-rose-500/10 border border-rose-500/30 text-rose-400 animate-pulse">
            <Shield className="w-3 h-3 text-rose-400" />
            <span>{detectedCount} {detectedCount === 1 ? 'secret' : 'secrets'} detected</span>
          </div>
        )}
      </div>

      {/* Code Input Area */}
      <div className="relative flex flex-col p-3 bg-zinc-950/70">
        {/* Active Inspection Banner */}
        {highlightedEntity && (
          <div className="mb-2 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-rose-950/40 border border-rose-900/50 text-xs font-mono text-rose-300 animate-in fade-in duration-200">
            <span className="flex items-center space-x-1.5 min-w-0">
              <Crosshair className="w-3.5 h-3.5 text-rose-400 shrink-0 animate-pulse" />
              <span className="truncate">
                Locating: <strong className="text-rose-200">{highlightedEntity.masked}</strong> ({highlightedEntity.type})
              </span>
            </span>
            <button
              onClick={onClearHighlight}
              className="shrink-0 ml-2 text-zinc-400 hover:text-zinc-200 text-[10px] flex items-center space-x-0.5 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 cursor-pointer transition-colors"
              title="Clear selection"
            >
              <X className="w-3 h-3 mr-0.5" />
              <span>Dismiss</span>
            </button>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            taskType === 'log-explainer'
              ? 'Paste raw stack traces or logs containing sensitive credentials (API keys, DB passwords, JWT tokens, internal IPs)...'
              : taskType === 'json-to-interface'
              ? 'Paste raw API JSON payloads with PII (names, emails, credentials) to sanitize and generate type-safe TypeScript interfaces on-device...'
              : 'Paste any sensitive snippets, environment configs, or developer notes for on-device zero-leakage isolation...'
          }
          className={`w-full h-80 sm:h-96 min-h-[260px] max-h-[520px] bg-transparent resize-y font-mono text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none leading-relaxed transition-all ${
            highlightedEntity ? 'selection:bg-rose-500/60 selection:text-white' : ''
          }`}
          spellCheck={false}
        />

        {/* Input Stats & Action Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80 mt-2 text-xs font-mono text-zinc-500 gap-2">
          <div className="shrink-0 flex items-center space-x-3">
            <span>{lineCount} {lineCount === 1 ? 'line' : 'lines'}</span>
            <span>{charCount} chars</span>
            <button
              onClick={() => onInputChange('')}
              className="hover:text-zinc-300 transition-colors flex items-center space-x-1"
              title="Clear input"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>

          <div className="shrink-0 flex items-center space-x-2.5">
            <span className="hidden sm:inline-flex items-center space-x-1 text-[11px] text-zinc-500 whitespace-nowrap">
              <span>Press</span>
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700/80 text-zinc-300 text-[10px]">⌘+Enter</kbd>
            </span>
            <button
              onClick={onRunLocalTask}
              disabled={isLoadingLocal || !inputText.trim()}
              className="shrink-0 whitespace-nowrap flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-semibold text-xs font-mono transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
            >
              {isLoadingLocal ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                  <span>Sanitizing...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-zinc-950" />
                  <span>Sanitize & Run</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
