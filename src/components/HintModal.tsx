import React from 'react';
import { LevelDefinition } from '../types/game';
import { Lightbulb, X, Eye, Wand2, Tv, Coins } from 'lucide-react';
import { sound } from '../utils/audio';

interface HintModalProps {
  level: LevelDefinition;
  hintsRemaining: number;
  coins: number;
  hintCoinCost: number;
  onClose: () => void;
  onRevealGhost: () => void;
  onAutoPlaceOne: () => void;
  onWatchAdForHints: () => void;
  onBuyHints: () => void;
}

export const HintModal: React.FC<HintModalProps> = ({
  level,
  hintsRemaining,
  coins,
  hintCoinCost,
  onClose,
  onRevealGhost,
  onAutoPlaceOne,
  onWatchAdForHints,
  onBuyHints,
}) => {
  const out = hintsRemaining <= 0;
  const click = (fn: () => void) => () => {
    sound.playClick();
    fn();
  };
  return (
    <div className="fixed inset-0 z-50 bg-amber-900/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border-4 border-amber-200 w-full max-w-sm rounded-[32px] p-5 text-slate-800 shadow-2xl flex flex-col animate-scaleUp">
        <div className="flex items-center justify-between pb-3 border-b border-amber-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 rounded-2xl text-amber-500">
              <Lightbulb className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="text-base font-black">Need an idea?</h3>
              <span className="text-[11px] text-amber-600 font-bold">{hintsRemaining} hints left</span>
            </div>
          </div>
          <button onClick={click(onClose)} className="p-1.5 text-slate-400 hover:text-slate-700" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-amber-50 p-3 rounded-2xl border border-amber-100 my-3">
          <p className="text-xs text-slate-700 font-semibold leading-relaxed">💡 {level.hintTip}</p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            disabled={out}
            onClick={click(onRevealGhost)}
            className="w-full py-3 bg-sky-100 text-sky-700 font-black rounded-2xl flex items-center justify-center gap-2 text-sm active:scale-95 disabled:opacity-40"
          >
            <Eye className="w-4 h-4" /> Show me where (1 hint)
          </button>
          <button
            disabled={out}
            onClick={click(onAutoPlaceOne)}
            className="w-full py-3 bg-emerald-100 text-emerald-700 font-black rounded-2xl flex items-center justify-center gap-2 text-sm active:scale-95 disabled:opacity-40"
          >
            <Wand2 className="w-4 h-4" /> Place one for me (1 hint)
          </button>
        </div>

        {out && (
          <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-amber-100">
            <button
              onClick={click(onWatchAdForHints)}
              className="w-full py-3 bg-purple-100 text-purple-700 font-black rounded-2xl flex items-center justify-center gap-2 text-sm active:scale-95"
            >
              <Tv className="w-4 h-4" /> Watch a short ad: +3 hints
            </button>
            <button
              disabled={coins < hintCoinCost}
              onClick={click(onBuyHints)}
              className="w-full py-3 bg-amber-100 text-amber-700 font-black rounded-2xl flex items-center justify-center gap-2 text-sm active:scale-95 disabled:opacity-40"
            >
              <Coins className="w-4 h-4" /> {hintCoinCost} coins: +3 hints
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
