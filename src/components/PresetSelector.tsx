import React from 'react';
import { PRESET_DEMOS } from '../data/presets';
import { PresetDemo } from '../types';
import { Terminal, KeyRound, ShieldAlert, Sparkles, CreditCard } from 'lucide-react';

interface PresetSelectorProps {
  onSelectPreset: (preset: PresetDemo) => void;
  activePresetId?: string;
}

export const PresetSelector: React.FC<PresetSelectorProps> = ({ onSelectPreset, activePresetId }) => {
  return (
    <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 py-2.5 border-b border-zinc-800/60 bg-zinc-950/40 px-4 sm:px-6">
      <div className="flex items-center space-x-2 text-xs text-zinc-400 font-mono shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        <span className="font-medium text-zinc-300">Quick Demos:</span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
        {PRESET_DEMOS.map((preset) => {
          const isSelected = activePresetId === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset)}
              className={`group shrink-0 flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all border whitespace-nowrap cursor-pointer ${
                isSelected
                  ? 'bg-zinc-800 text-emerald-400 border-emerald-500/40 shadow-sm'
                  : 'bg-zinc-900/80 text-zinc-300 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80 hover:text-zinc-100'
              }`}
            >
              {preset.id === 'leaked-api-key-log' && <KeyRound className="w-3.5 h-3.5 text-rose-400" />}
              {preset.id === 'user-pii-json' && <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />}
              {preset.id === 'db-connection-crash' && <Terminal className="w-3.5 h-3.5 text-purple-400" />}
              {preset.id === 'payment-cicd-leak' && <CreditCard className="w-3.5 h-3.5 text-sky-400" />}
              <span className="font-medium">{preset.title}</span>
              <span className="text-[10px] text-zinc-500 group-hover:text-zinc-400">
                ({preset.badge})
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
