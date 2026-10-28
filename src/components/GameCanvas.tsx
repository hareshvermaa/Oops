import React, { useEffect, useRef, useState, useCallback } from 'react';
import { LevelDefinition, PlacedGadget, SimulationMode } from '../types/game';
import { PhysicsEngine } from '../game/PhysicsEngine';
import { sound } from '../utils/audio';

interface GameCanvasProps {
  level: LevelDefinition;
  placedGadgets: PlacedGadget[];
  simulationMode: SimulationMode;
  selectedGadgetId: string | null;
  ghostHintGadget: PlacedGadget | null;
  onSelectGadget: (id: string | null) => void;
  onUpdateGadgetPosition: (id: string, x: number, y: number) => void;
  onUpdateGadgetAngle: (id: string, angle: number) => void;
  onWin: () => void;
  onFail?: (info: { reason: 'stuck' | 'timeout'; nearMiss: boolean }) => void;
}

type DragMode = 'TRANSLATE' | 'ROTATE' | null;

export const GameCanvas: React.FC<GameCanvasProps> = ({
  level,
  placedGadgets,
  simulationMode,
  selectedGadgetId,
  ghostHintGadget,
  onSelectGadget,
  onUpdateGadgetPosition,
  onUpdateGadgetAngle,
  onWin,
  onFail,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<PhysicsEngine | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [activeGadgetId, setActiveGadgetId] = useState<string | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Use a ref for onWin to guarantee the engine always executes the freshest closure!
  const onWinRef = useRef(onWin);
  onWinRef.current = onWin;
  const onFailRef = useRef(onFail);
  onFailRef.current = onFail;

  // Initialize and reload engine on level change
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new PhysicsEngine(
      canvasRef.current,
      level,
      () => {
        onWinRef.current();
      },
      () => {
        // impact callback
      }
    );
    engineRef.current = engine;
    engine.setFailCallback((reason) => {
      const stats = engine.getRunStats();
      const goalW = level.targetZone.width || 140;
      onFailRef.current?.({ reason, nearMiss: stats.minDistToTarget < goalW * 0.9 + 70 });
    });
    engine.setGadgets(placedGadgets);
    engine.setSelectedGadgetId(selectedGadgetId);
    engine.setGhostHintGadget(ghostHintGadget);
    engine.startRenderLoop();

    return () => {
      engine.destroy();
    };
  }, [level]);

  // Keep winCallback current on every render
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setWinCallback(() => onWinRef.current());
    }
  });

  // Keep placed gadgets in sync
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setGadgets(placedGadgets);
    }
  }, [placedGadgets]);

  // Keep selection and ghost hint in sync with renderer
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setSelectedGadgetId(selectedGadgetId);
      engineRef.current.setGhostHintGadget(ghostHintGadget);
    }
  }, [selectedGadgetId, ghostHintGadget]);

  // Handle simulation mode switches
  useEffect(() => {
    if (!engineRef.current) return;
    if (simulationMode === 'RUNNING') {
      // Always start from a clean initial state (also when retrying straight after an OOPS)
      engineRef.current.resetSimulation();
      engineRef.current.startSimulation();
    } else if (simulationMode === 'SETUP') {
      engineRef.current.resetSimulation();
    }
  }, [simulationMode]);

  // Convert client pointer coordinates to canvas space (720 x 980)
  const getCanvasCoords = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (simulationMode === 'RUNNING') return;

    const { x, y } = getCanvasCoords(e);

    // 1. Check if user clicked the rotation handle of the currently selected gadget
    if (selectedGadgetId) {
      const selectedGadget = placedGadgets.find((g) => g.id === selectedGadgetId);
      if (selectedGadget) {
        const rad = (selectedGadget.angle * Math.PI) / 180;
        // Rotation handle position is 85px at angle (selectedGadget.angle - 90)
        const handleAngle = rad - Math.PI / 2;
        const hx = selectedGadget.x + Math.cos(handleAngle) * 85;
        const hy = selectedGadget.y + Math.sin(handleAngle) * 85;
        const distToHandle = Math.hypot(hx - x, hy - y);

        if (distToHandle < 30) {
          sound.playClick();
          setDragMode('ROTATE');
          setActiveGadgetId(selectedGadget.id);
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          return;
        }
      }
    }

    // 2. Check if user clicked on any gadget body
    let clickedGadget: PlacedGadget | null = null;
    for (let i = placedGadgets.length - 1; i >= 0; i--) {
      const g = placedGadgets[i];
      const dist = Math.hypot(g.x - x, g.y - y);
      if (dist < 60) {
        clickedGadget = g;
        break;
      }
    }

    if (clickedGadget) {
      sound.playClick();
      onSelectGadget(clickedGadget.id);
      setDragMode('TRANSLATE');
      setActiveGadgetId(clickedGadget.id);
      dragOffsetRef.current = {
        x: clickedGadget.x - x,
        y: clickedGadget.y - y,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } else {
      onSelectGadget(null);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeGadgetId || simulationMode === 'RUNNING') return;

    const { x, y } = getCanvasCoords(e);
    const targetGadget = placedGadgets.find((g) => g.id === activeGadgetId);
    if (!targetGadget) return;

    if (dragMode === 'ROTATE') {
      // Compute angle from gadget center to pointer
      const dx = x - targetGadget.x;
      const dy = y - targetGadget.y;
      const rad = Math.atan2(dy, dx);
      let deg = Math.round((rad * 180) / Math.PI) + 90;
      if (deg < 0) deg += 360;
      if (deg >= 360) deg -= 360;
      onUpdateGadgetAngle(activeGadgetId, deg);
    } else if (dragMode === 'TRANSLATE') {
      const newX = Math.max(50, Math.min(670, x + dragOffsetRef.current.x));
      const newY = Math.max(60, Math.min(920, y + dragOffsetRef.current.y));
      onUpdateGadgetPosition(activeGadgetId, Math.round(newX), Math.round(newY));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeGadgetId) {
      setActiveGadgetId(null);
      setDragMode(null);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // already released
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full flex-1 min-h-0 flex items-center justify-center bg-pink-50 overflow-hidden touch-none p-1.5"
    >
      <canvas
        ref={canvasRef}
        width={720}
        height={980}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="w-auto h-auto max-w-full max-h-full aspect-[720/980] shadow-2xl rounded-xl cursor-grab active:cursor-grabbing block"
        style={{ touchAction: 'none' }}
      />

      {/* Guided explanations are intentionally limited to the first two levels. */}
      {(level.id === 1 || level.id === 2) && simulationMode === 'SETUP' && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-pink-400 text-white font-black px-3 py-1.5 rounded-2xl shadow-xl text-[11px] flex items-center gap-1.5 animate-bounce pointer-events-none z-30 border-2 border-white max-w-[90%] text-center">
          <span>{placedGadgets.length === 0 ? '👇' : '✨'}</span>
          <span>
            {level.id === 1
              ? placedGadgets.length === 0
                ? 'Drag a Ramp into place, then press GO!'
                : 'Drag to position, use the angle control, then press GO!'
              : placedGadgets.length === 0
                ? 'Try combining the Ramp and Bouncy Pad, then press GO!'
                : 'Connect your gadgets into a chain reaction, then press GO!'}
          </span>
        </div>
      )}
    </div>
  );
};
