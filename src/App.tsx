import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TaskType, LocalTaskResult, CloudAnalysisResult, PresetDemo, NanoCapabilities, SensitiveEntity } from './types';
import { PRESET_DEMOS } from './data/presets';
import { AIService } from './services/aiService';
import { ChromePromptApi } from './services/chromePromptApi';
import { LocalSanitizer } from './services/sanitizer';
import { initFirebase } from './config/firebase';
import { TopNavbar } from './components/TopNavbar';
import { PresetSelector } from './components/PresetSelector';
import { InputWorkspace } from './components/InputWorkspace';
import { ResultWorkspace } from './components/ResultWorkspace';
import { ConfigModal } from './components/ConfigModal';

export const App: React.FC = () => {
  const [taskType, setTaskType] = useState<TaskType>('log-explainer');
  const [inputText, setInputText] = useState<string>(PRESET_DEMOS[0].content);
  const [activePresetId, setActivePresetId] = useState<string | undefined>(PRESET_DEMOS[0].id);

  const [localResult, setLocalResult] = useState<LocalTaskResult | null>(null);
  const [cloudResult, setCloudResult] = useState<CloudAnalysisResult | null>(null);
  const [highlightedEntity, setHighlightedEntity] = useState<SensitiveEntity | null>(null);

  const [isLoadingLocal, setIsLoadingLocal] = useState<boolean>(false);
  const [isStreamingLocal, setIsStreamingLocal] = useState<boolean>(false);
  const [isLoadingCloud, setIsLoadingCloud] = useState<boolean>(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);

  // Execution version tokens to cancel stale async inferences when user switches demos
  const localExecutionIdRef = useRef<number>(0);
  const cloudExecutionIdRef = useRef<number>(0);

  // Dual-Mode Switcher ('nano' | 'fast')
  const [preferredEngine, setPreferredEngine] = useState<'nano' | 'fast'>('nano');

  const [nanoCapabilities, setNanoCapabilities] = useState<NanoCapabilities>({
    supported: false,
    status: 'unsupported-browser',
    details: 'Detecting Chrome Gemini Nano on-device capabilities...'
  });

  // Initialize Firebase App Check & pre-warm Chrome Gemini Nano silently on mount
  useEffect(() => {
    // 1. Immediately initialize Firebase & App Check Debug Provider on startup
    initFirebase();

    // 2. Pre-warm Chrome Gemini Nano session silently in background
    ChromePromptApi.checkCapabilities().then((cap) => {
      setNanoCapabilities(cap);
      if (cap.status === 'readily' || cap.status === 'after-download') {
        ChromePromptApi.prewarm();
      }
    });
  }, []);

  // Real-time pre-detection of sensitive items
  const detectedSensitiveCount = useMemo(() => {
    if (!inputText) return 0;
    const res = LocalSanitizer.sanitize(inputText);
    return res.sensitiveCount;
  }, [inputText]);

  // Handle Preset Selection (Cancels any in-flight background task)
  const handleSelectPreset = (preset: PresetDemo) => {
    localExecutionIdRef.current++;
    cloudExecutionIdRef.current++;
    setIsLoadingLocal(false);
    setIsStreamingLocal(false);
    setIsLoadingCloud(false);
    setActivePresetId(preset.id);
    setTaskType(preset.taskType);
    setInputText(preset.content);
    setLocalResult(null);
    setCloudResult(null);
    setHighlightedEntity(null);
  };

  // Handle Tab Switch (Cancels any in-flight background task)
  const handleTaskTypeChange = (type: TaskType) => {
    localExecutionIdRef.current++;
    cloudExecutionIdRef.current++;
    setIsLoadingLocal(false);
    setIsStreamingLocal(false);
    setIsLoadingCloud(false);
    setTaskType(type);
    setLocalResult(null);
    setCloudResult(null);
    setHighlightedEntity(null);
  };

  // Handle Text Change
  const handleInputChange = (text: string) => {
    setInputText(text);
    setActivePresetId(undefined); // user custom edit

    if (!text.trim()) {
      localExecutionIdRef.current++;
      cloudExecutionIdRef.current++;
      setIsLoadingLocal(false);
      setIsStreamingLocal(false);
      setIsLoadingCloud(false);
      setLocalResult(null);
      setCloudResult(null);
      setHighlightedEntity(null);
      return;
    }

    // Real-time synchronization:
    // If localResult is present, update the quarantined entities and sanitized buffer to match remaining content
    if (localResult) {
      const liveSanitization = LocalSanitizer.sanitize(text);
      setLocalResult((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sanitizedText: liveSanitization.sanitizedText,
          entities: liveSanitization.entities
        };
      });

      // If the currently highlighted entity was deleted, clear the locating banner
      if (highlightedEntity && !text.includes(highlightedEntity.raw)) {
        setHighlightedEntity(null);
      }
    }
  };

  // Run On-Device Local Task (Progressive UX + Live Streaming with Version Token)
  const handleRunLocalTask = async () => {
    if (!inputText.trim()) return;
    const currentExecId = ++localExecutionIdRef.current;
    setIsLoadingLocal(true);
    setCloudResult(null);

    // Instant progressive response: Render sanitized buffer & Diff in <1ms!
    const sanitization = LocalSanitizer.sanitize(inputText);
    const isUsingNano = preferredEngine === 'nano' && nanoCapabilities.status === 'readily';

    setLocalResult({
      sanitizedText: sanitization.sanitizedText,
      localExplanation: undefined,
      tsInterface: undefined,
      engine: isUsingNano ? 'on-device' : 'heuristic-local',
      modelName: isUsingNano ? 'Chrome Gemini Nano' : 'Local Fast Engine',
      executionTimeMs: 1,
      entities: sanitization.entities
    });
    setIsStreamingLocal(true);

    try {
      const startTime = performance.now();
      const result = await AIService.runLocalTask(taskType, inputText, {
        preferEngine: preferredEngine,
        onStreamChunk: (chunkText) => {
          // Stream chunks directly to the UI only if this task is still active
          if (localExecutionIdRef.current !== currentExecId) return;
          setLocalResult((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              localExplanation: taskType !== 'json-to-interface' ? chunkText : undefined,
              tsInterface: taskType === 'json-to-interface' ? chunkText : undefined
            };
          });
        }
      });

      // Discard stale execution if user switched demo in the middle
      if (localExecutionIdRef.current !== currentExecId) return;

      const duration = Math.round(performance.now() - startTime);
      setLocalResult({
        ...result,
        executionTimeMs: duration
      });
    } catch (err: any) {
      if (localExecutionIdRef.current !== currentExecId) return;
      alert(`On-device execution error: ${err?.message || err}`);
    } finally {
      if (localExecutionIdRef.current === currentExecId) {
        setIsLoadingLocal(false);
        setIsStreamingLocal(false);
      }
    }
  };

  // Run Cloud Deep Analysis (with Version Token)
  const handleRunCloudAnalysis = async () => {
    if (!localResult) return;
    const currentCloudId = ++cloudExecutionIdRef.current;
    setIsLoadingCloud(true);

    try {
      const result = await AIService.runCloudDeepAnalysis(
        localResult.sanitizedText,
        taskType,
        localResult.entities
      );
      if (cloudExecutionIdRef.current !== currentCloudId) return;
      setCloudResult(result);
    } catch (err: any) {
      if (cloudExecutionIdRef.current !== currentCloudId) return;
      alert(`Cloud deep analysis error: ${err?.message || err}`);
    } finally {
      if (cloudExecutionIdRef.current === currentCloudId) {
        setIsLoadingCloud(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Top Navigation */}
      <TopNavbar
        nanoCapabilities={nanoCapabilities}
        preferredEngine={preferredEngine}
        onToggleEngine={setPreferredEngine}
        onOpenConfigModal={() => setIsConfigModalOpen(true)}
      />

      {/* Preset Quick Demo Selector */}
      <PresetSelector
        onSelectPreset={handleSelectPreset}
        activePresetId={activePresetId}
      />

      {/* Main Split Workbench */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Input Workbench (Sticky) */}
        <section className="lg:sticky lg:top-20 z-10">
          <InputWorkspace
            taskType={taskType}
            onTaskTypeChange={handleTaskTypeChange}
            inputText={inputText}
            onInputChange={handleInputChange}
            onRunLocalTask={handleRunLocalTask}
            isLoadingLocal={isLoadingLocal}
            detectedCount={detectedSensitiveCount}
            highlightedEntity={highlightedEntity}
            onClearHighlight={() => setHighlightedEntity(null)}
          />
        </section>

        {/* Right Column: Redaction & Hybrid AI Results */}
        <section className={`min-w-0 ${!localResult ? 'self-stretch flex flex-col' : ''}`}>
          <ResultWorkspace
            taskType={taskType}
            originalInput={inputText}
            localResult={localResult}
            cloudResult={cloudResult}
            isLoadingCloud={isLoadingCloud}
            isStreamingLocal={isStreamingLocal}
            onRunCloudAnalysis={handleRunCloudAnalysis}
            highlightedEntity={highlightedEntity}
            onSelectEntity={setHighlightedEntity}
          />
        </section>
      </main>

      {/* Footer Meta */}
      <footer className="w-full border-t border-zinc-900 py-3 px-6 text-center text-xs text-zinc-400 font-mono flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span>LocalVault Dev: On-Device Privacy Firewall + Firebase Hybrid AI</span>
        </div>
      </footer>

      {/* Config & App Check Debug Modal */}
      <ConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        nanoCapabilities={nanoCapabilities}
      />
    </div>
  );
};

export default App;
