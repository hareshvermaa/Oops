import React from 'react';
import { WORLDS } from '../game/levels';
import { PlayerProgress } from '../types/game';
import { ArrowLeft, Lock, Star, ChevronRight } from 'lucide-react';
import { sound } from '../utils/audio';

interface WorldSelectScreenProps {
  progress: PlayerProgress;
  onSelectWorld: (worldId: number) => void;
  onBack: () => void;
}

export const WorldSelectScreen: React.FC<WorldSelectScreenProps> = ({
  progress,
  onSelectWorld,
  onBack,
}) => {
  // Calculate total stars
  let totalStars = 0;
  for (const lvl of Object.values(progress.completedLevels)) {
    totalStars += lvl.stars || 0;
  }

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-white select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
        <button
          onClick={() => {
            sound.playClick();
            onBack();
          }}
          className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Menu</span>
        </button>

        <h2 className="text-base font-extrabold text-amber-400">
          Campaign Worlds
        </h2>

        <div className="flex items-center gap-1 text-xs font-bold text-amber-400">
          <Star className="w-3.5 h-3.5 fill-current" />
          <span className="tabular-nums">{totalStars} / 600</span>
        </div>
      </div>

      {/* World List Grid */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {WORLDS.map((world) => {
          const isUnlocked = world.id <= progress.unlockedWorldMax;

          // Count stars in this world (20 levels)
          let worldStars = 0;
          let worldCompletedCount = 0;
          for (let l = world.startLevel; l <= world.endLevel; l++) {
            const lvl = progress.completedLevels[l];
            if (lvl) {
              worldStars += lvl.stars || 0;
              if (lvl.completed) worldCompletedCount++;
            }
          }

          return (
            <button
              key={world.id}
              disabled={!isUnlocked}
              onClick={() => {
                sound.playClick();
                onSelectWorld(world.id);
              }}
              className={`w-full p-4 rounded-3xl border text-left flex items-center justify-between transition-all select-none ${
                isUnlocked
                  ? 'bg-slate-900 hover:bg-slate-850 border-slate-700/80 hover:border-amber-400/50 active:scale-[0.98] shadow-lg shadow-black/30'
                  : 'bg-slate-900/50 border-slate-800/80 opacity-60 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className="w-13 h-13 rounded-2xl flex items-center justify-center text-2xl shadow-inner shrink-0"
                  style={{ backgroundColor: `${world.themeColor}22`, color: world.themeColor }}
                >
                  {isUnlocked ? world.icon : <Lock className="w-6 h-6 text-slate-500" />}
                </div>

                <div className="flex flex-col">
                  <span className="text-[11px] font-bold tracking-wider uppercase" style={{ color: world.themeColor }}>
                    World {world.id} · Levels {world.startLevel}–{world.endLevel}
                  </span>
                  <h3 className="text-base font-extrabold text-white leading-tight">
                    {world.name}
                  </h3>
                  <span className="text-xs text-slate-400 truncate max-w-[200px]">
                    {world.subtitle}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {isUnlocked ? (
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1 text-xs font-bold text-amber-400">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="tabular-nums">{worldStars} / 60</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {worldCompletedCount}/20 cleared
                    </span>
                  </div>
                ) : (
                  <div className="px-2.5 py-1 bg-slate-800 rounded-lg text-[10px] text-slate-400 font-semibold">
                    Locked
                  </div>
                )}
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
