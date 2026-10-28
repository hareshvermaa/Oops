import React from 'react';
import { LevelDefinition, SimulationMode } from '../types/game';
import { Home, Lightbulb, Volume2, VolumeX, Coins, Flame } from 'lucide-react';
import { sound } from '../utils/audio';
import { themeFor } from '../game/themes';

interface HUDProps {
  level: LevelDefinition;
  simulationMode: SimulationMode;
  hintsRemaining: number;
  coins: number;
  streak: number;
  soundEnabled: boolean;
  onBack: () => void;
  onHint: () => void;
  onToggleSound: () => void;
}

const TIER_BADGE: Record<string, string> = {
  breather: '☀️ Chill level',
  relief: '🌈 Easy breezy',
  lucky: '🍀 Lucky level',
  twist: '✨ Twist!',
  intro: '🆕 New gadget!',
};

export const HUD: React.FC<HUDProps> = ({ level, hintsRemaining, coins, streak, soundEnabled, onBack, onHint, onToggleSound }) => {
  const theme = themeFor(level.worldId);
  const badge = level.tier ? TIER_BADGE[level.tier] : undefined;
  const difficulty = level.difficulty ?? 0.25;
  const difficultyLabel =
    difficulty < 0.3 ? 'MEDIUM' : difficulty < 0.55 ? 'HARD' : difficulty < 0.8 ? 'EXTREME' : 'ULTRA';
  return (
    <div className="w-full flex flex-col select-none z-20">
      <div className="flex items-center justify-between px-3 py-2 bg-white/90 text-slate-700 backdrop-blur border-b-2 border-pink-100">
        <button
          onClick={() => {
            sound.playClick();
            onBack();
          }}
          className="p-2 rounded-xl text-slate-500 hover:bg-pink-50 active:scale-95"
          aria-label="Home"
        >
          <Home className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center max-w-[190px]">
          <span className="text-[11px] text-pink-500 font-black tracking-wide uppercase truncate">
            {theme.icon} Level {level.id} · {difficultyLabel}
          </span>
          <span className="text-xs font-bold text-slate-700 truncate max-w-full">{level.title}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => {
              sound.playClick();
              onToggleSound();
            }}
            className="p-1.5 rounded-xl text-slate-500 hover:bg-pink-50"
            aria-label="Toggle sound"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
          </button>
          <button
            onClick={() => {
              sound.playClick();
              onHint();
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-300 text-amber-950 font-black rounded-xl text-xs shadow active:scale-95"
          >
            <Lightbulb className="w-3.5 h-3.5 fill-current" />
            <span>{hintsRemaining}</span>
          </button>
        </div>
      </div>

      <div className="bg-amber-50 border-b border-amber-100 px-3 py-1.5 flex items-center justify-between text-xs text-amber-900">
        <div className="flex items-center gap-2 truncate">
          {badge && <span className="font-black text-pink-500 shrink-0">{badge}</span>}
          <span className="truncate font-semibold">{level.objective}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 font-black">
          <span className="flex items-center gap-0.5 text-amber-600">
            <Coins className="w-3 h-3" />
            {coins}
          </span>
          <span className="flex items-center gap-0.5 text-orange-500">
            <Flame className="w-3 h-3" />
            {streak}
          </span>
        </div>
      </div>
    </div>
  );
};
