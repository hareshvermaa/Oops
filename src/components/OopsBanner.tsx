import React from 'react';
import { RotateCcw, Lightbulb, Shuffle } from 'lucide-react';
import { sound } from '../utils/audio';

const LINES = [
  'Whoopsie! So close… 🙈',
  'Oopsie-daisy! Try again!',
  'Almost! Give it a tiny nudge.',
  'The egg has big plans. Not these ones!',
  'Boing… and gone! Retry?',
  'That was a fun mistake!',
  'Plot twist! Let\u2019s try another way.',
];

interface OopsBannerProps {
  fails: number;
  nearMiss: boolean;
  onRetry: () => void;
  onHint: () => void;
  onSwap: () => void;
}

export const OopsBanner: React.FC<OopsBannerProps> = ({ fails, nearMiss, onRetry, onHint, onSwap }) => {
  const line = nearMiss ? 'So close! A tiny nudge could do it!' : LINES[(fails - 1) % LINES.length];
  return (
    <div className="absolute inset-x-3 bottom-3 z-30 animate-popIn">
      <div className="bg-white/95 border-4 border-pink-300 rounded-3xl p-3 shadow-2xl flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-3xl">😵‍💫</span>
          <div className="flex flex-col">
            <span className="text-lg font-black text-pink-500 leading-none">OOPS!</span>
            <span className="text-xs font-bold text-slate-500">{line}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              sound.playClick();
              onRetry();
            }}
            className="flex-1 py-2.5 bg-gradient-to-r from-amber-300 to-orange-300 text-amber-950 font-black rounded-2xl flex items-center justify-center gap-1.5 text-sm active:scale-95 border-b-4 border-orange-500"
          >
            <RotateCcw className="w-4 h-4" />
            <span>TRY AGAIN</span>
          </button>
          {fails >= 3 && (
            <button
              onClick={() => {
                sound.playClick();
                onHint();
              }}
              className="px-3 py-2.5 bg-sky-100 text-sky-700 font-black rounded-2xl flex items-center gap-1 text-xs active:scale-95"
            >
              <Lightbulb className="w-4 h-4" />
              <span>Help</span>
            </button>
          )}
          {fails >= 5 && (
            <button
              onClick={() => {
                sound.playClick();
                onSwap();
              }}
              className="px-3 py-2.5 bg-purple-100 text-purple-700 font-black rounded-2xl flex items-center gap-1 text-xs active:scale-95"
            >
              <Shuffle className="w-4 h-4" />
              <span>Easier</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
