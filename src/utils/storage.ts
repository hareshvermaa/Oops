import { PlayerProgress } from '../types/game';
import { defaultEndless } from '../game/director';

const STORAGE_KEY = 'oops_game_save_v1';

function freshProgress(): PlayerProgress {
  return { ...DEFAULT_PROGRESS, endless: defaultEndless() };
}

const DEFAULT_PROGRESS: PlayerProgress = {
  completedLevels: {},
  unlockedWorldMax: 1,
  hintsRemaining: 5,
  soundEnabled: true,
  musicEnabled: true,
  hapticsEnabled: true,
  lastPlayedLevel: 1,
};

export function loadPlayerProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return freshProgress();
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PROGRESS,
      ...parsed,
      completedLevels: parsed.completedLevels || {},
      endless: { ...defaultEndless(), ...(parsed.endless || {}) },
    };
  } catch (err) {
    console.warn('Failed to load OOPS! save data:', err);
    return freshProgress();
  }
}

export function savePlayerProgress(progress: PlayerProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (err) {
    console.warn('Failed to save OOPS! progress to localStorage:', err);
  }
}

export function recordLevelSuccess(
  current: PlayerProgress,
  levelId: number,
  stars: number,
  timeSeconds: number,
  gadgetsUsed: number
): PlayerProgress {
  const existing = current.completedLevels[levelId];
  const bestStars = Math.max(existing?.stars || 0, stars);
  const bestTime = existing ? Math.min(existing.bestTimeSeconds, timeSeconds) : timeSeconds;

  const updatedCompleted = {
    ...current.completedLevels,
    [levelId]: {
      stars: bestStars,
      completed: true,
      bestTimeSeconds: Number(bestTime.toFixed(1)),
      gadgetsUsed,
    },
  };

  // Check world unlock progression: World unlocked if previous world has >= 10 levels completed
  // World 1: 1-20, World 2: 21-40 ... World 10: 181-200
  let maxWorld = current.unlockedWorldMax;
  for (let w = 1; w < 10; w++) {
    const startLvl = (w - 1) * 20 + 1;
    const endLvl = w * 20;
    let completedInWorld = 0;
    for (let l = startLvl; l <= endLvl; l++) {
      if (updatedCompleted[l]?.completed) {
        completedInWorld++;
      }
    }
    // If completed at least 8 levels in world w, unlock world w + 1
    if (completedInWorld >= 8 && maxWorld <= w) {
      maxWorld = w + 1;
    }
  }

  const updated: PlayerProgress = {
    ...current,
    completedLevels: updatedCompleted,
    unlockedWorldMax: maxWorld,
    lastPlayedLevel: Math.min(200, levelId + 1),
  };

  savePlayerProgress(updated);
  return updated;
}

export function resetAllSaveData(): PlayerProgress {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error(e);
  }
  return freshProgress();
}

export function unlockAllLevelsDev(current: PlayerProgress): PlayerProgress {
  const mockCompleted: PlayerProgress['completedLevels'] = {};
  for (let i = 1; i <= 200; i++) {
    mockCompleted[i] = {
      stars: 3,
      completed: true,
      bestTimeSeconds: 3.5,
      gadgetsUsed: 2,
    };
  }
  const unlocked: PlayerProgress = {
    ...current,
    unlockedWorldMax: 10,
    completedLevels: mockCompleted,
  };
  savePlayerProgress(unlocked);
  return unlocked;
}
