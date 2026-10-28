import React, { useState } from 'react';
import { Play, HelpCircle, Settings, Star, Gift, Coins, Flame, Smartphone, CheckCircle2, Gem, Sparkles } from 'lucide-react';
import { sound } from '../utils/audio';
import { EndlessState } from '../types/game';
import { PAL_IDS } from '../game/director';

interface TitleScreenProps {
  endless: EndlessState;
  dailyReady: boolean;
  onPlay: () => void;
  onDaily: () => void;
  onProgression: () => void;
  onPals: () => void;
  onHowToPlay: () => void;
  onSettings: () => void;
  onValidator: () => void;
  onExportGuide: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  endless,
  dailyReady,
  onPlay,
  onDaily,
  onProgression,
  onPals,
  onHowToPlay,
  onSettings,
  onValidator,
  onExportGuide,
}) => {
  const [mascotWink, setMascotWink] = useState(false);
  const isDev = import.meta.env?.DEV ?? false;

  const tickle = () => {
    sound.playBoing();
    setMascotWink(true);
    setTimeout(() => setMascotWink(false), 900);
  };

  const logo: [string, string, string][] = [
    ['O', 'text-amber-400', '#B45309'],
    ['O', 'text-orange-400', '#C2410C'],
    ['P', 'text-rose-400', '#BE123C'],
    ['S', 'text-emerald-400', '#047857'],
    ['!', 'text-sky-400', '#0369A1'],
  ];

  return (
    <div className="w-full h-full flex flex-col items-center justify-between p-5 bg-gradient-to-b from-sky-200 via-pink-100 to-amber-100 text-slate-800 select-none overflow-y-auto relative">
      <div className="absolute top-8 left-6 text-3xl opacity-70 animate-bounce pointer-events-none">☁️</div>
      <div className="absolute top-24 right-8 text-2xl opacity-70 pointer-events-none">⭐</div>
      <div className="absolute top-44 left-10 text-xl opacity-60 pointer-events-none">✨</div>

      <header className="w-full flex items-center justify-between pt-1 z-10">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-3 py-1.5 bg-white/80 rounded-2xl text-xs font-black text-amber-600 shadow-sm">
            <Coins className="w-3.5 h-3.5" />
            <span className="tabular-nums">{endless.coins}</span>
          </div>
          <div className="flex items-center gap-1 px-3 py-1.5 bg-white/80 rounded-2xl text-xs font-black text-orange-500 shadow-sm">
            <Flame className="w-3.5 h-3.5" />
            <span className="tabular-nums">{endless.streak}</span>
          </div>
          <div className="flex items-center gap-1 px-3 py-1.5 bg-white/80 rounded-2xl text-xs font-black text-violet-700 shadow-sm">
            <Gem className="w-3.5 h-3.5" />
            <span className="tabular-nums">{endless.gems}</span>
          </div>
        </div>
        <button
          onClick={() => {
            sound.playClick();
            onSettings();
          }}
          className="p-2.5 bg-white/80 rounded-2xl text-slate-600 active:scale-95 transition-all shadow-sm"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </header>

      <section className="flex flex-col items-center my-auto py-4 z-10">
        <div onClick={tickle} className="relative mb-3 cursor-pointer select-none transition-transform active:scale-90" title="Tap me!">
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-black/20 rounded-full blur-sm" />
          <div className="w-24 h-28 rounded-[48%_48%_44%_44%] bg-gradient-to-b from-yellow-50 via-amber-100 to-amber-200 border-4 border-amber-900/80 shadow-xl flex flex-col items-center justify-center relative overflow-hidden animate-[wiggle_2.4s_ease-in-out_infinite]">
            <div className="absolute top-2 left-4 w-5 h-7 bg-white/80 rounded-full rotate-[-25deg]" />
            <div className="flex items-center gap-3 mt-2">
              <div className="w-5 h-6 bg-white rounded-full border-2 border-slate-900 flex items-center justify-center relative">
                <div className="w-2.5 h-3 bg-slate-950 rounded-full" />
              </div>
              <div className="w-5 h-6 bg-white rounded-full border-2 border-slate-900 flex items-center justify-center relative">
                {mascotWink ? <div className="w-3 h-1 bg-slate-950 rounded-full" /> : <div className="w-2.5 h-3 bg-slate-950 rounded-full" />}
              </div>
            </div>
            <div className="flex items-center justify-between w-16 mt-1 px-1">
              <div className="w-3 h-2 bg-pink-400/80 rounded-full" />
              <div className="w-3 h-2 bg-pink-400/80 rounded-full" />
            </div>
            <div className="w-4 h-2.5 border-b-2 border-slate-900 rounded-full -mt-0.5" />
          </div>
          <div className="absolute -top-3 -right-8 bg-pink-400 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md border-2 border-white rotate-6 animate-pulse">
            TAP ME!
          </div>
        </div>

        <div className="flex items-center justify-center gap-1 my-1">
          {logo.map(([ch, color, shadow], i) => (
            <span
              key={i}
              className={`text-6xl font-black ${color} hover:animate-bounce`}
              style={{ textShadow: `0 4px 0 ${shadow}`, animationDelay: `${i * 0.1}s` }}
            >
              {ch}
            </span>
          ))}
        </div>
        <p className="text-xs font-black text-pink-500 tracking-widest uppercase mt-1">Cute Physics Chain Reactions</p>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold mt-3">
          <span>Level {endless.level}</span>
          <span aria-hidden="true">·</span>
          <span className="flex items-center gap-0.5">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            {endless.totalStars}
          </span>
          <span aria-hidden="true">·</span>
          <span>∞ levels</span>
        </div>
      </section>

      <footer className="w-full max-w-xs flex flex-col gap-2.5 pb-2 z-10">
        <button
          onClick={() => {
            sound.playClick();
            onPlay();
          }}
          className="w-full py-4 bg-gradient-to-r from-emerald-400 to-green-400 text-white font-black text-xl rounded-3xl shadow-lg shadow-emerald-300/60 border-b-4 border-green-600 active:scale-95 transition-all flex items-center justify-center gap-2.5"
        >
          <Play className="w-6 h-6 fill-current" />
          <span>{endless.level > 1 ? `PLAY · LEVEL ${endless.level}` : 'PLAY'}</span>
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              sound.playClick();
              onDaily();
            }}
            className={`py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all border-b-4 ${
              dailyReady
                ? 'bg-pink-400 text-white border-pink-600 animate-pulse'
                : 'bg-white/70 text-slate-400 border-slate-200'
            }`}
          >
            <Gift className="w-4 h-4" />
            <span>{dailyReady ? 'DAILY GIFT!' : 'Gift claimed'}</span>
          </button>
          <button
            onClick={() => {
              sound.playClick();
              onPals();
            }}
            className="py-3 bg-sky-400 text-white border-b-4 border-sky-600 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all"
          >
            <span>🥚</span>
            <span>
              PALS {endless.pals.length}/{PAL_IDS.length}
            </span>
          </button>
        </div>

        <button
          onClick={() => {
            sound.playClick();
            onProgression();
          }}
          className="w-full py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-black text-xs rounded-2xl shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Sparkles className="w-4 h-4" />
          <span>GAME HUB · Spin · Village · Collect</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            onHowToPlay();
          }}
          className="w-full py-2.5 bg-white/70 text-slate-600 font-bold text-xs rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-1.5"
        >
          <HelpCircle className="w-3.5 h-3.5 text-sky-500" />
          <span>How to Play</span>
        </button>

        {isDev && (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onValidator} className="py-2 bg-slate-800/80 text-slate-200 text-[10px] rounded-xl flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> DEV: QA
            </button>
            <button onClick={onExportGuide} className="py-2 bg-slate-800/80 text-slate-200 text-[10px] rounded-xl flex items-center justify-center gap-1">
              <Smartphone className="w-3 h-3" /> DEV: Android
            </button>
          </div>
        )}
      </footer>
    </div>
  );
};
