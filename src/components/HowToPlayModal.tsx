import React from 'react';
import { X, Play, RotateCw, Hand, Target } from 'lucide-react';
import { sound } from '../utils/audio';

interface HowToPlayModalProps {
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-3xl p-5 text-white shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-lg font-bold text-white">How to Play OOPS!</h3>
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

        {/* Steps */}
        <div className="flex flex-col gap-4 my-4">
          <div className="flex items-start gap-3 p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl shrink-0 mt-0.5">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-0.5">1. Check the Goal</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Every level has a goal (like delivering an egg into the frying pan, or ringing an alarm clock).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl shrink-0 mt-0.5">
              <Hand className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-0.5">2. Drag & Rotate Gadgets</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Tap items in your inventory tray (wooden ramps, bouncy pads, wind fans). Drag them on screen, and tap to rotate them 45°.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0 mt-0.5">
              <Play className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-0.5">3. Tap GO!</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Hit the green GO! button to start the real physics simulation. Watch the chain reaction unfold! If you miss, tap Reset to tweak.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl text-xs transition-colors active:scale-95"
        >
          Let's Play!
        </button>
      </div>
    </div>
  );
};
