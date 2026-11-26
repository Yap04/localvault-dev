import React, { useState } from 'react';
import {
  LocalTaskResult,
  CloudAnalysisResult,
  TaskType,
  SensitiveEntity
} from '../types';
import { DiffViewer } from './DiffViewer';
import {
  Cpu,
  Cloud,
  ShieldCheck,
  ArrowRight,
  Check,
  Copy,
  FileCode2,
  Terminal,
  Lock
} from 'lucide-react';

interface ResultWorkspaceProps {
  taskType: TaskType;
  originalInput: string;
  localResult: LocalTaskResult | null;
  cloudResult: CloudAnalysisResult | null;
  isLoadingCloud: boolean;
  isStreamingLocal?: boolean;
  onRunCloudAnalysis: () => void;
  highlightedEntity?: SensitiveEntity | null;
  onSelectEntity?: (entity: SensitiveEntity | null) => void;
}

export const ResultWorkspace: React.FC<ResultWorkspaceProps> = ({
  taskType: _taskType,
  originalInput,
  localResult,
  cloudResult,
  isLoadingCloud,
  isStreamingLocal = false,
  onRunCloudAnalysis,
  highlightedEntity,
  onSelectEntity
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedSanitized, setCopiedSanitized] = useState(false);

  const handleCopy = (text: string, type: 'code' | 'sanitized') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedSanitized(true);
      setTimeout(() => setCopiedSanitized(false), 2000);
    }
  };

  // If local task hasn't executed yet
  if (!localResult) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 min-h-[460px] sm:min-h-[508px] bg-zinc-900/40 rounded-xl border border-zinc-800/80 p-8 text-center shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-zinc-800/60 border border-zinc-700/60 flex items-center justify-center mb-4 text-emerald-400">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-200 font-sans mb-1">
          On-Device Privacy Firewall Standing By
        </h3>
        <p className="text-xs text-zinc-400 max-w-sm mb-4 leading-relaxed font-sans">
          Paste raw logs on the left or pick a demo above. Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-mono text-[10px]">⌘ + Enter</kbd> to trigger on-device redaction and local triage.
        </p>
        <div className="flex items-center space-x-2 text-[11px] font-mono text-zinc-500">
          <span>⚡ Chrome Gemini Nano Ready</span>
          <span>•</span>
          <span>🔒 0-Leakage Egress Guarantee</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4">
      {/* 1. On-device Local Result Box */}
      <div className="bg-zinc-900/60 rounded-xl border border-emerald-500/20 p-4 shadow-lg">
        {/* Engine Header */}
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between pb-3 border-b border-zinc-800/80 mb-3 gap-2">
          <div className="flex items-center space-x-2 shrink-0">
            <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
              <Cpu className="w-3.5 h-3.5" />
              <span>{localResult.engine === 'on-device' ? 'On-Device Engine' : 'Local Heuristic'}</span>
            </span>
            <span className="text-xs font-mono text-zinc-400 whitespace-nowrap">
              {localResult.modelName}
            </span>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono text-zinc-400 shrink-0">
            <span className="whitespace-nowrap">Latency: <strong className="text-emerald-400 font-semibold">{localResult.executionTimeMs}ms</strong></span>
            <button
              onClick={() => handleCopy(localResult.sanitizedText, 'sanitized')}
              className="flex items-center space-x-1 text-zinc-400 hover:text-zinc-200 transition-colors whitespace-nowrap cursor-pointer"
              title="Copy sanitized text"
            >
              {copiedSanitized ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSanitized ? 'Copied' : 'Copy Sanitized'}</span>
            </button>
          </div>
        </div>

        {/* Diff & Entities View */}
        <DiffViewer
          originalText={originalInput}
          sanitizedText={localResult.sanitizedText}
          entities={localResult.entities}
          highlightedEntity={highlightedEntity}
          onSelectEntity={onSelectEntity}
        />

        {/* Task Specific Local Output (Interface or Log Explanation) */}
        {localResult.tsInterface ? (
          <div className="mt-3 rounded-lg border border-sky-900/40 bg-zinc-950/90 overflow-hidden">
            <div className="px-3 py-1.5 bg-sky-950/30 border-b border-sky-900/30 flex items-center justify-between text-[11px] text-sky-300 font-mono">
              <span className="flex items-center">
                <FileCode2 className="w-3.5 h-3.5 mr-1 text-sky-400" />
                On-Device Auto-Generated TypeScript Interfaces
              </span>
              <button
                onClick={() => handleCopy(localResult.tsInterface!, 'code')}
                className="hover:text-zinc-100 flex items-center space-x-1"
              >
                {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCode ? 'Copied TS' : 'Copy Types'}</span>
              </button>
            </div>
            <pre className="p-3 text-xs font-mono text-sky-200 overflow-x-auto leading-relaxed">
              {localResult.tsInterface}
              {isStreamingLocal && <span className="inline-block w-2 h-3.5 ml-1 bg-sky-400 animate-pulse align-middle" />}
            </pre>
          </div>
        ) : localResult.localExplanation ? (
          <div className="mt-3 p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed">
            {localResult.localExplanation}
            {isStreamingLocal && <span className="inline-block w-2 h-3.5 ml-1 bg-emerald-400 animate-pulse align-middle" />}
          </div>
        ) : isStreamingLocal ? (
          <div className="mt-3 p-3 rounded-lg bg-zinc-950/80 border border-emerald-500/20 text-xs font-mono text-emerald-400 flex items-center space-x-2.5 animate-pulse">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>⚡ Gemini Nano is streaming on-device hardware inference...</span>
          </div>
        ) : null}
      </div>

      {/* 2. Privacy Checkpoint & Cloud Dispatch Gate */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-zinc-900/60 to-sky-950/40 border border-emerald-500/30 flex flex-col xl:flex-row xl:items-center justify-between gap-3.5 shadow-lg">
        <div className="flex items-start sm:items-center space-x-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4.5 h-4.5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2 whitespace-nowrap">
              <span className="text-xs font-semibold text-zinc-100 font-sans tracking-tight">
                0-Leakage Privacy Gate
              </span>
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                VERIFIED SAFE
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-sans mt-0.5 leading-relaxed">
              Quarantined {localResult.entities.length} local {localResult.entities.length === 1 ? 'secret' : 'secrets'}. Only sanitized scalar tokens egress to Cloud Gemini.
            </p>
          </div>
        </div>

        <button
          onClick={onRunCloudAnalysis}
          disabled={isLoadingCloud}
          className="w-full xl:w-[250px] shrink-0 whitespace-nowrap flex items-center justify-center space-x-2 px-3.5 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-60 text-zinc-950 font-semibold text-xs font-mono transition-all shadow-md shadow-sky-500/20 active:scale-95 cursor-pointer"
        >
          {isLoadingCloud ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin shrink-0" />
              <span>Cloud Reasoning...</span>
            </>
          ) : (
            <>
              <Cloud className="w-4 h-4 fill-zinc-950 shrink-0" />
              <span>Send to Cloud Reasoning</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </>
          )}
        </button>
      </div>

      {/* 3. Cloud Deep Reasoning Output Box */}
      {cloudResult && (
        <div className="bg-zinc-900/60 rounded-xl border border-sky-500/30 p-4 shadow-xl animate-in fade-in duration-300">
          {/* Cloud Badge Header */}
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between pb-3 border-b border-zinc-800/80 mb-3 gap-2">
            <div className="flex items-center space-x-2 shrink-0">
              <span className="flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-sky-500/10 text-sky-400 border border-sky-500/30 whitespace-nowrap">
                <Cloud className="w-3.5 h-3.5" />
                <span>Cloud Engine</span>
              </span>
              <span className="text-xs font-mono text-zinc-300 font-medium whitespace-nowrap">
                {cloudResult.modelName}
              </span>
            </div>

            <div className="text-xs font-mono text-zinc-400 shrink-0 whitespace-nowrap">
              Latency: <strong className="text-sky-400 font-semibold">{cloudResult.executionTimeMs}ms</strong>
            </div>
          </div>

          {/* Root Cause */}
          <div className="mb-3.5">
            <h4 className="text-xs font-semibold text-zinc-300 font-sans mb-1 flex items-center space-x-1.5">
              <Terminal className="w-3.5 h-3.5 text-sky-400" />
              <span>Root Cause Analysis</span>
            </h4>
            <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80 text-xs text-zinc-300 leading-relaxed font-sans">
              {cloudResult.rootCause}
            </div>
          </div>

          {/* Fix Suggestions */}
          <div className="mb-3.5">
            <h4 className="text-xs font-semibold text-zinc-300 font-sans mb-1.5 flex items-center space-x-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Actionable Remediation & Fixes</span>
            </h4>
            <div className="space-y-1.5">
              {cloudResult.fixSuggestions.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start space-x-2 p-2 rounded-lg bg-zinc-950/50 border border-zinc-800/60 text-xs text-zinc-300 leading-relaxed"
                >
                  <span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Security Advisory */}
          {cloudResult.securityAdvisory && (
            <div className="mb-3.5 p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-300 flex items-start space-x-2">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block mb-0.5">Firewall Security Advisory</strong>
                <p className="text-zinc-300 text-[11px]">{cloudResult.securityAdvisory}</p>
              </div>
            </div>
          )}

          {/* Recommended Code Snippet */}
          {cloudResult.codeSnippet && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-zinc-300 font-sans flex items-center space-x-1.5">
                  <FileCode2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>Defensive Mitigation & Guard Code</span>
                </span>
                <button
                  onClick={() => handleCopy(cloudResult.codeSnippet!, 'code')}
                  className="text-[11px] font-mono text-zinc-400 hover:text-zinc-100 flex items-center space-x-1"
                >
                  {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                </button>
              </div>
              <pre className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed">
                {cloudResult.codeSnippet}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
