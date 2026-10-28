import React from 'react';
import { GadgetType, PlacedGadget, SimulationMode } from '../types/game';
import { Play, Square, RotateCw, Trash2, Plus, Minus, RotateCcw } from 'lucide-react';
import { sound } from '../utils/audio';

interface GadgetTrayProps {
  availableGadgets: Record<string, number>;
  placedGadgets: PlacedGadget[];
  selectedGadgetId: string | null;
  simulationMode: SimulationMode;
  onAddGadget: (type: GadgetType) => void;
  onUpdateAngle: (angle: number) => void;
  onDeleteSelected: () => void;
  onClearAll: () => void;
  onGo: () => void;
  onReset: () => void;
}

const GADGET_METADATA: Record<
  GadgetType,
  { label: string; icon: string; desc: string; color: string }
> = {
  wood_ramp: {
    label: 'Ramp',
    icon: '📐',
    desc: 'Rolls & directs objects',
    color: 'bg-amber-100 border-amber-300 text-amber-900',
  },
  bouncy_pad: {
    label: 'Bouncy Pad',
    icon: '🌸',
    desc: 'High spring rebound',
    color: 'bg-pink-100 border-pink-300 text-pink-900',
  },
  wind_fan: {
    label: 'Wind Fan',
    icon: '💨',
    desc: 'Pushes items through air',
    color: 'bg-sky-100 border-sky-300 text-sky-900',
  },
  domino_block: {
    label: 'Domino',
    icon: '🀄',
    desc: 'Knocks over & transfers force',
    color: 'bg-slate-100 border-slate-300 text-slate-900',
  },
  seesaw: {
    label: 'Seesaw',
    icon: '⚖️',
    desc: 'Pivoting catapult lever',
    color: 'bg-emerald-100 border-emerald-300 text-emerald-900',
  },
  spring_launcher: {
    label: 'Spring Box',
    icon: '⚡',
    desc: 'Explosive mechanical launch',
    color: 'bg-orange-100 border-orange-300 text-orange-900',
  },
};

export const GadgetTray: React.FC<GadgetTrayProps> = ({
  availableGadgets,
  placedGadgets,
  selectedGadgetId,
  simulationMode,
  onAddGadget,
  onUpdateAngle,
  onDeleteSelected,
  onClearAll,
  onGo,
  onReset,
}) => {
  const isRunning = simulationMode === 'RUNNING';

  const placedCounts: Record<string, number> = {};
  for (const g of placedGadgets) {
    placedCounts[g.type] = (placedCounts[g.type] || 0) + 1;
  }

  const selectedGadget = placedGadgets.find((g) => g.id === selectedGadgetId);

  const adjustAngleBy = (delta: number) => {
    if (!selectedGadget) return;
    let newAngle = (selectedGadget.angle + delta) % 360;
    if (newAngle < 0) newAngle += 360;
    sound.playClick();
    onUpdateAngle(newAngle);
  };

  return (
    <div className="w-full bg-white/95 border-t-2 border-pink-100 p-2.5 flex flex-col gap-2 z-20 backdrop-blur">
      {/* Selected Gadget Continuous Angle Slider & Fine Adjustment */}
      {selectedGadget && !isRunning && (
        <div className="flex flex-col gap-1.5 px-3 py-2 bg-pink-50 rounded-2xl border border-pink-200 animate-fadeIn">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <span>{GADGET_METADATA[selectedGadget.type]?.icon}</span>
              <span>{GADGET_METADATA[selectedGadget.type]?.label || 'Gadget'}</span>
            </span>

            <div className="flex items-center gap-2">
              <span className="font-mono text-amber-600 font-bold bg-white px-2 py-0.5 rounded-md border border-pink-200">
                {Math.round(selectedGadget.angle)}°
              </span>
              <button
                onClick={() => {
                  sound.playClick();
                  onDeleteSelected();
                }}
                className="flex items-center gap-1 px-2 py-0.5 bg-rose-600/80 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold active:scale-95 transition-all"
                title="Remove Gadget"
              >
                <Trash2 className="w-3 h-3" />
                <span>Remove</span>
              </button>
            </div>
          </div>

          {/* Continuous Angle Slider & Step Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => adjustAngleBy(-15)}
              className="px-2 py-1 bg-pink-100 hover:bg-pink-200 text-pink-700 rounded-lg text-[10px] font-bold active:scale-95 transition-all"
              title="-15 degrees"
            >
              -15°
            </button>
            <button
              onClick={() => adjustAngleBy(-1)}
              className="p-1 bg-pink-100 hover:bg-pink-200 text-pink-700 rounded-lg text-[10px] active:scale-95 transition-all"
              title="-1 degree"
            >
              <Minus className="w-3 h-3" />
            </button>

            <input
              type="range"
              min="0"
              max="359"
              value={selectedGadget.angle}
              onChange={(e) => onUpdateAngle(Number(e.target.value))}
              className="flex-1 accent-amber-500 h-1.5 bg-pink-100 rounded-lg appearance-none cursor-pointer"
            />

            <button
              onClick={() => adjustAngleBy(1)}
              className="p-1 bg-pink-100 hover:bg-pink-200 text-pink-700 rounded-lg text-[10px] active:scale-95 transition-all"
              title="+1 degree"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              onClick={() => adjustAngleBy(15)}
              className="px-2 py-1 bg-pink-100 hover:bg-pink-200 text-pink-700 rounded-lg text-[10px] font-bold active:scale-95 transition-all"
              title="+15 degrees"
            >
              +15°
            </button>
          </div>
        </div>
      )}

      {/* Main Tray Row: Inventory Gadgets + Clear Layout + Big GO/RESET Button */}
      <div className="flex items-center justify-between gap-3">
        {/* Scrollable Gadget Inventory */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none flex-1">
          {Object.entries(availableGadgets).map(([gadgetType, maxCount]) => {
            const type = gadgetType as GadgetType;
            const meta = GADGET_METADATA[type];
            if (!meta) return null;

            const used = placedCounts[type] || 0;
            const remaining = maxCount - used;
            const canAdd = remaining > 0 && !isRunning;

            return (
              <button
                key={type}
                disabled={!canAdd}
                onClick={() => {
                  sound.playClick();
                  onAddGadget(type);
                }}
                className={`flex flex-col items-center justify-center min-w-[70px] h-[68px] rounded-xl border p-1.5 transition-all relative select-none ${
                  canAdd
                    ? 'bg-white hover:bg-pink-50 border-pink-200 active:scale-95 text-slate-700 shadow-sm'
                    : 'bg-slate-100 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
                }`}
              >
                <span className="text-xl leading-none mb-1">{meta.icon}</span>
                <span className="text-[10px] font-semibold tracking-tight truncate max-w-full">
                  {meta.label}
                </span>

                {/* Remaining Quantity Badge */}
                <span
                  className={`absolute -top-1.5 -right-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    remaining > 0
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {remaining}
                </span>
              </button>
            );
          })}
        </div>

        {/* Clear Layout Button if items placed */}
        {placedGadgets.length > 0 && !isRunning && (
          <button
            onClick={() => {
              sound.playClick();
              onClearAll();
            }}
            className="p-2.5 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-xl border border-slate-200 transition-colors"
            title="Clear all placed gadgets"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}

        {/* Big GO / RESET Action Button */}
        <div className="shrink-0">
          {!isRunning ? (
            <button
              onClick={() => {
                sound.playClick();
                onGo();
              }}
              className="flex items-center justify-center gap-2 w-28 h-14 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-extrabold text-lg rounded-2xl shadow-lg shadow-emerald-950/40 active:scale-95 transition-all border-b-4 border-green-700"
            >
              <Play className="w-6 h-6 fill-current" />
              <span>GO!</span>
            </button>
          ) : (
            <button
              onClick={() => {
                sound.playClick();
                onReset();
              }}
              className="flex items-center justify-center gap-2 w-28 h-14 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-rose-950/40 active:scale-95 transition-all border-b-4 border-red-700"
            >
              <Square className="w-5 h-5 fill-current" />
              <span>RESET</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
