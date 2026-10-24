import React from 'react';
import { LevelDefinition, SimulationMode } from '../types/game';
import { ArrowLeft, RotateCcw, Play, Square, Lightbulb, Volume2, VolumeX } from 'lucide-react';
import { sound } from '../utils/audio';

interface HUDProps {
  level: LevelDefinition;
  simulationMode: SimulationMode;
  starsEarned: number;
  hintsRemaining: number;
  gadgetsUsed: number;
  soundEnabled: boolean;
  onGo: () => void;
  onReset: () => void;
  onBack: () => void;
  onHint: () => void;
  onToggleSound: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  level,
  simulationMode,
  starsEarned,
  hintsRemaining,
  gadgetsUsed,
  soundEnabled,
  onGo,
  onReset,
  onBack,
  onHint,
  onToggleSound,
}) => {
  const isRunning = simulationMode === 'RUNNING';

  return (
    <div className="w-full flex flex-col select-none z-20">
      {/* Top Header Strip */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 text-white backdrop-blur border-b border-slate-800">
        <button
          onClick={() => {
            sound.playClick();
            onBack();
          }}
          className="flex items-center gap-1 text-slate-300 hover:text-white transition-colors px-2 py-1.5 rounded-lg active:scale-95 text-xs font-semibold"
          title="Back to Levels"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit</span>
        </button>

        <div className="flex flex-col items-center max-w-[200px]">
          <span className="text-[11px] text-amber-400 font-semibold tracking-wide uppercase truncate">
            {level.worldTheme} · Lvl {level.id}
          </span>
          <span className="text-xs font-bold text-white truncate max-w-full">
            {level.title}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              sound.playClick();
              onToggleSound();
            }}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Toggle Sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onHint();
            }}
            className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs shadow transition-all active:scale-95"
            title="Hint"
          >
            <Lightbulb className="w-3.5 h-3.5 fill-current" />
            <span>Hint ({hintsRemaining})</span>
          </button>
        </div>
      </div>

      {/* Objective & Star Goal Banner */}
      <div className="bg-amber-100/95 border-b border-amber-200 px-3 py-1.5 flex items-center justify-between text-xs text-amber-950 shadow-sm">
        <div className="flex items-center gap-2 truncate">
          <span className="font-bold text-amber-900">GOAL:</span>
          <span className="truncate font-medium">{level.objective}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0 font-bold text-amber-900">
          <span className="text-amber-500">★</span>
          <span>{starsEarned}/3</span>
        </div>
      </div>
    </div>
  );
};
