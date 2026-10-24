import React, { useEffect, useState } from 'react';
import { RotateCcw, Play, List, Star, Sparkles, Trophy } from 'lucide-react';
import { sound } from '../utils/audio';

interface LevelCompleteModalProps {
  levelId: number;
  levelTitle: string;
  stars: number;
  elapsedSeconds: number;
  gadgetsUsed: number;
  onNextLevel: () => void;
  onReplay: () => void;
  onLevelSelect: () => void;
}

export const LevelCompleteModal: React.FC<LevelCompleteModalProps> = ({
  levelId,
  levelTitle,
  stars,
  elapsedSeconds,
  gadgetsUsed,
  onNextLevel,
  onReplay,
  onLevelSelect,
}) => {
  const [revealedStars, setRevealedStars] = useState<number>(0);

  // Staggered star popping with cheerful chimes
  useEffect(() => {
    setRevealedStars(0);
    const timers: number[] = [];

    for (let i = 1; i <= stars; i++) {
      const t = window.setTimeout(() => {
        setRevealedStars(i);
        sound.playStarPop(i);
      }, i * 260);
      timers.push(t);
    }

    return () => timers.forEach(clearTimeout);
  }, [stars]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-amber-400/90 w-full max-w-sm rounded-[32px] p-6 text-white shadow-2xl shadow-amber-500/20 flex flex-col items-center animate-scaleUp relative overflow-hidden">
        {/* Decorative Golden Ambient Glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Celebratory Mascot Header */}
        <div className="flex flex-col items-center mb-2">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-amber-200 border-3 border-white shadow-lg flex items-center justify-center animate-bounce">
            <span className="text-3xl">🥳</span>
          </div>
          <span className="text-amber-400 font-black text-xs tracking-widest uppercase mt-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>LEVEL {levelId} CLEARED!</span>
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <h2 className="text-xl font-black text-center text-white mt-0.5 max-w-[280px] truncate">
            {levelTitle}
          </h2>
        </div>

        {/* 3 Gold Stars Animation with Popping Sound */}
        <div className="flex items-center gap-3 my-3">
          {[1, 2, 3].map((starIndex) => {
            const isEarned = starIndex <= revealedStars;
            return (
              <div
                key={starIndex}
                className={`transition-all duration-300 transform ${
                  isEarned
                    ? 'text-amber-400 scale-125 drop-shadow-[0_0_16px_rgba(251,191,36,0.9)] animate-bounce'
                    : 'text-slate-700/80 scale-90'
                }`}
                style={{ animationIterationCount: 1 }}
              >
                <Star className="w-11 h-11 fill-current" />
              </div>
            );
          })}
        </div>

        <p className="text-xs text-amber-200/90 font-bold mb-5 text-center">
          {stars === 3
            ? '★★★ Perfect Contraption Mastery!'
            : stars === 2
            ? '★★ Great Solution! Can you do it in fewer gadgets?'
            : '★ Target Reached! Well done!'}
        </p>

        {/* Stats Card */}
        <div className="w-full grid grid-cols-2 gap-2 bg-slate-800/90 rounded-2xl p-3 border border-slate-700/80 mb-5 shadow-inner">
          <div className="flex flex-col items-center">
            <span className="text-[11px] text-slate-400 font-semibold">Clear Time</span>
            <span className="text-lg font-black text-white tabular-nums">
              {elapsedSeconds.toFixed(1)}s
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[11px] text-slate-400 font-semibold">Gadgets Used</span>
            <span className="text-lg font-black text-white tabular-nums">
              {gadgetsUsed}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="w-full flex flex-col gap-2.5">
          {levelId < 200 ? (
            <button
              onClick={() => {
                sound.playClick();
                onNextLevel();
              }}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 via-emerald-400 to-green-500 hover:from-emerald-400 hover:to-green-400 text-slate-950 font-black rounded-2xl shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 text-base active:scale-95 transition-all border-b-3 border-emerald-700"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>NEXT LEVEL</span>
            </button>
          ) : (
            <button
              onClick={() => {
                sound.playClick();
                onLevelSelect();
              }}
              className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-black rounded-2xl shadow-lg flex items-center justify-center gap-2 text-base active:scale-95 transition-all"
            >
              <Trophy className="w-5 h-5" />
              <span>VICTORY ARCHIVE</span>
            </button>
          )}

          <div className="flex items-center gap-2.5 w-full">
            <button
              onClick={() => {
                sound.playClick();
                onReplay();
              }}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-bold rounded-2xl flex items-center justify-center gap-1.5 text-xs active:scale-95 transition-all"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>Replay</span>
            </button>

            <button
              onClick={() => {
                sound.playClick();
                onLevelSelect();
              }}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-bold rounded-2xl flex items-center justify-center gap-1.5 text-xs active:scale-95 transition-all"
            >
              <List className="w-4 h-4 text-sky-400" />
              <span>Level List</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
