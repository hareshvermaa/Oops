import React, { useState } from 'react';
import { Play, Map, HelpCircle, Settings, CheckCircle2, Smartphone, Star, Sparkles } from 'lucide-react';
import { sound } from '../utils/audio';

interface TitleScreenProps {
  completedCount: number;
  totalStars: number;
  onPlay: () => void;
  onWorldSelect: () => void;
  onHowToPlay: () => void;
  onSettings: () => void;
  onValidator: () => void;
  onExportGuide: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  completedCount,
  totalStars,
  onPlay,
  onWorldSelect,
  onHowToPlay,
  onSettings,
  onValidator,
  onExportGuide,
}) => {
  const [mascotWink, setMascotWink] = useState(false);

  const triggerMascotTickle = () => {
    sound.playBoing();
    setMascotWink(true);
    setTimeout(() => setMascotWink(false), 900);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-between p-5 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 text-white select-none overflow-y-auto relative">
      {/* Ambient background particles/glow */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Row with Total Stars & Settings */}
      <header className="w-full flex items-center justify-between pt-1 z-10">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl text-xs font-bold text-amber-400 shadow-sm backdrop-blur">
          <Star className="w-3.5 h-3.5 fill-current text-amber-400" />
          <span className="tabular-nums font-mono">{totalStars} / 600</span>
        </div>

        <button
          onClick={() => {
            sound.playClick();
            onSettings();
          }}
          className="p-2.5 bg-slate-900 border border-slate-800 rounded-2xl text-slate-300 hover:text-white hover:bg-slate-850 active:scale-95 transition-all shadow-sm"
          title="Game Settings"
          aria-label="Game Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </header>

      {/* Center Hero Area: Mascot & Animated Cartoon Logo */}
      <section className="flex flex-col items-center my-auto py-4 z-10">
        {/* Interactive Lovable Mascot (Egg Character) */}
        <div
          onClick={triggerMascotTickle}
          className="relative mb-3 cursor-pointer group select-none transition-transform active:scale-90"
          title="Tap mascot to tickle!"
        >
          {/* Soft contact shadow */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-20 h-4 bg-black/40 rounded-full blur-xs" />

          {/* Character Body */}
          <div className="w-22 h-24 rounded-[48%_48%_44%_44%] bg-gradient-to-b from-amber-100 via-amber-200 to-amber-300 border-4 border-slate-900 shadow-2xl flex flex-col items-center justify-center relative overflow-hidden transition-all duration-300 group-hover:scale-105">
            {/* Top Gloss Shine */}
            <div className="absolute top-2 left-3 w-5 h-7 bg-white/70 rounded-full rotate-[-25deg] blur-[0.5px]" />

            {/* Expressive Eyes */}
            <div className="flex items-center gap-2.5 mt-2">
              {/* Left Eye */}
              <div className="w-5 h-6 bg-white rounded-full border-2 border-slate-900 flex items-center justify-center relative">
                <div className="w-2.5 h-2.5 bg-slate-950 rounded-full absolute top-1.5 right-1" />
                <div className="w-1 h-1 bg-white rounded-full absolute top-1.5 right-2" />
              </div>

              {/* Right Eye */}
              <div className="w-5 h-6 bg-white rounded-full border-2 border-slate-900 flex items-center justify-center relative">
                {mascotWink ? (
                  <div className="w-3 h-1 bg-slate-950 rounded-full" />
                ) : (
                  <>
                    <div className="w-2.5 h-2.5 bg-slate-950 rounded-full absolute top-1.5 right-1" />
                    <div className="w-1 h-1 bg-white rounded-full absolute top-1.5 right-2" />
                  </>
                )}
              </div>
            </div>

            {/* Rosy Cheeks */}
            <div className="flex items-center justify-between w-14 mt-1 px-1">
              <div className="w-2.5 h-1.5 bg-pink-400/70 rounded-full" />
              <div className="w-2.5 h-1.5 bg-pink-400/70 rounded-full" />
            </div>

            {/* Cute Mouth */}
            <div className="w-3 h-2 border-b-2 border-slate-900 rounded-full -mt-0.5" />
          </div>

          {/* Mascot speech bubble hint */}
          <div className="absolute -top-3 -right-6 bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-md border border-white transform rotate-6 animate-pulse">
            TAP ME!
          </div>
        </div>

        {/* Memorable 3D Bouncing Cartoon Logo: O - O - P - S - ! */}
        <div className="flex items-center justify-center gap-1 my-1">
          <span className="text-6xl font-black text-amber-400 drop-shadow-[0_4px_0_#B45309] hover:animate-bounce">
            O
          </span>
          <span className="text-6xl font-black text-orange-400 drop-shadow-[0_4px_0_#C2410C] hover:animate-bounce" style={{ animationDelay: '0.1s' }}>
            O
          </span>
          <span className="text-6xl font-black text-rose-400 drop-shadow-[0_4px_0_#BE123C] hover:animate-bounce" style={{ animationDelay: '0.2s' }}>
            P
          </span>
          <span className="text-6xl font-black text-emerald-400 drop-shadow-[0_4px_0_#047857] hover:animate-bounce" style={{ animationDelay: '0.3s' }}>
            S
          </span>
          <span className="text-6xl font-black text-yellow-300 drop-shadow-[0_4px_0_#A16207] hover:animate-bounce" style={{ animationDelay: '0.4s' }}>
            !
          </span>
        </div>

        {/* Subtitle */}
        <p className="text-xs font-black text-amber-300/90 tracking-widest uppercase mt-1">
          Physics Chain-Reaction Toybox
        </p>

        {/* Unboxed Metadata (Frontend Design Compliant) */}
        <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
          <span>10 Themed Worlds</span>
          <span aria-hidden="true">·</span>
          <span>200 Levels</span>
          <span aria-hidden="true">·</span>
          <span>{completedCount} Cleared</span>
        </div>
      </section>

      {/* Main Buttons Dock */}
      <footer className="w-full max-w-xs flex flex-col gap-2.5 pb-2 z-10">
        {/* Play Campaign Button (Big, Tactile, Obvious) */}
        <button
          onClick={() => {
            sound.playClick();
            onPlay();
          }}
          className="w-full py-4 bg-gradient-to-r from-emerald-400 via-green-500 to-emerald-500 hover:from-emerald-300 hover:to-green-400 text-slate-950 font-black text-lg rounded-2xl shadow-xl shadow-emerald-950/60 border-b-4 border-green-700 active:scale-95 transition-all flex items-center justify-center gap-2.5"
        >
          <Play className="w-6 h-6 fill-current" />
          <span>PLAY CAMPAIGN</span>
        </button>

        {/* World Select Button */}
        <button
          onClick={() => {
            sound.playClick();
            onWorldSelect();
          }}
          className="w-full py-3 bg-slate-900 hover:bg-slate-850 border border-slate-700/80 text-white font-bold text-sm rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm"
        >
          <Map className="w-4 h-4 text-amber-400" />
          <span>World Map (10 Worlds)</span>
        </button>

        {/* Secondary Actions Grid */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              sound.playClick();
              onHowToPlay();
            }}
            className="py-2.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold text-xs rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
            <span>How to Play</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onValidator();
            }}
            className="py-2.5 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold text-xs rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
            <span>QA 200-Audit</span>
          </button>
        </div>

        {/* Android Publishing Guide Button */}
        <button
          onClick={() => {
            sound.playClick();
            onExportGuide();
          }}
          className="w-full py-2 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-[11px] font-medium text-slate-400 hover:text-slate-200 rounded-xl transition-colors flex items-center justify-center gap-1.5"
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
          <span>Android APK & AdMob Guide</span>
        </button>
      </footer>
    </div>
  );
};
