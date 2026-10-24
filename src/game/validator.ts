import { ALL_LEVELS } from './levels';
import { PhysicsEngine } from './PhysicsEngine';
import { PlacedGadget } from '../types/game';

export interface LevelValidationResult {
  levelId: number;
  worldId: number;
  title: string;
  solvable: boolean;
  framesTaken: number;
  gadgetsUsed: number;
  error?: string;
}

export interface FullValidationReport {
  totalLevels: number;
  passedCount: number;
  failedCount: number;
  passRatePercent: number;
  averageFrames: number;
  results: LevelValidationResult[];
  timestamp: string;
}

export function validateSingleLevel(levelId: number): LevelValidationResult {
  const level = ALL_LEVELS[levelId];
  if (!level) {
    return {
      levelId,
      worldId: 0,
      title: 'Unknown',
      solvable: false,
      framesTaken: 0,
      gadgetsUsed: 0,
      error: 'Level configuration not found',
    };
  }

  // Convert intended solution to PlacedGadget format
  const gadgets: PlacedGadget[] = level.intendedSolution.map((s, idx) => ({
    id: `sol_${levelId}_${idx}`,
    type: s.type,
    x: s.x,
    y: s.y,
    angle: s.angle,
  }));

  try {
    const sim = PhysicsEngine.simulateHeadless(level, gadgets, 600);
    return {
      levelId,
      worldId: level.worldId,
      title: level.title,
      solvable: sim.won,
      framesTaken: sim.framesTaken,
      gadgetsUsed: gadgets.length,
      error: sim.won ? undefined : 'Simulation timed out before reaching target zone',
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown simulation error';
    return {
      levelId,
      worldId: level.worldId,
      title: level.title,
      solvable: false,
      framesTaken: 0,
      gadgetsUsed: gadgets.length,
      error: message,
    };
  }
}

export async function runAutomatedValidationSuite(
  onProgress?: (progress: number, currentResult: LevelValidationResult) => void
): Promise<FullValidationReport> {
  const results: LevelValidationResult[] = [];
  let passed = 0;
  let totalFrames = 0;

  for (let id = 1; id <= 200; id++) {
    const res = validateSingleLevel(id);
    results.push(res);
    if (res.solvable) {
      passed++;
      totalFrames += res.framesTaken;
    }

    if (onProgress) {
      onProgress(id / 200, res);
      // Yield to event loop every 10 levels for UI responsiveness
      if (id % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  }

  const failedCount = 200 - passed;
  const passRatePercent = Number(((passed / 200) * 100).toFixed(1));
  const averageFrames = passed > 0 ? Math.round(totalFrames / passed) : 0;

  return {
    totalLevels: 200,
    passedCount: passed,
    failedCount,
    passRatePercent,
    averageFrames,
    results,
    timestamp: new Date().toISOString(),
  };
}
