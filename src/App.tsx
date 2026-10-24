import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ScreenState,
  SimulationMode,
  PlacedGadget,
  GadgetType,
  PlayerProgress,
  LevelDefinition,
} from './types/game';
import { ALL_LEVELS, getLevel } from './game/levels';
import {
  loadPlayerProgress,
  savePlayerProgress,
  recordLevelSuccess,
  resetAllSaveData,
  unlockAllLevelsDev,
} from './utils/storage';
import { sound } from './utils/audio';

// Components
import { TitleScreen } from './components/TitleScreen';
import { WorldSelectScreen } from './components/WorldSelectScreen';
import { LevelSelectScreen } from './components/LevelSelectScreen';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { GadgetTray } from './components/GadgetTray';
import { LevelCompleteModal } from './components/LevelCompleteModal';
import { HintModal } from './components/HintModal';
import { SettingsModal } from './components/SettingsModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import { ExportGuideModal } from './components/ExportGuideModal';
import { ValidatorScreen } from './components/ValidatorScreen';

export default function App() {
  const [screen, setScreen] = useState<ScreenState>('TITLE');
  const [progress, setProgress] = useState<PlayerProgress>(loadPlayerProgress);
  const [currentLevelId, setCurrentLevelId] = useState<number>(1);
  const [currentWorldId, setCurrentWorldId] = useState<number>(1);

  // In-Game Simulation State
  const [simulationMode, setSimulationMode] = useState<SimulationMode>('SETUP');
  const [placedGadgets, setPlacedGadgets] = useState<PlacedGadget[]>([]);
  const [selectedGadgetId, setSelectedGadgetId] = useState<string | null>(null);
  const [ghostHintGadget, setGhostHintGadget] = useState<PlacedGadget | null>(null);

  // Performance & Stats
  const [simStartTime, setSimStartTime] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [starsEarned, setStarsEarned] = useState<number>(0);

  // Modals
  const [levelCompleteOpen, setLevelCompleteOpen] = useState(false);
  const [hintModalOpen, setHintModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);
  const [exportGuideOpen, setExportGuideOpen] = useState(false);

  const currentLevel: LevelDefinition = getLevel(currentLevelId);

  // Synchronized state refs to prevent stale closures in event callbacks
  const placedGadgetsRef = useRef(placedGadgets);
  placedGadgetsRef.current = placedGadgets;

  const simStartTimeRef = useRef(simStartTime);
  simStartTimeRef.current = simStartTime;

  const currentLevelRef = useRef(currentLevel);
  currentLevelRef.current = currentLevel;

  const progressRef = useRef(progress);
  progressRef.current = progress;

  const simulationModeRef = useRef(simulationMode);
  simulationModeRef.current = simulationMode;

  // Apply audio preferences to sound engine
  useEffect(() => {
    sound.setSoundEnabled(progress.soundEnabled);
    sound.setMusicEnabled(progress.musicEnabled);
  }, [progress.soundEnabled, progress.musicEnabled]);

  // Clean level loading
  const loadLevelState = useCallback((levelId: number) => {
    setCurrentLevelId(levelId);
    const lvl = getLevel(levelId);
    setCurrentWorldId(lvl.worldId);
    setPlacedGadgets([]);
    setSelectedGadgetId(null);
    setGhostHintGadget(null);
    setSimulationMode('SETUP');
    setLevelCompleteOpen(false);
    setElapsedSeconds(0);
  }, []);

  // --- Gadget Placement & Manipulation ---
  const handleAddGadget = (type: GadgetType) => {
    if (simulationMode === 'RUNNING') return;

    const maxCount = currentLevel.availableGadgets[type] || 0;
    const currentCount = placedGadgets.filter((g) => g.type === type).length;
    if (currentCount >= maxCount) return;

    const newGadget: PlacedGadget = {
      id: `g_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type,
      x: 360 + (placedGadgets.length % 3) * 20,
      y: 420 + (placedGadgets.length % 3) * 20,
      angle: type === 'wood_ramp' ? 25 : 0,
    };

    setPlacedGadgets((prev) => [...prev, newGadget]);
    setSelectedGadgetId(newGadget.id);
  };

  const handleUpdateGadgetPosition = (id: string, x: number, y: number) => {
    setPlacedGadgets((prev) =>
      prev.map((g) => (g.id === id ? { ...g, x, y } : g))
    );
  };

  const handleUpdateGadgetAngle = (id: string, angle: number) => {
    setPlacedGadgets((prev) =>
      prev.map((g) => (g.id === id ? { ...g, angle: Math.round(angle) % 360 } : g))
    );
  };

  const handleDeleteSelected = () => {
    if (!selectedGadgetId || simulationMode === 'RUNNING') return;
    setPlacedGadgets((prev) => prev.filter((g) => g.id !== selectedGadgetId));
    setSelectedGadgetId(null);
  };

  const handleClearAllPlaced = () => {
    if (simulationMode === 'RUNNING') return;
    setPlacedGadgets([]);
    setSelectedGadgetId(null);
  };

  // --- Simulation Controls ---
  const handleGo = () => {
    setSelectedGadgetId(null);
    setSimulationMode('RUNNING');
    const now = performance.now();
    setSimStartTime(now);
    simStartTimeRef.current = now;
  };

  const handleReset = () => {
    // Preserve the player's chosen layout when restarting an attempt!
    setSimulationMode('SETUP');
    setLevelCompleteOpen(false);
  };

  // Win callback guarded against stale closures and duplicates
  const handleWin = useCallback(() => {
    if (simulationModeRef.current === 'COMPLETED') return;

    const now = performance.now();
    const elapsed = Math.max(0.1, (now - simStartTimeRef.current) / 1000);
    setElapsedSeconds(elapsed);
    setSimulationMode('COMPLETED');

    const lvl = currentLevelRef.current;
    const gadgetCount = placedGadgetsRef.current.length;

    // Star calculation
    let stars = 1;
    if (gadgetCount <= lvl.maxGadgetsFor3Stars) {
      stars = elapsed <= lvl.parSeconds * 1.5 ? 3 : 2;
    } else {
      stars = 2;
    }
    setStarsEarned(stars);

    // Persist progress with latest state
    const updated = recordLevelSuccess(
      progressRef.current,
      lvl.id,
      stars,
      elapsed,
      gadgetCount
    );
    setProgress(updated);
    setLevelCompleteOpen(true);
  }, []);

  const handleNextLevel = () => {
    if (currentLevelId < 200) {
      loadLevelState(currentLevelId + 1);
    } else {
      setScreen('WORLD_SELECT');
    }
  };

  // --- Hint System Handlers ---
  const handleRevealGhost = () => {
    if (currentLevel.intendedSolution.length > 0) {
      const firstSol = currentLevel.intendedSolution[0];
      setGhostHintGadget({
        id: 'ghost_hint',
        type: firstSol.type,
        x: firstSol.x,
        y: firstSol.y,
        angle: firstSol.angle,
      });
    }
  };

  const handleAutoPlaceOne = () => {
    if (progress.hintsRemaining <= 0) return;
    if (currentLevel.intendedSolution.length > 0) {
      const firstSol = currentLevel.intendedSolution[0];
      const autoGadget: PlacedGadget = {
        id: `auto_${Date.now()}`,
        type: firstSol.type,
        x: firstSol.x,
        y: firstSol.y,
        angle: firstSol.angle,
      };
      setPlacedGadgets((prev) => [...prev, autoGadget]);
      setSelectedGadgetId(autoGadget.id);

      const updated: PlayerProgress = {
        ...progress,
        hintsRemaining: Math.max(0, progress.hintsRemaining - 1),
      };
      setProgress(updated);
      savePlayerProgress(updated);
    }
  };

  // --- Settings Handlers ---
  const handleToggleSound = () => {
    const updated = { ...progress, soundEnabled: !progress.soundEnabled };
    setProgress(updated);
    savePlayerProgress(updated);
  };

  const handleToggleMusic = () => {
    const updated = { ...progress, musicEnabled: !progress.musicEnabled };
    setProgress(updated);
    savePlayerProgress(updated);
  };

  const handleResetProgress = () => {
    const updated = resetAllSaveData();
    setProgress(updated);
    loadLevelState(1);
  };

  const handleUnlockAllDev = () => {
    const updated = unlockAllLevelsDev(progress);
    setProgress(updated);
  };

  // Aggregated totals
  let totalStars = 0;
  let completedCount = 0;
  for (const lvl of Object.values(progress.completedLevels)) {
    totalStars += lvl.stars || 0;
    if (lvl.completed) completedCount++;
  }

  return (
    <div className="w-full h-screen bg-slate-950 flex items-center justify-center overflow-hidden font-sans select-none">
      {/* 720x1280 Mobile Design Frame Container */}
      <main className="w-full h-full max-w-[460px] max-h-[920px] bg-slate-900 shadow-2xl flex flex-col relative overflow-hidden sm:rounded-[36px] sm:border-4 sm:border-slate-800">
        {/* Screen Routing */}
        {screen === 'TITLE' && (
          <TitleScreen
            completedCount={completedCount}
            totalStars={totalStars}
            onPlay={() => {
              loadLevelState(progress.lastPlayedLevel || 1);
              setScreen('PLAYING');
            }}
            onWorldSelect={() => setScreen('WORLD_SELECT')}
            onHowToPlay={() => setHowToPlayOpen(true)}
            onSettings={() => setSettingsOpen(true)}
            onValidator={() => setScreen('VALIDATOR')}
            onExportGuide={() => setExportGuideOpen(true)}
          />
        )}

        {screen === 'WORLD_SELECT' && (
          <WorldSelectScreen
            progress={progress}
            onSelectWorld={(worldId) => {
              setCurrentWorldId(worldId);
              setScreen('LEVEL_SELECT');
            }}
            onBack={() => setScreen('TITLE')}
          />
        )}

        {screen === 'LEVEL_SELECT' && (
          <LevelSelectScreen
            worldId={currentWorldId}
            progress={progress}
            onSelectLevel={(levelId) => {
              loadLevelState(levelId);
              setScreen('PLAYING');
            }}
            onBack={() => setScreen('WORLD_SELECT')}
          />
        )}

        {screen === 'PLAYING' && (
          <div className="w-full h-full flex flex-col relative min-h-0 overflow-hidden">
            <HUD
              level={currentLevel}
              simulationMode={simulationMode}
              starsEarned={starsEarned}
              hintsRemaining={progress.hintsRemaining}
              gadgetsUsed={placedGadgets.length}
              soundEnabled={progress.soundEnabled}
              onGo={handleGo}
              onReset={handleReset}
              onBack={() => setScreen('LEVEL_SELECT')}
              onHint={() => setHintModalOpen(true)}
              onToggleSound={handleToggleSound}
            />

            <GameCanvas
              level={currentLevel}
              placedGadgets={placedGadgets}
              simulationMode={simulationMode}
              selectedGadgetId={selectedGadgetId}
              ghostHintGadget={ghostHintGadget}
              onSelectGadget={setSelectedGadgetId}
              onUpdateGadgetPosition={handleUpdateGadgetPosition}
              onUpdateGadgetAngle={handleUpdateGadgetAngle}
              onWin={handleWin}
            />

            <GadgetTray
              availableGadgets={currentLevel.availableGadgets}
              placedGadgets={placedGadgets}
              selectedGadgetId={selectedGadgetId}
              simulationMode={simulationMode}
              onAddGadget={handleAddGadget}
              onUpdateAngle={(angle) => {
                if (selectedGadgetId) {
                  handleUpdateGadgetAngle(selectedGadgetId, angle);
                }
              }}
              onDeleteSelected={handleDeleteSelected}
              onClearAll={handleClearAllPlaced}
              onGo={handleGo}
              onReset={handleReset}
            />
          </div>
        )}

        {screen === 'VALIDATOR' && (
          <ValidatorScreen
            onBack={() => setScreen('TITLE')}
            onPlayLevel={(levelId) => {
              loadLevelState(levelId);
              setScreen('PLAYING');
            }}
          />
        )}

        {/* Global Modals */}
        {levelCompleteOpen && (
          <LevelCompleteModal
            levelId={currentLevelId}
            levelTitle={currentLevel.title}
            stars={starsEarned}
            elapsedSeconds={elapsedSeconds}
            gadgetsUsed={placedGadgets.length}
            onNextLevel={handleNextLevel}
            onReplay={handleReset}
            onLevelSelect={() => {
              setLevelCompleteOpen(false);
              setScreen('LEVEL_SELECT');
            }}
          />
        )}

        {hintModalOpen && (
          <HintModal
            level={currentLevel}
            hintsRemaining={progress.hintsRemaining}
            onClose={() => setHintModalOpen(false)}
            onRevealGhost={handleRevealGhost}
            onAutoPlaceOne={handleAutoPlaceOne}
          />
        )}

        {settingsOpen && (
          <SettingsModal
            soundEnabled={progress.soundEnabled}
            musicEnabled={progress.musicEnabled}
            onToggleSound={handleToggleSound}
            onToggleMusic={handleToggleMusic}
            onResetProgress={handleResetProgress}
            onUnlockAllDev={handleUnlockAllDev}
            onClose={() => setSettingsOpen(false)}
          />
        )}

        {howToPlayOpen && (
          <HowToPlayModal onClose={() => setHowToPlayOpen(false)} />
        )}

        {exportGuideOpen && (
          <ExportGuideModal onClose={() => setExportGuideOpen(false)} />
        )}
      </main>
    </div>
  );
}
