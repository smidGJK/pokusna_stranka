import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { RouteConfig, Stop } from '../types';
import { TransferBadges } from './TransferBadges';
import { transitAudio } from '../utils/audio';
import { reverseRoute } from '../utils/routeUtils';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  Settings,
  Maximize2,
  Minimize2,
  ChevronRight,
  ChevronLeft,
  Play,
  Pause,
  Megaphone,
  ArrowLeftRight,
} from 'lucide-react';

interface Props {
  route: RouteConfig;
  onEditRoute: () => void;
  onRouteChange?: (newRoute: RouteConfig) => void;
}

export const PidDisplay: React.FC<Props> = ({ route, onEditRoute, onRouteChange }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState<number | null>(null); // null or interval in seconds
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [currentTimeStr, setCurrentTimeStr] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<number | null>(null);

  // Sync audio manager settings
  useEffect(() => {
    transitAudio.soundEnabled = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    transitAudio.voiceEnabled = voiceEnabled;
  }, [voiceEnabled]);

  // Real-time clock update (HH:MM)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      setCurrentTimeStr(`${hours}:${mins}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const totalStops = route.stops.length;
  const terminusIndex = totalStops - 1;
  const terminusStop = route.stops[terminusIndex];

  // Calculate cumulative times from current stop
  // For any stop i >= currentIndex, cumulative time = sum_{k=currentIndex}^{i} stops[k].minutes
  const getCumulativeMinutes = useCallback(
    (targetIndex: number) => {
      if (targetIndex < currentIndex) return 0;
      let total = 0;
      for (let k = currentIndex; k <= targetIndex; k++) {
        total += route.stops[k]?.minutes ?? 1;
      }
      return total;
    },
    [currentIndex, route.stops]
  );

  // Advance to next stop
  const advanceStop = useCallback(() => {
    if (currentIndex < terminusIndex) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      transitAudio.playChime();
      const nextStop = route.stops[nextIdx];
      const isLast = nextIdx === terminusIndex;
      transitAudio.announceStop(nextStop.name, isLast, nextStop.transfers || []);
    } else {
      // Loop or stay at terminus
      transitAudio.playChime();
    }
  }, [currentIndex, terminusIndex, route.stops]);

  // Previous stop
  const prevStop = useCallback(() => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      transitAudio.playChime();
    }
  }, [currentIndex]);

  // Reset to first stop
  const resetRoute = useCallback(() => {
    setCurrentIndex(0);
    transitAudio.playChime();
    if (route.stops[0]) {
      transitAudio.announceStop(route.stops[0].name, false, route.stops[0].transfers || []);
    }
  }, [route.stops]);

  // Reverse route order for return journey
  const handleReverseTrip = useCallback(() => {
    const reversed = reverseRoute(route);
    if (onRouteChange) {
      onRouteChange(reversed);
    }
    setCurrentIndex(0);
    transitAudio.playChime();
    if (reversed.stops[0]) {
      transitAudio.announceStop(reversed.stops[0].name, false, reversed.stops[0].transfers || []);
    }
  }, [route, onRouteChange]);

  // Auto-advance timer
  useEffect(() => {
    if (!autoAdvance) return;
    const timer = setInterval(() => {
      if (currentIndex < terminusIndex) {
        advanceStop();
      } else {
        setAutoAdvance(null);
      }
    }, autoAdvance * 1000);
    return () => clearInterval(timer);
  }, [autoAdvance, currentIndex, terminusIndex, advanceStop]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === ' ' || e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        advanceStop();
      } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
        e.preventDefault();
        prevStop();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        resetRoute();
      } else if (e.key === 'Escape') {
        onEditRoute();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [advanceStop, prevStop, resetRoute, onEditRoute]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Handle auto-hiding controls after inactivity
  const showControlsTemporarily = () => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = window.setTimeout(() => {
      setControlsVisible(false);
    }, 3500);
  };

  useEffect(() => {
    showControlsTemporarily();
    return () => {
      if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // Click anywhere on main screen advances stop (per user prompt)
  const handleScreenClick = (e: React.MouseEvent) => {
    // Check if clicked element was inside controls bar
    if ((e.target as HTMLElement).closest('.screen-controls')) {
      return;
    }
    advanceStop();
    showControlsTemporarily();
  };

  // Determine which stops to show:
  // 1. Current stop: route.stops[currentIndex]
  // 2. Next intermediate stops: up to 5 stops between currentIndex + 1 and terminusIndex - 1
  // 3. Jump/preview stop before terminus (if more than 5 intermediate stops exist)
  // 4. Terminus stop: route.stops[terminusIndex]
  const currentStop = route.stops[currentIndex] || route.stops[0];
  const isAtTerminus = currentIndex >= terminusIndex;

  const intermediateStops = useMemo(() => {
    if (isAtTerminus) return [];
    const list: { stop: Stop; index: number; cumulativeMin: number }[] = [];
    const maxIntermediates = 5;

    for (let i = currentIndex + 1; i < terminusIndex; i++) {
      if (list.length < maxIntermediates) {
        list.push({
          stop: route.stops[i],
          index: i,
          cumulativeMin: getCumulativeMinutes(i),
        });
      }
    }
    return list;
  }, [currentIndex, terminusIndex, route.stops, isAtTerminus, getCumulativeMinutes]);

  // Check if there are skipped stops between the 5th intermediate and the terminus
  const lastIntermediateIndex =
    intermediateStops.length > 0 ? intermediateStops[intermediateStops.length - 1].index : currentIndex;
  const hasSkippedStops = lastIntermediateIndex < terminusIndex - 1;

  // Next key preview stop before terminus if skipped stops exist (as in screenshot: "14 min : Střížkov")
  const previewStop = useMemo(() => {
    if (!hasSkippedStops) return null;
    // Pick the stop right after the intermediate list, or a major transfer station before terminus
    const targetIdx = lastIntermediateIndex + 1;
    if (targetIdx < terminusIndex) {
      return {
        stop: route.stops[targetIdx],
        index: targetIdx,
        cumulativeMin: getCumulativeMinutes(targetIdx),
      };
    }
    return null;
  }, [hasSkippedStops, lastIntermediateIndex, terminusIndex, route.stops, getCumulativeMinutes]);

  const terminusCumulativeMin = getCumulativeMinutes(terminusIndex);

  return (
    <div
      ref={containerRef}
      onClick={handleScreenClick}
      onMouseMove={showControlsTemporarily}
      className="relative w-full h-full min-h-screen bg-black flex items-center justify-center select-none overflow-hidden font-['Roboto',sans-serif] cursor-pointer"
      title="Ťuknutím kamkoli posunete zastávku"
    >
      {/* 16:9 / 16:10 Container mimicking vehicle passenger LCD monitor */}
      <div
        className="w-full max-w-[1366px] aspect-[16/9] max-h-screen bg-[#2c2f32] text-white flex flex-col justify-between shadow-2xl relative border-zinc-800"
        style={{
          boxShadow: '0 0 50px rgba(0, 0, 0, 0.9)',
        }}
      >
        {/* Top Header */}
        <div className="relative flex items-stretch h-[18%] z-10">
          {/* Top-Left: Light gray box with big bold line number */}
          <div className="w-[22%] min-w-[140px] max-w-[240px] bg-[#c3c7cb] flex items-center justify-center px-4 py-2 select-none shadow-sm">
            <span className="font-['Barlow',sans-serif] font-black text-6xl md:text-7xl lg:text-8xl tracking-tight text-[#171a1c] leading-none">
              {route.lineNumber}
            </span>
          </div>

          {/* Top-Right: Zone info (e.g. "pásmo zone P") */}
          <div className="flex-1 flex items-center justify-end px-8 bg-[#2c2f32]">
            <div className="flex items-baseline gap-2">
              <span className="text-xl md:text-2xl font-normal text-zinc-100 lowercase">pásmo</span>
              <span className="text-base md:text-lg font-light text-zinc-300 italic lowercase">zone</span>
              <span className="text-3xl md:text-4xl font-black text-white ml-1">
                {currentStop.zone || 'P'}
              </span>
            </div>
          </div>
        </div>

        {/* Main Body: Route diagram and stop list */}
        <div className="relative flex-1 flex flex-col justify-between px-0 overflow-hidden bg-[#2c2f32]">
          {/* Route Container */}
          <div className="relative flex-1 flex flex-col justify-around py-2">
            {/* Top Nearest Stop (Prominent large typography as in screenshot) */}
            <div className="relative flex items-center min-h-[58px] z-10">
              {/* Left Column: Time & Line Column */}
              <div className="w-[22%] min-w-[140px] max-w-[240px] flex items-center justify-end relative pr-6">
                {/* Time above or to the left of circle */}
                <div className="flex flex-col items-center mr-3">
                  <span className="text-sm md:text-base font-semibold text-zinc-200 whitespace-nowrap">
                    {currentStop.minutes} min
                  </span>
                </div>

                {/* Vertical route line running downwards from top */}
                <div className="absolute right-[33px] top-[14px] bottom-[-200px] w-[5px] bg-white z-0 pointer-events-none" />

                {/* Big Circle Node for current stop */}
                <div className="relative z-10 w-9 h-9 rounded-full bg-[#2c2f32] border-[4px] border-white flex items-center justify-center shadow-md">
                  <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
                </div>
              </div>

              {/* Stop Name & Badges */}
              <div className="flex-1 flex items-center flex-wrap gap-2 pl-4 pr-6">
                <span className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-black text-white tracking-tight drop-shadow-sm leading-tight">
                  {currentStop.name}
                </span>
                <TransferBadges
                  transfers={currentStop.transfers}
                  isRequestStop={currentStop.isRequestStop}
                  size="lg"
                  darkMode={true}
                />
              </div>
            </div>

            {/* Next 5 Intermediate Stops */}
            {intermediateStops.map((item) => (
              <div
                key={item.stop.id || item.index}
                className="relative flex items-center min-h-[44px] z-10 transition-transform duration-200"
              >
                {/* Time & Line Node Column */}
                <div className="w-[22%] min-w-[140px] max-w-[240px] flex items-center justify-end relative pr-6">
                  {/* Calculated cumulative time */}
                  <span className="text-lg sm:text-xl md:text-2xl font-normal text-zinc-200 mr-4 whitespace-nowrap">
                    {item.cumulativeMin} min
                  </span>

                  {/* Standard Circle Node */}
                  <div className="relative z-10 w-7 h-7 rounded-full bg-[#2c2f32] border-[3.5px] border-white flex items-center justify-center" />
                </div>

                {/* Stop Name & Badges */}
                <div className="flex-1 flex items-center flex-wrap gap-2 pl-4 pr-6">
                  <span className="text-xl sm:text-2xl md:text-3xl lg:text-[2.1rem] font-bold text-white tracking-normal leading-tight">
                    {item.stop.name}
                  </span>
                  <TransferBadges
                    transfers={item.stop.transfers}
                    isRequestStop={item.stop.isRequestStop}
                    size="md"
                    darkMode={true}
                  />
                </div>
              </div>
            ))}

            {/* If line has skipped stops between the 5th intermediate and terminus,
                show the preview row with dotted line as in screenshot! */}
            {previewStop && (
              <div className="relative flex items-center min-h-[48px] bg-[#3a3d41] py-1 z-10 shadow-inner">
                {/* Left: Time and Dotted line column */}
                <div className="w-[22%] min-w-[140px] max-w-[240px] flex items-center justify-end relative pr-6">
                  <span className="text-lg sm:text-xl md:text-2xl font-normal text-zinc-200 mr-4 whitespace-nowrap">
                    {previewStop.cumulativeMin} min
                  </span>

                  {/* Dotted vertical line representation */}
                  <div className="relative z-10 flex flex-col items-center justify-center gap-1.5 w-7">
                    <span className="w-2 h-2 rounded-full bg-white" />
                    <span className="w-2 h-2 rounded-full bg-white" />
                    <span className="w-2 h-2 rounded-full bg-white" />
                  </div>
                </div>

                {/* Stop Name & Badges */}
                <div className="flex-1 flex items-center flex-wrap gap-2 pl-4 pr-6">
                  <span className="text-xl sm:text-2xl md:text-3xl lg:text-[2.1rem] font-bold text-white tracking-normal leading-tight">
                    {previewStop.stop.name}
                  </span>
                  <TransferBadges
                    transfers={previewStop.stop.transfers}
                    isRequestStop={previewStop.stop.isRequestStop}
                    size="md"
                    darkMode={true}
                  />
                </div>
              </div>
            )}

            {/* When already at terminus */}
            {isAtTerminus && (
              <div className="flex-1 flex flex-col items-center justify-center py-6 text-center animate-fade-in z-20">
                <div className="inline-block px-6 py-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-lg text-lg font-bold mb-3">
                  KONEČNÁ ZASTÁVKA • VŮZ KONČÍ JÍZDU
                </div>
                <p className="text-zinc-300 text-base sm:text-xl font-medium max-w-lg mb-2">
                  Prosíme vystupte. Děkujeme, že cestujete s námi.
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  {/* Button for return trip in reverse order */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReverseTrip();
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold transition-all flex items-center gap-2.5 shadow-xl text-sm sm:text-base cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <ArrowLeftRight className="w-5 h-5" />
                    <span>Absolvovat jízdu zpět</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      resetRoute();
                    }}
                    className="px-5 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg text-sm cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Znovu tento směr</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Bar: Terminus Stop (Light gray bar as in screenshot) */}
        <div className="relative flex items-stretch h-[18%] bg-[#c3c7cb] text-[#171a1c] z-20 shadow-lg border-t-2 border-zinc-700">
          {/* Real-time Clock (HH:MM) */}
          <div className="w-[18%] min-w-[110px] max-w-[190px] flex items-center justify-start pl-6 md:pl-8">
            <span className="font-['Roboto',sans-serif] font-black text-3xl sm:text-4xl md:text-5xl tracking-tight text-[#171a1c]">
              {currentTimeStr || '15:40'}
            </span>
          </div>

          {/* Terminus Route Node Column */}
          <div className="w-[12%] min-w-[70px] max-w-[110px] flex items-center justify-end relative pr-4">
            {/* Terminus cumulative minutes */}
            <span className="text-lg sm:text-xl md:text-2xl font-medium text-[#171a1c] mr-3 whitespace-nowrap">
              {isAtTerminus ? '0 min' : `${terminusCumulativeMin} min`}
            </span>

            {/* Small downward chevron arrow pointing into terminus circle from line */}
            <div className="absolute right-[22px] -top-3 z-30">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 16L4 8h16l-8 8z" />
              </svg>
            </div>

            {/* Terminus Circle with white down arrow */}
            <div className="relative z-20 w-8 h-8 rounded-full bg-[#1e2225] flex items-center justify-center shadow-md">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </div>
          </div>

          {/* Terminus Stop Name & Badges */}
          <div className="flex-1 flex items-center flex-wrap gap-2 pl-4 pr-6">
            <span className="text-2xl sm:text-3xl md:text-4xl lg:text-[2.6rem] font-black text-[#171a1c] tracking-tight leading-tight">
              {terminusStop.name}
            </span>
            <TransferBadges
              transfers={terminusStop.transfers}
              isRequestStop={terminusStop.isRequestStop}
              size="lg"
              darkMode={false}
            />
          </div>
        </div>
      </div>

      {/* Touch indication hint */}
      <div
        className={`absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md text-zinc-300 text-xs px-4 py-1.5 rounded-full pointer-events-none transition-opacity duration-300 ${
          controlsVisible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        👆 Ťuknutím / kliknutím kamkoli se posune zastávka (Mezerník / Šipka vpravo)
      </div>

      {/* Floating Control Toolbar (Discrete, auto-hiding for clean display) */}
      <div
        className={`screen-controls absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-950/90 backdrop-blur-md border border-zinc-700/80 text-white px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-3 transition-all duration-300 ${
          controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Step indicator */}
        <span className="text-xs text-zinc-400 font-mono px-1">
          {currentIndex + 1} / {totalStops}
        </span>

        <div className="h-4 w-px bg-zinc-700" />

        {/* Previous stop button */}
        <button
          onClick={prevStop}
          disabled={currentIndex === 0}
          className="p-1.5 hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent rounded-lg text-zinc-200 transition-colors"
          title="Předchozí zastávka (Šipka vlevo)"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Next stop button */}
        <button
          onClick={advanceStop}
          disabled={isAtTerminus}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 rounded-lg text-white font-semibold text-xs flex items-center gap-1.5 shadow transition-colors"
          title="Další zastávka (Mezerník)"
        >
          <span>Další zastávka</span>
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Reset route */}
        <button
          onClick={resetRoute}
          className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-300 hover:text-white transition-colors"
          title="Restartovat trasu na začátek"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Reverse route trip */}
        <button
          onClick={handleReverseTrip}
          className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-300 hover:text-white transition-colors"
          title="Otočit směr jízdy (Absolvovat jízdu zpět)"
        >
          <ArrowLeftRight className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-zinc-700" />

        {/* Sound gong toggle */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`p-1.5 rounded-lg transition-colors ${
            soundEnabled ? 'text-amber-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-800'
          }`}
          title={soundEnabled ? 'Zvukový gong zapnut' : 'Zvukový gong vypnut'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Voice announcement toggle */}
        <button
          onClick={() => {
            const next = !voiceEnabled;
            setVoiceEnabled(next);
            if (next) {
              transitAudio.voiceEnabled = true;
              transitAudio.announceStop(currentStop.name, isAtTerminus, currentStop.transfers || []);
            }
          }}
          className={`p-1.5 rounded-lg transition-colors ${
            voiceEnabled ? 'text-emerald-400 hover:bg-zinc-800' : 'text-zinc-500 hover:bg-zinc-800'
          }`}
          title={voiceEnabled ? 'Hlasové hlášení zastávek zapnuto' : 'Hlasové hlášení vypnuto'}
        >
          <Megaphone className="w-4 h-4" />
        </button>

        {/* Auto advance timer */}
        <button
          onClick={() => {
            if (!autoAdvance) setAutoAdvance(5);
            else if (autoAdvance === 5) setAutoAdvance(10);
            else setAutoAdvance(null);
          }}
          className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 transition-colors ${
            autoAdvance ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40' : 'text-zinc-400 hover:bg-zinc-800'
          }`}
          title="Automatický posun zastávek"
        >
          {autoAdvance ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{autoAdvance ? `${autoAdvance}s` : 'Auto'}</span>
        </button>

        <div className="h-4 w-px bg-zinc-700" />

        {/* Fullscreen toggle */}
        <button
          onClick={toggleFullscreen}
          className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-300 hover:text-white transition-colors"
          title="Celá obrazovka"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Back to Edit Route Settings */}
        <button
          onClick={onEditRoute}
          className="px-2.5 py-1.5 hover:bg-zinc-800 rounded-lg text-zinc-300 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors"
          title="Zpět do editoru linky (Esc)"
        >
          <Settings className="w-4 h-4" />
          <span>Upravit linku</span>
        </button>
      </div>
    </div>
  );
};
