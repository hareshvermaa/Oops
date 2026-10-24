import React from 'react';
import { WORLDS, getWorldLevels } from '../game/levels';
import { PlayerProgress } from '../types/game';
import { ArrowLeft, Lock, Star } from 'lucide-react';
import { sound } from '../utils/audio';

interface LevelSelectScreenProps {
  worldId: number;
  progress: PlayerProgress;
  onSelectLevel: (levelId: number) => void;
  onBack: () => void;
}

export const LevelSelectScreen: React.FC<LevelSelectScreenProps> = ({
  worldId,
  progress,
  onSelectLevel,
  onBack,
}) => {
  const world = WORLDS[worldId - 1] || WORLDS[0];
  const levels = getWorldLevels(worldId);

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
          <span>Worlds</span>
        </button>

        <div className="flex flex-col items-center">
          <span className="text-[10px] text-amber-400 font-bold tracking-wider uppercase">
            World {world.id}
          </span>
          <h2 className="text-sm font-extrabold text-white">
            {world.name}
          </h2>
        </div>

        <div className="w-14" />
      </div>

      {/* 20 Levels Grid */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center">
        <div className="w-full max-w-sm grid grid-cols-4 gap-3.5 my-auto">
          {levels.map((level) => {
            const completion = progress.completedLevels[level.id];
            const isCompleted = completion?.completed || false;
            const stars = completion?.stars || 0;

            // Unlocked if Level 1 or prior level completed (or QA unlocked all)
            const isFirstLevelOverall = level.id === 1;
            const isPriorLevelCompleted = progress.completedLevels[level.id - 1]?.completed;
            const isUnlocked = isFirstLevelOverall || isPriorLevelCompleted || progress.unlockedWorldMax >= worldId && level.id === world.startLevel;

            return (
              <button
                key={level.id}
                disabled={!isUnlocked}
                onClick={() => {
                  sound.playClick();
                  onSelectLevel(level.id);
                }}
                className={`flex flex-col items-center justify-center aspect-square rounded-2xl border p-2 transition-all relative ${
                  isUnlocked
                    ? isCompleted
                      ? 'bg-amber-500/15 border-amber-400/60 hover:bg-amber-500/25 active:scale-95 shadow-md shadow-amber-950/20'
                      : 'bg-slate-800/90 border-slate-600 hover:bg-slate-700 active:scale-95 text-white'
                    : 'bg-slate-900/60 border-slate-800/60 opacity-40 cursor-not-allowed text-slate-600'
                }`}
              >
                {isUnlocked ? (
                  <>
                    <span className="text-base font-black text-white tabular-nums mb-1">
                      {level.id}
                    </span>
                    {/* Stars */}
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3].map((s) => (
                        <Star
                          key={s}
                          className={`w-3 h-3 ${
                            s <= stars
                              ? 'text-amber-400 fill-current'
                              : 'text-slate-600'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <Lock className="w-5 h-5 text-slate-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
