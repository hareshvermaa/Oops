import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ScreenState, SimulationMode, PlacedGadget, GadgetType, PlayerProgress, LevelDefinition, EndlessState } from './types/game';
import { getLevel } from './game/levels';
import { levelFactory } from './game/levelFactory';
import {
  canClaimDaily,
  chooseTier,
  claimDaily,
  LevelOutcome,
  recordFail,
  recordWin,
  RewardSummary,
} from './game/director';
import { loadPlayerProgress, savePlayerProgress, resetAllSaveData, unlockAllLevelsDev } from './utils/storage';
import { showRewardedAd } from './utils/ads';
import { sound } from './utils/audio';

import { TitleScreen } from './components/TitleScreen';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { GadgetTray } from './components/GadgetTray';
import { LevelCompleteModal } from './components/LevelCompleteModal';
import { HintModal } from './components/HintModal';
import { SettingsModal } from './components/SettingsModal';
import { HowToPlayModal } from './components/HowToPlayModal';
import { ExportGuideModal } from './components/ExportGuideModal';
import { ValidatorScreen } from './components/ValidatorScreen';
import { OopsBanner } from './components/OopsBanner';
import { PalsModal } from './components/PalsModal';
import { ProgressionHub } from './components/ProgressionHub';
import { Loader2 } from 'lucide-react';

const HINT_COIN_COST = 45;
const COLLECTIBLE_GADGETS: GadgetType[] = [
  'wood_ramp',
  'bouncy_pad',
  'wind_fan',
  'spring_launcher',
  'seesaw',
  'domino_block',
];

function addGadgetCard(endless: EndlessState, type: GadgetType): EndlessState {
  if (endless.gadgetCards.includes(type)) return { ...endless, coins: endless.coins + 25 };
  const gadgetCards = [...endless.gadgetCards, type];
  const collectionComplete = COLLECTIBLE_GADGETS.every((card) => gadgetCards.includes(card));
  const awardSetBonus = collectionComplete && !endless.collectionRewardClaimed;
  return {
    ...endless,
    gadgetCards,
    collectionRewardClaimed: endless.collectionRewardClaimed || awardSetBonus,
    coins: endless.coins + (awardSetBonus ? 100 : 0),
    gems: endless.gems + (awardSetBonus ? 3 : 0),
  };
}

export default function App() {
  const [screen, setScreen] = useState<ScreenState>('TITLE');
  const [progress, setProgress] = useState<PlayerProgress>(loadPlayerProgress);
  const [currentLevel, setCurrentLevel] = useState<LevelDefinition | null>(null);
  const [loadingLevel, setLoadingLevel] = useState(false);

  const [simulationMode, setSimulationMode] = useState<SimulationMode>('SETUP');
  const [placedGadgets, setPlacedGadgets] = useState<PlacedGadget[]>([]);
  const [selectedGadgetId, setSelectedGadgetId] = useState<string | null>(null);
  const [ghostHintGadget, setGhostHintGadget] = useState<PlacedGadget | null>(null);

  const [fails, setFails] = useState(0);
  const [oopsOpen, setOopsOpen] = useState(false);
  const [nearMiss, setNearMiss] = useState(false);

  const [reward, setReward] = useState<RewardSummary | null>(null);
  const [levelCompleteOpen, setLevelCompleteOpen] = useState(false);
  const [doubled, setDoubled] = useState(false);
  const [nextReady, setNextReady] = useState(false);

  const [hintModalOpen, setHintModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [howToPlayOpen, setHowToPlayOpen] = useState(false);
  const [exportGuideOpen, setExportGuideOpen] = useState(false);
  const [palsOpen, setPalsOpen] = useState(false);
  const [progressionOpen, setProgressionOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const endless = progress.endless as EndlessState;

  // Refs so engine callbacks never see stale state
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const levelRef = useRef<LevelDefinition | null>(currentLevel);
  levelRef.current = currentLevel;
  const modeRef = useRef(simulationMode);
  modeRef.current = simulationMode;
  const goPressesRef = useRef(0);
  const hintsUsedRef = useRef(0);
  const levelStartRef = useRef(0);
  const rewardedRef = useRef(false);
  const assistShownRef = useRef(false);
  const sandboxRef = useRef(false);
  const swapCountRef = useRef(0);
  const nextLevelRef = useRef<LevelDefinition | null>(null);

  const commit = useCallback((updated: PlayerProgress) => {
    progressRef.current = updated;
    setProgress(updated);
    savePlayerProgress(updated);
  }, []);

  const updateEndless = useCallback(
    (fn: (e: EndlessState) => EndlessState) => {
      const cur = progressRef.current;
      commit({ ...cur, endless: fn(cur.endless as EndlessState) });
    },
    [commit]
  );

  useEffect(() => {
    sound.setSoundEnabled(progress.soundEnabled);
    sound.setMusicEnabled(progress.musicEnabled);
  }, [progress.soundEnabled, progress.musicEnabled]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // --- Level lifecycle ---
  const beginLevel = useCallback(
    (lvl: LevelDefinition, sandbox = false) => {
      sandboxRef.current = sandbox;
      setCurrentLevel(lvl);
      setPlacedGadgets([]);
      setSelectedGadgetId(null);
      setGhostHintGadget(null);
      setSimulationMode('SETUP');
      setLevelCompleteOpen(false);
      setOopsOpen(false);
      setFails(0);
      setReward(null);
      setDoubled(false);
      setNextReady(false);
      goPressesRef.current = 0;
      hintsUsedRef.current = 0;
      rewardedRef.current = false;
      assistShownRef.current = false;
      swapCountRef.current = 0;
      nextLevelRef.current = null;
      levelStartRef.current = performance.now();

      if (!sandbox) {
        // Remember this level's look so the NEXT level is guaranteed to look different,
        // then quietly start preparing the next puzzles while the player thinks.
        let e = progressRef.current.endless as EndlessState;
        e = { ...e, lastWorld: lvl.worldId, lastHue: lvl.hueShift ?? e.lastHue };
        commit({ ...progressRef.current, endless: e });
        levelFactory.prefetch(e, lvl.id + 1);
      }
    },
    [commit]
  );

  const startEndless = useCallback(async () => {
    setLoadingLevel(true);
    setScreen('PLAYING');
    const e = progressRef.current.endless as EndlessState;
    const lvl = await levelFactory.get(e, e.level, 'normal');
    setLoadingLevel(false);
    beginLevel(lvl);
  }, [beginLevel]);

  // --- Gadget editing ---
  const handleAddGadget = (type: GadgetType) => {
    if (simulationMode === 'RUNNING' || !currentLevel) return;
    const maxCount = currentLevel.availableGadgets[type] || 0;
    if (placedGadgets.filter((g) => g.type === type).length >= maxCount) return;
    const g: PlacedGadget = {
      id: `g_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      x: 360 + (placedGadgets.length % 3) * 20,
      y: 420 + (placedGadgets.length % 3) * 20,
      angle: type === 'wood_ramp' ? 25 : 0,
    };
    setPlacedGadgets((prev) => [...prev, g]);
    setSelectedGadgetId(g.id);
  };
  const handleUpdateGadgetPosition = (id: string, x: number, y: number) =>
    setPlacedGadgets((prev) => prev.map((g) => (g.id === id ? { ...g, x, y } : g)));
  const handleUpdateGadgetAngle = (id: string, angle: number) =>
    setPlacedGadgets((prev) => prev.map((g) => (g.id === id ? { ...g, angle: Math.round(angle) % 360 } : g)));
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

  // --- Simulation ---
  const handleGo = () => {
    setSelectedGadgetId(null);
    setOopsOpen(false);
    goPressesRef.current += 1;
    setSimulationMode('RUNNING');
  };

  const handleReset = () => {
    setSimulationMode('SETUP');
    setOopsOpen(false);
    setLevelCompleteOpen(false);
  };

  const handleFail = useCallback(
    (info: { reason: 'stuck' | 'timeout'; nearMiss: boolean }) => {
      if (modeRef.current !== 'RUNNING') return;
      setSimulationMode('FAILED');
      setNearMiss(info.nearMiss);
      setOopsOpen(true);
      const failCount = Math.max(1, goPressesRef.current);
      setFails(failCount);
      if (!sandboxRef.current) updateEndless(recordFail);

      // Kind safety net: after 3 oopsies, quietly show where the first gadget could go (free, not counted)
      const lvl = levelRef.current;
      if (failCount >= 3 && !assistShownRef.current && lvl && lvl.intendedSolution.length > 0) {
        assistShownRef.current = true;
        const first = lvl.intendedSolution[0];
        setGhostHintGadget({ id: 'ghost_hint', type: first.type, x: first.x, y: first.y, angle: first.angle });
      }
    },
    [updateEndless]
  );

  const handleWin = useCallback(() => {
    if (modeRef.current === 'COMPLETED') return;
    const lvl = levelRef.current;
    if (!lvl) return;
    setSimulationMode('COMPLETED');
    setOopsOpen(false);

    // Replays / sandbox never pay out twice
    if (rewardedRef.current || sandboxRef.current) {
      setReward(
        (r) =>
          r ?? {
            stars: 3,
            coins: 0,
            streak: 0,
            bonusEgg: false,
            newPal: null,
            duplicatePalCoins: 0,
            luckyMultiplier: 1,
            encouragement: 'Nice replay!',
          }
      );
      setNextReady(!!nextLevelRef.current || sandboxRef.current);
      setTimeout(() => setLevelCompleteOpen(true), 650);
      return;
    }
    rewardedRef.current = true;

    const outcome: LevelOutcome = {
      levelNumber: lvl.id,
      difficulty: lvl.difficulty ?? 0.05,
      attempts: Math.max(1, goPressesRef.current),
      hintsUsed: hintsUsedRef.current,
      thinkSeconds: (performance.now() - levelStartRef.current) / 1000,
      tier: lvl.tier ?? 'normal',
      rewardMultiplier: lvl.rewardMultiplier ?? 1,
      introGadget: lvl.introGadget,
      worldId: lvl.worldId,
      hue: lvl.hueShift ?? 0,
    };
    const before = progressRef.current.endless as EndlessState;
    const { next, reward: r } = recordWin(before, outcome);
    commit({ ...progressRef.current, endless: next });
    setReward(r);
    setDoubled(false);

    // Pick the next puzzle based on how this one went (instantly available: pre-generated in background)
    setNextReady(false);
    const tier = chooseTier(next, outcome);
    levelFactory.get(next, next.level, tier).then((nl) => {
      nextLevelRef.current = nl;
      setNextReady(true);
    });

    setTimeout(() => setLevelCompleteOpen(true), 650);
  }, [commit]);

  const handleNextLevel = () => {
    if (sandboxRef.current) {
      setScreen('TITLE');
      setLevelCompleteOpen(false);
      return;
    }
    const nl = nextLevelRef.current;
    if (!nl) return;
    beginLevel(nl);
  };

  const handleSwapEasier = async () => {
    const lvl = levelRef.current;
    if (!lvl || sandboxRef.current) return;
    swapCountRef.current += 1;
    setOopsOpen(false);
    setLoadingLevel(true);
    const e = progressRef.current.endless as EndlessState;
    const easier = await levelFactory.swap(e, lvl.id, lvl.difficulty ?? 0.2, swapCountRef.current);
    setLoadingLevel(false);
    // keep the same look so it feels like a gentler version of the same puzzle
    beginLevel({ ...easier, worldId: lvl.worldId, worldTheme: lvl.worldTheme, hueShift: lvl.hueShift });
    setToast('Here\u2019s a gentler puzzle! 🌈');
  };

  const handleDoubleCoins = async () => {
    if (!reward || doubled) return;
    const ok = await showRewardedAd('double_coins');
    if (ok) {
      setDoubled(true);
      updateEndless((e) => ({ ...e, coins: e.coins + reward.coins }));
      setToast(`+${reward.coins} bonus coins! 🎉`);
    } else {
      setToast('Rewarded ads are not available in this offline build.');
    }
  };

  // --- Hints ---
  const useHint = () => {
    const cur = progressRef.current;
    commit({ ...cur, hintsRemaining: Math.max(0, cur.hintsRemaining - 1) });
    hintsUsedRef.current += 1;
  };
  const handleRevealGhost = () => {
    const lvl = levelRef.current;
    if (!lvl || progress.hintsRemaining <= 0 || lvl.intendedSolution.length === 0) return;
    const first = lvl.intendedSolution[0];
    setGhostHintGadget({ id: 'ghost_hint', type: first.type, x: first.x, y: first.y, angle: first.angle });
    useHint();
    setHintModalOpen(false);
  };
  const handleAutoPlaceOne = () => {
    const lvl = levelRef.current;
    if (!lvl || progress.hintsRemaining <= 0 || lvl.intendedSolution.length === 0) return;
    const idx = Math.min(placedGadgets.length, lvl.intendedSolution.length - 1);
    const sol = lvl.intendedSolution[idx];
    const g: PlacedGadget = { id: `auto_${Date.now()}`, type: sol.type, x: sol.x, y: sol.y, angle: sol.angle };
    setPlacedGadgets((prev) => [...prev, g]);
    setSelectedGadgetId(g.id);
    useHint();
    setHintModalOpen(false);
  };
  const handleWatchAdForHints = async () => {
    const ok = await showRewardedAd('extra_hint');
    if (ok) {
      const cur = progressRef.current;
      commit({ ...cur, hintsRemaining: cur.hintsRemaining + 3 });
      setToast('+3 hints! 💡');
    } else {
      setToast('Rewarded ads are not available in this offline build.');
    }
  };
  const handleBuyHints = () => {
    const cur = progressRef.current;
    const e = cur.endless as EndlessState;
    if (e.coins < HINT_COIN_COST) return;
    commit({ ...cur, hintsRemaining: cur.hintsRemaining + 3, endless: { ...e, coins: e.coins - HINT_COIN_COST } });
    setToast('+3 hints! 💡');
  };

  // --- Daily gift ---
  const handleDaily = () => {
    const e = progressRef.current.endless as EndlessState;
    if (!canClaimDaily(e)) {
      setToast('Come back tomorrow for another gift! 🎁');
      return;
    }
    const { next, coins, streak } = claimDaily(e);
    commit({ ...progressRef.current, endless: next });
    setToast(`🎁 +${coins} coins! Day ${streak} streak`);
  };

  const handleDailySpin = () => {
    const current = progressRef.current.endless as EndlessState;
    const today = new Date();
    const day = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (current.dailySpinClaimDay === day) return;

    const prize = Math.floor(Math.random() * 4);
    let updated = { ...current, dailySpinClaimDay: day };
    if (prize === 0) {
      updated = { ...updated, coins: updated.coins + 50 };
      setToast('Daily spin: +50 coins!');
    } else if (prize === 1) {
      updated = { ...updated, coins: updated.coins + 100 };
      setToast('Daily spin: +100 coins!');
    } else if (prize === 2) {
      updated = { ...updated, gems: updated.gems + 1 };
      setToast('Daily spin: +1 gem!');
    } else {
      const card = COLLECTIBLE_GADGETS[Math.floor(Math.random() * COLLECTIBLE_GADGETS.length)];
      const hadCard = updated.gadgetCards.includes(card);
      updated = addGadgetCard(updated, card);
      setToast(hadCard ? 'Daily spin: duplicate card traded for 25 coins.' : 'Daily spin: a new gadget card!');
    }
    commit({ ...progressRef.current, endless: updated });
  };

  const handleVillageUpgrade = (index: number) => {
    const current = progressRef.current.endless as EndlessState;
    const level = current.villageLevels[index] ?? 0;
    const cost = 120 + level * 100;
    if (current.coins < cost) {
      setToast(`Need ${cost} coins for this upgrade.`);
      return false;
    }
    const villageLevels = [...current.villageLevels];
    villageLevels[index] = level + 1;
    commit({
      ...progressRef.current,
      endless: { ...current, coins: current.coins - cost, villageLevels },
    });
    setToast('Village upgraded!');
    return true;
  };

  const handleMiniGameReward = (score: number) => {
    const current = progressRef.current.endless as EndlessState;
    let updated = {
      ...current,
      coins: current.coins + score * 5,
      bestMiniScore: Math.max(current.bestMiniScore, score),
    };
    if (score >= 5) {
      const card = COLLECTIBLE_GADGETS[Math.floor(Math.random() * COLLECTIBLE_GADGETS.length)];
      const hadCard = updated.gadgetCards.includes(card);
      updated = addGadgetCard(updated, card);
      setToast(
        hadCard
          ? `Mini-game: +${score * 5} coins and duplicate card traded in.`
          : `Mini-game: +${score * 5} coins and a gadget card!`
      );
    } else {
      setToast(`Mini-game complete: +${score * 5} coins.`);
    }
    commit({ ...progressRef.current, endless: updated });
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'OOPS!',
          text: 'Try OOPS!, a colorful physics puzzle game!',
        });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText('Try OOPS!, a colorful physics puzzle game!');
        setToast('Invite text copied. Tracked referral rewards need an online service.');
      } else {
        setToast('Sharing is not available on this device.');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('Failed to share OOPS!:', error);
      setToast('Could not share the game link.');
    }
  };

  // --- Settings ---
  const handleToggleSound = () => commit({ ...progress, soundEnabled: !progress.soundEnabled });
  const handleToggleMusic = () => commit({ ...progress, musicEnabled: !progress.musicEnabled });
  const handleResetProgress = () => {
    const fresh = resetAllSaveData();
    levelFactory.reset();
    progressRef.current = fresh;
    setProgress(fresh);
    setCurrentLevel(null);
  };
  const handleUnlockAllDev = () => commit(unlockAllLevelsDev(progress));

  return (
    <div className="w-full h-[100dvh] bg-pink-100 flex items-center justify-center overflow-hidden font-sans select-none">
      <main className="w-full h-full max-w-[460px] max-h-[920px] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] bg-pink-50 shadow-2xl flex flex-col relative overflow-hidden sm:rounded-[36px] sm:border-4 sm:border-white">
        {screen === 'TITLE' && (
          <TitleScreen
            endless={endless}
            dailyReady={canClaimDaily(endless)}
            onPlay={startEndless}
            onDaily={handleDaily}
            onProgression={() => setProgressionOpen(true)}
            onPals={() => setPalsOpen(true)}
            onHowToPlay={() => setHowToPlayOpen(true)}
            onSettings={() => setSettingsOpen(true)}
            onValidator={() => setScreen('VALIDATOR')}
            onExportGuide={() => setExportGuideOpen(true)}
          />
        )}

        {screen === 'PLAYING' && (
          <div className="w-full h-full flex flex-col relative min-h-0 overflow-hidden">
            {currentLevel && (
              <>
                <HUD
                  level={currentLevel}
                  simulationMode={simulationMode}
                  hintsRemaining={progress.hintsRemaining}
                  coins={endless.coins}
                  streak={endless.streak}
                  soundEnabled={progress.soundEnabled}
                  onBack={() => setScreen('TITLE')}
                  onHint={() => setHintModalOpen(true)}
                  onToggleSound={handleToggleSound}
                />
                <div className="relative flex-1 min-h-0 flex flex-col">
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
                    onFail={handleFail}
                  />
                  {oopsOpen && (
                    <OopsBanner
                      fails={fails}
                      nearMiss={nearMiss}
                      onRetry={handleReset}
                      onHint={() => setHintModalOpen(true)}
                      onSwap={handleSwapEasier}
                    />
                  )}
                </div>
                <GadgetTray
                  availableGadgets={currentLevel.availableGadgets}
                  placedGadgets={placedGadgets}
                  selectedGadgetId={selectedGadgetId}
                  simulationMode={simulationMode === 'FAILED' ? 'SETUP' : simulationMode}
                  onAddGadget={handleAddGadget}
                  onUpdateAngle={(angle) => selectedGadgetId && handleUpdateGadgetAngle(selectedGadgetId, angle)}
                  onDeleteSelected={handleDeleteSelected}
                  onClearAll={handleClearAllPlaced}
                  onGo={handleGo}
                  onReset={handleReset}
                />
              </>
            )}
            {loadingLevel && (
              <div className="absolute inset-0 z-40 bg-pink-50/90 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-10 h-10 text-pink-400 animate-spin" />
                <span className="text-sm font-black text-pink-500">Baking a fresh puzzle…</span>
              </div>
            )}
          </div>
        )}

        {screen === 'VALIDATOR' && (
          <ValidatorScreen
            onBack={() => setScreen('TITLE')}
            onPlayLevel={(levelId) => {
              beginLevel(getLevel(levelId), true);
              setScreen('PLAYING');
            }}
          />
        )}

        {levelCompleteOpen && reward && currentLevel && (
          <LevelCompleteModal
            levelNumber={currentLevel.id}
            levelTitle={currentLevel.title}
            reward={reward}
            doubled={doubled}
            nextReady={nextReady}
            onNextLevel={handleNextLevel}
            onReplay={handleReset}
            onDoubleCoins={handleDoubleCoins}
          />
        )}

        {hintModalOpen && currentLevel && (
          <HintModal
            level={currentLevel}
            hintsRemaining={progress.hintsRemaining}
            coins={endless.coins}
            hintCoinCost={HINT_COIN_COST}
            onClose={() => setHintModalOpen(false)}
            onRevealGhost={handleRevealGhost}
            onAutoPlaceOne={handleAutoPlaceOne}
            onWatchAdForHints={handleWatchAdForHints}
            onBuyHints={handleBuyHints}
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
        {howToPlayOpen && <HowToPlayModal onClose={() => setHowToPlayOpen(false)} />}
        {exportGuideOpen && <ExportGuideModal onClose={() => setExportGuideOpen(false)} />}
        {palsOpen && <PalsModal pals={endless.pals} onClose={() => setPalsOpen(false)} />}
        {progressionOpen && (
          <ProgressionHub
            endless={endless}
            onClose={() => setProgressionOpen(false)}
            onSpin={handleDailySpin}
            onUpgradeBuilding={handleVillageUpgrade}
            onMiniGameReward={handleMiniGameReward}
            onShare={handleShare}
          />
        )}

        {toast && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[60] bg-slate-800 text-white text-xs font-black px-4 py-2 rounded-full shadow-xl animate-popIn">
            {toast}
          </div>
        )}
      </main>
    </div>
  );
}
