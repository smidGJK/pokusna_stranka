import React, { useState } from 'react';
import { RouteConfig, Stop, TransferType } from '../types';
import { PRESETS } from '../data/presets';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Play,
  RotateCcw,
  FileText,
  Check,
  Bell,
  Bus,
  Sparkles,
  Info,
  Download,
} from 'lucide-react';

interface Props {
  initialConfig: RouteConfig;
  onConfirm: (config: RouteConfig) => void;
}

const COMMON_ZONES = ['P', '0', 'B', '1', '2', '3', '4', '5', '6', '7'];

export const RouteEditor: React.FC<Props> = ({ initialConfig, onConfirm }) => {
  const [config, setConfig] = useState<RouteConfig>(initialConfig);
  const [textImportOpen, setTextImportOpen] = useState(false);
  const [rawText, setRawText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Update line number
  const handleLineNumberChange = (val: string) => {
    setConfig((prev) => ({ ...prev, lineNumber: val }));
  };

  // Update a single stop
  const updateStop = (id: string, updates: Partial<Stop>) => {
    setConfig((prev) => ({
      ...prev,
      stops: prev.stops.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    }));
  };

  // Add new stop
  const addStop = (afterIndex?: number) => {
    const newStop: Stop = {
      id: `stop-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: 'Nová zastávka',
      minutes: 2,
      zone: config.stops[config.stops.length - 1]?.zone || 'P',
      isRequestStop: false,
      transfers: [],
    };

    setConfig((prev) => {
      const stops = [...prev.stops];
      if (afterIndex !== undefined) {
        stops.splice(afterIndex + 1, 0, newStop);
      } else {
        stops.push(newStop);
      }
      return { ...prev, stops };
    });
  };

  // Remove stop
  const removeStop = (id: string) => {
    if (config.stops.length <= 2) {
      setErrorMsg('Trasa musí obsahovat alespoň 2 zastávky (výchozí a konečnou).');
      return;
    }
    setErrorMsg(null);
    setConfig((prev) => ({
      ...prev,
      stops: prev.stops.filter((s) => s.id !== id),
    }));
  };

  // Move stop up/down
  const moveStop = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= config.stops.length) return;

    setConfig((prev) => {
      const stops = [...prev.stops];
      const temp = stops[index];
      stops[index] = stops[newIndex];
      stops[newIndex] = temp;
      return { ...prev, stops };
    });
  };

  // Toggle transfer badge for a stop
  const toggleTransfer = (stopId: string, transfer: TransferType) => {
    setConfig((prev) => ({
      ...prev,
      stops: prev.stops.map((s) => {
        if (s.id !== stopId) return s;
        const current = s.transfers || [];
        const exists = current.includes(transfer);
        const updated = exists ? current.filter((t) => t !== transfer) : [...current, transfer];
        return { ...s, transfers: updated };
      }),
    }));
  };

  // Load a preset
  const loadPreset = (presetId: string) => {
    const p = PRESETS.find((x) => x.id === presetId);
    if (p) {
      // Create deep clone with fresh IDs
      setConfig(JSON.parse(JSON.stringify(p.data)));
      setErrorMsg(null);
    }
  };

  // Open batch text import modal
  const openTextImport = () => {
    const lines = config.stops.map((s) => {
      const transfers = (s.transfers || []).join(',');
      const req = s.isRequestStop ? 'x' : '';
      return `${s.name} | ${s.minutes} min | ${s.zone}${transfers ? ` | ${transfers}` : ''}${req ? ` | ${req}` : ''}`;
    });
    setRawText(lines.join('\n'));
    setTextImportOpen(true);
  };

  // Apply batch text import
  const applyTextImport = () => {
    try {
      const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        setErrorMsg('Zadejte alespoň 2 řádky pro výchozí a konečnou zastávku.');
        return;
      }

      const parsedStops: Stop[] = lines.map((line, idx) => {
        const parts = line.split('|').map((p) => p.trim());
        const name = parts[0] || `Zastávka ${idx + 1}`;
        const minStr = parts[1]?.replace(/[^\d.]/g, '') || '2';
        const minutes = Math.max(1, parseInt(minStr, 10) || 1);
        const zone = parts[2] || 'P';

        const transfers: TransferType[] = [];
        let isRequestStop = false;

        if (parts[3]) {
          const tPart = parts[3].toLowerCase();
          if (tPart.includes('metro-a') || tPart.includes(' a') || tPart === 'a') transfers.push('metro-a');
          if (tPart.includes('metro-b') || tPart.includes(' b') || tPart === 'b') transfers.push('metro-b');
          if (tPart.includes('metro-c') || tPart.includes(' c') || tPart === 'c') transfers.push('metro-c');
          if (tPart.includes('metro-d') || tPart.includes(' d') || tPart === 'd') transfers.push('metro-d');
          if (tPart.includes('vlak') || tPart.includes('train') || tPart.includes('s')) transfers.push('train');
          if (tPart.includes('tram')) transfers.push('tram');
          if (tPart.includes('bus')) transfers.push('bus');
          if (tPart.includes('letist') || tPart.includes('airport')) transfers.push('airport');
          if (tPart.includes('x') || tPart.includes('znameni')) isRequestStop = true;
        }

        if (parts[4]) {
          const p4 = parts[4].toLowerCase();
          if (p4.includes('x') || p4.includes('znameni')) isRequestStop = true;
        }

        return {
          id: `stop-import-${idx}-${Date.now()}`,
          name,
          minutes,
          zone,
          isRequestStop,
          transfers,
        };
      });

      setConfig((prev) => ({ ...prev, stops: parsedStops }));
      setTextImportOpen(false);
      setErrorMsg(null);
    } catch {
      setErrorMsg('Chyba při zpracování textu. Zkontrolujte formát oddělovače svislítka "|".');
    }
  };

  // Compute cumulative preview for all stops from start
  let cumulative = 0;
  const stopsWithCumulative = config.stops.map((stop, idx) => {
    cumulative += idx === 0 ? stop.minutes : stop.minutes;
    return { ...stop, totalTime: cumulative };
  });

  const handleStart = () => {
    if (config.stops.length < 2) {
      setErrorMsg('Trasa musí obsahovat alespoň 2 zastávky!');
      return;
    }
    onConfirm(config);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 lg:p-8 font-sans selection:bg-blue-600 selection:text-white">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top App Header & Quick Launch */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <Bus className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  PID Informační panel zastávek
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400">
                  Nastavte zastávky, dojezdové časy a tarifní pásma • Zobrazení odpovídá LCD v autobusech PID
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href="/pid-panel.html"
              download="pid-iniciator-panel.html"
              className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 hover:text-white font-bold rounded-xl shadow flex items-center justify-center gap-2 transition-all text-sm"
              title="Stáhnout jako jeden samostatný HTML soubor, který lze spustit dvojklikem bez jakéhokoliv serveru"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Stáhnout offline soubor (.html)</span>
            </a>

            <button
              onClick={handleStart}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-sm sm:text-base cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Spustit simulátor</span>
            </button>
          </div>
        </div>

        {/* Presets Selector */}
        <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Rychlé předvolby linek
            </span>
            <button
              onClick={openTextImport}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              Hromadný textový import / export
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => loadPreset(p.id)}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  config.lineNumber === p.data.lineNumber && config.stops.length === p.data.stops.length
                    ? 'border-blue-500 bg-blue-950/40 text-blue-100 shadow-md ring-1 ring-blue-500/50'
                    : 'border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800/60 hover:border-zinc-700 text-zinc-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between font-bold text-sm mb-1 gap-1">
                    <span className="truncate">{p.title}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono shrink-0">
                      {p.data.lineNumber || 'Nová'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 line-clamp-2">{p.description}</p>
                </div>
                <div className="mt-2 text-[11px] text-zinc-500 font-medium">
                  {p.data.stops.length} {p.data.stops.length === 1 ? 'zastávka' : p.data.stops.length < 5 ? 'zastávky' : 'zastávek'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Route Details Configuration (Line Number, Type) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Číslo linky</label>
                <input
                  type="text"
                  value={config.lineNumber}
                  onChange={(e) => handleLineNumberChange(e.target.value)}
                  className="w-28 px-3 py-2 bg-zinc-800 border border-zinc-700 focus:border-blue-500 focus:outline-none rounded-xl text-xl font-black text-white text-center font-['Barlow',sans-serif]"
                  placeholder="152"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Typ dopravy</label>
                <div className="flex items-center bg-zinc-800 p-1 rounded-xl border border-zinc-700">
                  {(['bus', 'tram', 'trolleybus'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setConfig((prev) => ({ ...prev, lineType: type }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${
                        config.lineType === type
                          ? 'bg-blue-600 text-white shadow'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {type === 'bus' ? 'Autobus' : type === 'tram' ? 'Tramvaj' : 'Trolejbus'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => addStop()}
                className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-xs font-bold text-zinc-200 flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4 text-blue-400" />
                Přidat zastávku
              </button>
              <button
                onClick={() => loadPreset('bus-152')}
                className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5 transition-colors"
                title="Obnovit výchozí linku 152 z obrázku"
              >
                <RotateCcw className="w-4 h-4" />
                Výchozí
              </button>
            </div>
          </div>

          {/* User explanation hint */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-blue-950/30 border border-blue-900/50 text-blue-200 text-xs">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-400" />
            <div>
              <strong>Jak funguje simulace:</strong> První zastávka se zobrazí nahoře velkým písmem, pod ní
              následujících 5 zastávek a dole vždy konečná. Časy se automaticky sčítají od aktuální polohy vozu.
              V simulátoru kliknutím nebo ťuknutím kamkoli posunete vůz k další zastávce.
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded-xl text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Table / List of Stops */}
          <div className="space-y-2 mt-2">
            <div className="grid grid-cols-12 gap-2 px-3 py-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              <div className="col-span-1 text-center">#</div>
              <div className="col-span-4 sm:col-span-4">Název zastávky</div>
              <div className="col-span-2 text-center">Čas (min)</div>
              <div className="col-span-2 text-center">Pásmo</div>
              <div className="col-span-2 hidden sm:block">Přestupy</div>
              <div className="col-span-3 sm:col-span-1 text-right">Akce</div>
            </div>

            {stopsWithCumulative.map((stop, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === config.stops.length - 1;

              return (
                <div
                  key={stop.id}
                  className={`grid grid-cols-12 gap-2 items-center p-3 rounded-xl border transition-colors ${
                    isFirst
                      ? 'bg-blue-950/20 border-blue-900/40'
                      : isLast
                      ? 'bg-amber-950/20 border-amber-900/40'
                      : 'bg-zinc-800/40 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {/* Order Index */}
                  <div className="col-span-1 flex flex-col items-center justify-center">
                    <span className="font-mono text-xs font-bold text-zinc-400">#{idx + 1}</span>
                    {isFirst && <span className="text-[9px] font-bold text-blue-400 uppercase">Start</span>}
                    {isLast && <span className="text-[9px] font-bold text-amber-400 uppercase">Cíl</span>}
                  </div>

                  {/* Stop Name & Request Stop Toggle */}
                  <div className="col-span-4 sm:col-span-4 space-y-1">
                    <input
                      type="text"
                      value={stop.name}
                      onChange={(e) => updateStop(stop.id, { name: e.target.value })}
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-700 focus:border-blue-500 focus:outline-none rounded-lg text-sm font-semibold text-white"
                      placeholder="Název zastávky"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateStop(stop.id, { isRequestStop: !stop.isRequestStop })}
                        className={`text-[10px] px-2 py-0.5 rounded font-medium flex items-center gap-1 transition-colors ${
                          stop.isRequestStop
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        <Bell className="w-3 h-3" />
                        <span>Na znamení (x)</span>
                      </button>
                    </div>
                  </div>

                  {/* Minutes from previous stop */}
                  <div className="col-span-2 flex flex-col items-center justify-center">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        max="60"
                        value={stop.minutes}
                        onChange={(e) =>
                          updateStop(stop.id, { minutes: Math.max(1, parseInt(e.target.value, 10) || 1) })
                        }
                        className="w-14 px-2 py-1.5 bg-zinc-900 border border-zinc-700 focus:border-blue-500 focus:outline-none rounded-lg text-sm font-bold text-white text-center"
                      />
                      <span className="text-xs text-zinc-400">m</span>
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
                      Σ {stop.totalTime} min
                    </span>
                  </div>

                  {/* Tariff Zone */}
                  <div className="col-span-2 flex justify-center">
                    <select
                      value={stop.zone}
                      onChange={(e) => updateStop(stop.id, { zone: e.target.value })}
                      className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-700 focus:border-blue-500 focus:outline-none rounded-lg text-xs font-bold text-white text-center cursor-pointer"
                    >
                      {COMMON_ZONES.map((z) => (
                        <option key={z} value={z}>
                          Pásmo {z}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Transfer badges quick toggles */}
                  <div className="col-span-2 hidden sm:flex items-center flex-wrap gap-1">
                    {/* Metro A */}
                    <button
                      type="button"
                      onClick={() => toggleTransfer(stop.id, 'metro-a')}
                      className={`w-6 h-6 rounded text-xs font-black transition-opacity ${
                        stop.transfers?.includes('metro-a')
                          ? 'bg-[#00a651] text-white opacity-100 shadow'
                          : 'bg-zinc-800 text-zinc-500 opacity-40 hover:opacity-80'
                      }`}
                      title="Metro A"
                    >
                      A
                    </button>
                    {/* Metro B */}
                    <button
                      type="button"
                      onClick={() => toggleTransfer(stop.id, 'metro-b')}
                      className={`w-6 h-6 rounded text-xs font-black transition-opacity ${
                        stop.transfers?.includes('metro-b')
                          ? 'bg-[#fdb913] text-black opacity-100 shadow'
                          : 'bg-zinc-800 text-zinc-500 opacity-40 hover:opacity-80'
                      }`}
                      title="Metro B"
                    >
                      B
                    </button>
                    {/* Metro C */}
                    <button
                      type="button"
                      onClick={() => toggleTransfer(stop.id, 'metro-c')}
                      className={`w-6 h-6 rounded text-xs font-black transition-opacity ${
                        stop.transfers?.includes('metro-c')
                          ? 'bg-[#e30613] text-white opacity-100 shadow'
                          : 'bg-zinc-800 text-zinc-500 opacity-40 hover:opacity-80'
                      }`}
                      title="Metro C"
                    >
                      C
                    </button>
                    {/* Metro D */}
                    <button
                      type="button"
                      onClick={() => toggleTransfer(stop.id, 'metro-d')}
                      className={`w-6 h-6 rounded text-xs font-black transition-opacity ${
                        stop.transfers?.includes('metro-d')
                          ? 'bg-[#0078bf] text-white opacity-100 shadow'
                          : 'bg-zinc-800 text-zinc-500 opacity-40 hover:opacity-80'
                      }`}
                      title="Metro D"
                    >
                      D
                    </button>
                    {/* Train S */}
                    <button
                      type="button"
                      onClick={() => toggleTransfer(stop.id, 'train')}
                      className={`w-6 h-6 rounded text-xs font-black transition-opacity ${
                        stop.transfers?.includes('train')
                          ? 'bg-[#003882] text-white opacity-100 shadow'
                          : 'bg-zinc-800 text-zinc-500 opacity-40 hover:opacity-80'
                      }`}
                      title="Vlak (linky S)"
                    >
                      S
                    </button>
                    {/* Tram */}
                    <button
                      type="button"
                      onClick={() => toggleTransfer(stop.id, 'tram')}
                      className={`px-1.5 h-6 rounded text-xs font-bold transition-opacity ${
                        stop.transfers?.includes('tram')
                          ? 'bg-zinc-200 text-zinc-900 opacity-100 shadow'
                          : 'bg-zinc-800 text-zinc-500 opacity-40 hover:opacity-80'
                      }`}
                      title="Tramvaj"
                    >
                      Tram
                    </button>
                    {/* Airport */}
                    <button
                      type="button"
                      onClick={() => toggleTransfer(stop.id, 'airport')}
                      className={`px-1.5 h-6 rounded text-xs font-bold transition-opacity ${
                        stop.transfers?.includes('airport')
                          ? 'bg-sky-600 text-white opacity-100 shadow'
                          : 'bg-zinc-800 text-zinc-500 opacity-40 hover:opacity-80'
                      }`}
                      title="Letiště ✈️"
                    >
                      ✈
                    </button>
                  </div>

                  {/* Action buttons (Move Up, Move Down, Delete, Insert) */}
                  <div className="col-span-3 sm:col-span-1 flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => moveStop(idx, 'up')}
                      disabled={isFirst}
                      className="p-1 hover:bg-zinc-700 disabled:opacity-20 rounded text-zinc-400 hover:text-white transition-colors"
                      title="Posunout nahoru"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStop(idx, 'down')}
                      disabled={isLast}
                      className="p-1 hover:bg-zinc-700 disabled:opacity-20 rounded text-zinc-400 hover:text-white transition-colors"
                      title="Posunout dolů"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeStop(stop.id)}
                      className="p-1 hover:bg-red-950/60 rounded text-zinc-500 hover:text-red-400 transition-colors"
                      title="Smazat zastávku"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Stop Button */}
          <div className="pt-2 flex justify-between items-center">
            <button
              onClick={() => addStop()}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-xs font-bold text-zinc-200 flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4 text-blue-400" />
              Přidat další zastávku na konec
            </button>

            <button
              onClick={handleStart}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Potvrdit a spustit simulaci</span>
            </button>
          </div>
        </div>
      </div>

      {/* Batch Text Import / Export Modal */}
      {textImportOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-400" />
                Hromadný textový import / export zastávek
              </h2>
              <button
                onClick={() => setTextImportOpen(false)}
                className="text-zinc-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Každý řádek představuje jednu zastávku ve formátu:
              <br />
              <code className="text-blue-300 font-mono">
                Název zastávky | minuty z předchozí | pásmo | přestupy (A, B, C, D, vlak, tram, letiste) | x
              </code>
            </p>

            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={12}
              className="w-full p-3 bg-zinc-950 border border-zinc-800 rounded-xl font-mono text-xs text-zinc-200 focus:border-blue-500 focus:outline-none"
              placeholder="Řepínská | 1 | P&#10;Podhajská pole | 1 | P&#10;Čimický háj | 2 | P&#10;Kobylisy | 1 | P | C, tram"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setTextImportOpen(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold"
              >
                Zrušit
              </button>
              <button
                onClick={applyTextImport}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg"
              >
                Uložit a načíst do trasy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
