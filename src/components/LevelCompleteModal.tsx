import React, { useEffect, useState } from 'react';
import { Play, RotateCcw, Star, Coins, Flame, Loader2, Tv } from 'lucide-react';
import { sound } from '../utils/audio';
import { RewardSummary } from '../game/director';

interface LevelCompleteModalProps {
  levelNumber: number;
  levelTitle: string;
  reward: RewardSummary;
  doubled: boolean;
  nextReady: boolean;
  onNextLevel: () => void;
  onReplay: () => void;
  onDoubleCoins: () => void;
}

export const LevelCompleteModal: React.FC<LevelCompleteModalProps> = ({
  levelNumber,
  levelTitle,
  reward,
  doubled,
  nextReady,
  onNextLevel,
  onReplay,
  onDoubleCoins,
}) => {
  const [revealed, setRevealed] = useState(0);
  const [showEgg, setShowEgg] = useState(false);

  useEffect(() => {
    setRevealed(0);
    setShowEgg(false);
    const timers: number[] = [];
    for (let i = 1; i <= reward.stars; i++) {
      timers.push(
        window.setTimeout(() => {
          setRevealed(i);
          sound.playStarPop(i);
        }, i * 260)
      );
    }
    if (reward.bonusEgg) timers.push(window.setTimeout(() => setShowEgg(true), reward.stars * 260 + 500));
    return () => timers.forEach(clearTimeout);
  }, [reward]);

  const lucky = reward.luckyMultiplier > 1;

  return (
    <div className="fixed inset-0 z-50 bg-pink-900/40 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-gradient-to-b from-white via-pink-50 to-amber-50 border-4 border-white w-full max-w-sm rounded-[36px] p-5 text-slate-800 shadow-2xl flex flex-col items-center animate-scaleUp relative overflow-hidden">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-300 to-yellow-200 border-4 border-white shadow-lg flex items-center justify-center animate-bounce">
          <span className="text-3xl">{lucky ? '🍀' : '🥳'}</span>
        </div>
        <span className="text-pink-500 font-black text-xs tracking-widest uppercase mt-2">
          {lucky ? 'Lucky level!' : `Level ${levelNumber} cleared!`}
        </span>
        <h2 className="text-xl font-black text-center text-slate-800 mt-0.5 max-w-[280px] truncate">{levelTitle}</h2>
        <p className="text-xs text-slate-500 font-bold mt-1 text-center">{reward.encouragement}</p>

        <div className="flex items-center gap-3 my-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`transition-all duration-300 ${
                i <= revealed ? 'text-amber-400 scale-125 drop-shadow-[0_0_10px_rgba(251,191,36,0.9)]' : 'text-slate-200 scale-90'
              }`}
            >
              <Star className="w-11 h-11 fill-current" />
            </div>
          ))}
        </div>

        <div className="w-full grid grid-cols-2 gap-2 mb-3">
          <div className="bg-amber-100 rounded-2xl p-2.5 flex flex-col items-center">
            <span className="text-[11px] text-amber-700 font-bold flex items-center gap-1">
              <Coins className="w-3 h-3" /> Coins
            </span>
            <span className="text-lg font-black text-amber-600 tabular-nums">
              +{doubled ? reward.coins * 2 : reward.coins}
              {lucky && ' ✨'}
            </span>
          </div>
          <div className="bg-orange-100 rounded-2xl p-2.5 flex flex-col items-center">
            <span className="text-[11px] text-orange-700 font-bold flex items-center gap-1">
              <Flame className="w-3 h-3" /> Streak
            </span>
            <span className="text-lg font-black text-orange-500 tabular-nums">{reward.streak}</span>
          </div>
        </div>

        {showEgg && (
          <div className="w-full bg-sky-100 border-2 border-sky-300 rounded-2xl p-2.5 mb-3 flex items-center gap-3 animate-popIn">
            <span className="text-4xl">{reward.newPal ?? '🥚'}</span>
            <div className="flex flex-col">
              <span className="text-xs font-black text-sky-700">
                {reward.newPal ? 'A mystery egg hatched!' : 'Mystery egg!'}
              </span>
              <span className="text-[11px] text-sky-600 font-semibold">
                {reward.newPal ? 'New pal added to your collection!' : `You already have every pal: +${reward.duplicatePalCoins} coins`}
              </span>
            </div>
          </div>
        )}

        <div className="w-full flex flex-col gap-2">
          <button
            onClick={() => {
              sound.playClick();
              onNextLevel();
            }}
            disabled={!nextReady}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-400 to-green-400 text-white font-black rounded-3xl shadow-lg shadow-emerald-300/60 flex items-center justify-center gap-2 text-lg active:scale-95 transition-all border-b-4 border-green-600 disabled:opacity-70"
          >
            {nextReady ? <Play className="w-5 h-5 fill-current" /> : <Loader2 className="w-5 h-5 animate-spin" />}
            <span>{nextReady ? 'NEXT LEVEL' : 'Baking next puzzle…'}</span>
          </button>

          <div className="flex gap-2">
            {!doubled && (
              <button
                onClick={() => {
                  sound.playClick();
                  onDoubleCoins();
                }}
                className="flex-1 py-2.5 bg-purple-100 text-purple-700 font-bold rounded-2xl flex items-center justify-center gap-1.5 text-xs active:scale-95 transition-all"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Double coins</span>
              </button>
            )}
            <button
              onClick={() => {
                sound.playClick();
                onReplay();
              }}
              className="flex-1 py-2.5 bg-white text-slate-600 font-bold rounded-2xl flex items-center justify-center gap-1.5 text-xs border border-slate-200 active:scale-95 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
              <span>Replay</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
