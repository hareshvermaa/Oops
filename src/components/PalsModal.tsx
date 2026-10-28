import React from 'react';
import { X } from 'lucide-react';
import { PAL_IDS } from '../game/director';
import { sound } from '../utils/audio';

export const PalsModal: React.FC<{ pals: string[]; onClose: () => void }> = ({ pals, onClose }) => (
  <div className="fixed inset-0 z-50 bg-sky-900/40 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-white w-full max-w-sm rounded-[32px] p-5 shadow-2xl animate-scaleUp border-4 border-sky-200">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-black text-sky-600">My Pals 🥚</h3>
          <p className="text-[11px] text-slate-500 font-semibold">
            {pals.length}/{PAL_IDS.length} collected · find mystery eggs by clearing levels
          </p>
        </div>
        <button
          onClick={() => {
            sound.playClick();
            onClose();
          }}
          className="p-2 text-slate-400 hover:text-slate-700"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {PAL_IDS.map((p) => {
          const owned = pals.includes(p);
          return (
            <div
              key={p}
              className={`aspect-square rounded-2xl flex items-center justify-center text-3xl ${
                owned ? 'bg-amber-50 border-2 border-amber-200' : 'bg-slate-100 border-2 border-dashed border-slate-200'
              }`}
            >
              {owned ? p : <span className="text-slate-300 text-xl font-black">?</span>}
            </div>
          );
        })}
      </div>
    </div>
  </div>
);
