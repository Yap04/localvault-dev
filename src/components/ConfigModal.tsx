import React, { useState, useEffect } from 'react';
import { X, Key, Cloud, Check, Terminal } from 'lucide-react';
import { getFirebaseRuntimeStatus } from '../config/firebase';
import { NanoCapabilities } from '../types';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  nanoCapabilities: NanoCapabilities;
}

type ModuleState = 'active' | 'pending' | 'inactive';

export const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose, nanoCapabilities }) => {
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [runtime, setRuntime] = useState(() => getFirebaseRuntimeStatus());

  useEffect(() => {
    if (!isOpen) return;
    setRuntime(getFirebaseRuntimeStatus());
    const timer = setInterval(() => {
      setRuntime(getFirebaseRuntimeStatus());
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const isConfigured = runtime.isConfigured;

  const envTemplate = `# LocalVault Dev - Firebase Configuration (.env)
VITE_FIREBASE_API_KEY=AIzaSyYourActualApiKeyHere
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Firebase App Check (reCAPTCHA Enterprise Site Key for Hosting & Local Debug Token)
VITE_RECAPTCHA_ENTERPRISE_SITE_KEY=your-recaptcha-enterprise-site-key
VITE_FIREBASE_APPCHECK_DEBUG_TOKEN=true`;

  const appCheckModuleState: ModuleState =
    runtime.appCheckStatus === 'attested'
      ? 'active'
      : runtime.appCheckStatus === 'initialized' || runtime.appCheckStatus === 'pending'
        ? 'pending'
        : 'inactive';

  const appCheckLabel =
    runtime.appCheckStatus === 'attested'
      ? 'Firebase App Check (Attested)'
      : runtime.appCheckStatus === 'pending'
        ? 'Firebase App Check (Pending Token)'
        : runtime.appCheckStatus === 'initialized'
          ? 'Firebase App Check (Verifying...)'
          : 'Firebase App Check (Not Configured)';

  const nanoModuleState: ModuleState =
    nanoCapabilities.status === 'readily'
      ? 'active'
      : nanoCapabilities.status === 'after-download'
        ? 'pending'
        : 'inactive';

  const nanoLabel =
    nanoCapabilities.status === 'readily'
      ? 'Chrome Gemini Nano (Active)'
      : nanoCapabilities.status === 'after-download'
        ? 'Chrome Gemini Nano (Downloading)'
        : 'Chrome Gemini Nano (Fallback 5ms)';

  const aiLogicModuleState: ModuleState = runtime.aiLogicReady ? 'active' : 'inactive';
  const aiLogicLabel = runtime.aiLogicReady
    ? 'Firebase AI Logic (GoogleAIBackend)'
    : 'Firebase AI Logic (Offline Fallback)';

  const modules: { label: string; state: ModuleState }[] = [
    { label: appCheckLabel, state: appCheckModuleState },
    { label: nanoLabel, state: nanoModuleState },
    { label: aiLogicLabel, state: aiLogicModuleState },
    { label: 'Local 0-Leakage Guard Barrier', state: 'active' }
  ];

  const copyEnv = () => {
    navigator.clipboard.writeText(envTemplate);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 font-sans">
                Firebase & Hybrid AI Configuration
              </h3>
              <p className="text-xs text-zinc-400">
                Firebase SDK · App Check Debug Provider · Firebase AI Logic (Gemini 3.5 Flash Lite)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Indicator Banner */}
        <div className="my-4 p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-start space-x-3">
          <div className="mt-0.5">
            {isConfigured ? (
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            ) : (
              <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
            )}
          </div>
          <div className="text-xs space-y-1">
            <div className="font-semibold text-zinc-200 flex items-center space-x-2">
              <span>{isConfigured ? 'Connected to Live Firebase Project' : 'Running in Local Sandbox Demo Mode'}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                {isConfigured ? 'Live Firebase AI' : 'Mock Hybrid Fallback'}
              </span>
            </div>
            <p className="text-zinc-400 leading-relaxed text-[11px]">
              {isConfigured
                ? 'All cloud deep analysis requests directly invoke Firebase AI Logic with App Check attestation and GoogleAIBackend.'
                : 'The application runs with full on-device sanitization, Gemini Nano detection, and local defense shield out-of-the-box. To connect your live cloud instance, verify credentials in .env.'}
            </p>
          </div>
        </div>

        {/* Architecture Checklist */}
        <div className="space-y-2 mb-4">
          <div className="text-xs font-semibold text-zinc-300 font-mono flex items-center space-x-1.5">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>Configured Hybrid AI Architecture Modules:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            {modules.map(({ label, state }) => {
              const badgeStyle =
                state === 'active'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : state === 'pending'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-zinc-800 text-zinc-500';
              const icon = state === 'active' ? '✓' : state === 'pending' ? '⋯' : '—';
              return (
                <div
                  key={label}
                  className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/60 flex items-center space-x-2 text-zinc-300"
                >
                  <span
                    className={`w-4 h-4 shrink-0 rounded flex items-center justify-center text-[10px] font-bold ${badgeStyle}`}
                  >
                    {icon}
                  </span>
                  <span className="truncate">{label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Env file copy section */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-mono text-zinc-400">
              Configuration Template (.env):
            </span>
            <button
              onClick={copyEnv}
              className="text-xs font-mono text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
            >
              {copiedEnv ? <Check className="w-3 h-3" /> : <Key className="w-3 h-3" />}
              <span>{copiedEnv ? 'Copied to Clipboard' : 'Copy .env Template'}</span>
            </button>
          </div>
          <pre className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] font-mono text-zinc-400 overflow-x-auto max-h-36 leading-relaxed">
            {envTemplate}
          </pre>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
