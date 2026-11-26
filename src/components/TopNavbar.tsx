import React from 'react';
import { Shield, Cpu, Cloud, CheckCircle2, Zap } from 'lucide-react';
import { NanoCapabilities } from '../types';
import { isFirebaseConfigured } from '../config/firebase';

interface TopNavbarProps {
  nanoCapabilities: NanoCapabilities;
  preferredEngine: 'nano' | 'fast';
  onToggleEngine: (engine: 'nano' | 'fast') => void;
  onOpenConfigModal: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  nanoCapabilities,
  preferredEngine,
  onToggleEngine,
  onOpenConfigModal
}) => {
  const firebaseReady = isFirebaseConfigured();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Left: Branding */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-400 p-[1px] flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <div className="w-full h-full bg-zinc-950 rounded-[7px] flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-semibold tracking-tight text-zinc-100 font-sans">
                LocalVault <span className="text-emerald-400 font-mono text-sm">Dev</span>
              </h1>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                #BuildHybridAI 2026
              </span>
            </div>
            <p className="text-xs text-zinc-400 hidden sm:block">
              On-Device Privacy Firewall & Hybrid AI Debugger
            </p>
          </div>
        </div>

        {/* Right: Engine Badges & Status */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* Dual Engine Mode Switcher (When Gemini Nano is available) */}
          {nanoCapabilities.status === 'readily' ? (
            <div className="flex items-center bg-zinc-900/90 p-0.5 rounded-full border border-zinc-800 text-xs font-mono shrink-0">
              <button
                onClick={() => onToggleEngine('nano')}
                className={`px-2.5 py-1 rounded-full transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                  preferredEngine === 'nano'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                    : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
                title="Ready: Hardware-accelerated Chrome Gemini Nano on-device streaming inference"
              >
                <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-medium">Gemini Nano</span>
              </button>
              <button
                onClick={() => onToggleEngine('fast')}
                className={`px-2.5 py-1 rounded-full transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                  preferredEngine === 'fast'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                    : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
                title="Ultra-fast mode: On-device 5ms AST rule engine for instant type generation and triage"
              >
                <Zap className="w-3 h-3 text-amber-400" />
                <span className="font-medium">Fast 5ms</span>
              </button>
            </div>
          ) : (
            /* Fallback badge when Nano is still downloading or not enabled */
            <div
              className={`shrink-0 flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-mono border transition-all whitespace-nowrap ${
                nanoCapabilities.status === 'after-download'
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300'
              }`}
              title={nanoCapabilities.details}
            >
              <Cpu className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="font-medium">
                {nanoCapabilities.status === 'after-download'
                  ? '⏳ Downloading Nano...'
                  : '⚡ On-device (Local Engine)'}
              </span>
            </div>
          )}

          {/* Cloud Model Status Badge */}
          <div
            onClick={onOpenConfigModal}
            className={`cursor-pointer shrink-0 flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-mono border transition-all whitespace-nowrap ${
              firebaseReady
                ? 'bg-sky-500/10 border-sky-500/30 text-sky-400 hover:bg-sky-500/20'
                : 'bg-zinc-900/90 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
            }`}
            title={firebaseReady ? 'Firebase AI Logic Connected (Gemini 3.5 Flash Lite)' : 'Click to inspect Firebase SDK credentials'}
          >
            <Cloud className="w-3.5 h-3.5 text-sky-400" />
            <span>Firebase Setup</span>
          </div>

          {/* 0-Leakage Safe Guard Badge */}
          <div className="hidden lg:flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-mono bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 shrink-0 whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>0-Leakage Guard</span>
          </div>
        </div>
      </div>
    </header>
  );
};
