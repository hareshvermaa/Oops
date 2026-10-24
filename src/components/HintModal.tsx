import React from 'react';
import { LevelDefinition, PlacedGadget } from '../types/game';
import { Lightbulb, X, Check, Eye, Wand2 } from 'lucide-react';
import { sound } from '../utils/audio';

interface HintModalProps {
  level: LevelDefinition;
  hintsRemaining: number;
  onClose: () => void;
  onRevealGhost: () => void;
  onAutoPlaceOne: () => void;
}

export const HintModal: React.FC<HintModalProps> = ({
  level,
  hintsRemaining,
  onClose,
  onRevealGhost,
  onAutoPlaceOne,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-amber-500/50 w-full max-w-sm rounded-3xl p-5 text-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400">
              <Lightbulb className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Need an Idea?</h3>
              <span className="text-[11px] text-amber-400 font-medium">
                {hintsRemaining} Free Hints Available
              </span>
            </div>
          </div>

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

        {/* 3-Tier Hint System */}
        <div className="flex flex-col gap-3 my-4">
          {/* Tier 1: Strategy Clue */}
          <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300 mb-1">
              <span>Tier 1 · Strategy Tip</span>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed font-medium">
              "{level.hintTip}"
            </p>
          </div>

          {/* Tier 2: Ghost Silhouette Reveal */}
          <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400">
                Tier 2 · Ghost Silhouette
              </span>
              <span className="text-[10px] text-slate-400">Free</span>
            </div>
            <p className="text-xs text-slate-300">
              Shows a translucent green outline of where to place a key gadget.
            </p>
            <button
              onClick={() => {
                sound.playClick();
                onRevealGhost();
                onClose();
              }}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <Eye className="w-4 h-4" />
              <span>Show Ghost Outline</span>
            </button>
          </div>

          {/* Tier 3: Auto Place Gadget */}
          <div className="bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400">
                Tier 3 · Auto Placement
              </span>
              <span className="text-[10px] text-amber-400 font-bold">1 Hint Token</span>
            </div>
            <p className="text-xs text-slate-300">
              Instantly positions the primary gadget for you into the optimal angle.
            </p>
            <button
              disabled={hintsRemaining <= 0}
              onClick={() => {
                sound.playClick();
                onAutoPlaceOne();
                onClose();
              }}
              className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all ${
                hintsRemaining > 0
                  ? 'bg-blue-600 hover:bg-blue-500 text-white'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Wand2 className="w-4 h-4" />
              <span>Auto Place Gadget</span>
            </button>
          </div>
        </div>

        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="w-full py-2.5 bg-slate-800 text-slate-300 font-semibold rounded-xl text-xs hover:bg-slate-700 transition-colors"
        >
          Got it, let me try!
        </button>
      </div>
    </div>
  );
};
