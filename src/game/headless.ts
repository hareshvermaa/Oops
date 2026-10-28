import { LevelDefinition, PlacedGadget } from '../types/game';
import { PhysicsEngine } from './PhysicsEngine';

/**
 * Render-free simulation using the REAL game physics (same PhysicsEngine as the live game),
 * so "this level is solvable" means exactly what the player will experience.
 */
const fakeCanvas = {
  width: 720,
  height: 980,
  getContext: () => ({}),
} as unknown as HTMLCanvasElement;

let sharedEngine: PhysicsEngine | null = null;

export interface SimResult {
  won: boolean;
  failed: boolean;
  steps: number;
  minDistToTarget: number;
  trajectory: { x: number; y: number }[];
}

export function simulate(level: LevelDefinition, gadgets: PlacedGadget[], maxSteps = 1500): SimResult {
  if (!sharedEngine) {
    sharedEngine = new PhysicsEngine(fakeCanvas, level);
    sharedEngine.silent = true;
  }
  sharedEngine.loadLevel(level, gadgets);
  const stats = sharedEngine.runHeadless(maxSteps);
  return {
    won: stats.won,
    failed: stats.failed,
    steps: stats.steps,
    minDistToTarget: stats.minDistToTarget,
    trajectory: stats.trajectory.slice(),
  };
}
