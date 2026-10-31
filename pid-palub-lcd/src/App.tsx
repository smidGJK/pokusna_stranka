/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { RouteConfig } from './types';
import { PRESETS } from './data/presets';
import { RouteEditor } from './components/RouteEditor';
import { PidDisplay } from './components/PidDisplay';

const STORAGE_KEY = 'pid_route_config_v1';

export default function App() {
  const [config, setConfig] = useState<RouteConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    // Default to Bus 152 from user's attached screenshot
    const defaultPreset = PRESETS.find((p) => p.id === 'bus-152');
    return defaultPreset ? defaultPreset.data : PRESETS[0].data;
  });

  const [mode, setMode] = useState<'setup' | 'display'>('setup');

  // Persist configuration in localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      // ignore
    }
  }, [config]);

  const handleConfirm = (newConfig: RouteConfig) => {
    setConfig(newConfig);
    setMode('display');
  };

  const handleEditRoute = () => {
    setMode('setup');
  };

  return (
    <main className="w-full min-h-screen bg-black">
      {mode === 'setup' ? (
        <RouteEditor initialConfig={config} onConfirm={handleConfirm} />
      ) : (
        <PidDisplay
          route={config}
          onRouteChange={setConfig}
          onEditRoute={handleEditRoute}
        />
      )}
    </main>
  );
}
