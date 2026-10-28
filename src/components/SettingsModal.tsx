import React, { useState } from 'react';
import { Volume2, VolumeX, Music, Trash2, Key, X, Check } from 'lucide-react';
import { sound } from '../utils/audio';

interface SettingsModalProps {
  soundEnabled: boolean;
  musicEnabled: boolean;
  onToggleSound: () => void;
  onToggleMusic: () => void;
  onResetProgress: () => void;
  onUnlockAllDev: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  soundEnabled,
  musicEnabled,
  onToggleSound,
  onToggleMusic,
  onResetProgress,
  onUnlockAllDev,
  onClose,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);
  const [devUnlocked, setDevUnlocked] = useState(false);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl p-5 text-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-lg font-bold text-white">Settings</h3>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Setting Toggles */}
        <div className="flex flex-col gap-3 my-4">
          {/* Sound FX */}
          <div className="flex items-center justify-between p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/60">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-slate-500" />}
              </div>
              <span className="text-sm font-semibold">Sound Effects</span>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                onToggleSound();
              }}
              className={`w-12 h-7 rounded-full p-1 transition-colors ${
                soundEnabled ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  soundEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Music */}
          <div className="flex items-center justify-between p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/60">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                <Music className="w-5 h-5" />
              </div>
              <span className="text-sm font-semibold">Background Music</span>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                onToggleMusic();
              }}
              className={`w-12 h-7 rounded-full p-1 transition-colors ${
                musicEnabled ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  musicEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Developer / QA Review Mode (never shipped in release builds) */}
          {import.meta.env.DEV && (
          <div className="flex items-center justify-between p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/60">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-semibold block">Unlock All 200</span>
                <span className="text-[10px] text-slate-400">QA testing bypass</span>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                onUnlockAllDev();
                setDevUnlocked(true);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                devUnlocked
                  ? 'bg-emerald-600 text-white'
                  : 'bg-purple-600 hover:bg-purple-500 text-white'
              }`}
            >
              {devUnlocked ? 'Unlocked!' : 'Unlock'}
            </button>
          </div>
          )}

          {/* Reset Save Data */}
          <div className="p-3.5 bg-rose-950/20 rounded-2xl border border-rose-900/30 flex flex-col gap-2">
            {!confirmReset ? (
              <button
                onClick={() => setConfirmReset(true)}
                className="w-full py-2 bg-rose-900/40 hover:bg-rose-900/60 text-rose-300 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Reset All Save Data</span>
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <span className="text-[11px] text-rose-300 text-center font-medium">
                  Are you sure? This erases all earned stars.
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      sound.playClick();
                      onResetProgress();
                      setConfirmReset(false);
                      onClose();
                    }}
                    className="flex-1 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold"
                  >
                    Confirm Reset
                  </button>
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="flex-1 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl text-xs transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};
