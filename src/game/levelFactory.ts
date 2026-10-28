import { EndlessState, LevelDefinition } from '../types/game';
import { generateLevelAsync, GenSpec } from './generator';
import { buildTemplateLevel } from './levels';
import {
  SAFE_FALLBACK_TEMPLATES,
  TUTORIAL_COUNT,
  TUTORIAL_TEMPLATES,
  Tier3,
  specsForLevel,
} from './director';
import { hashSeed, makeRng, themeForLevel } from './themes';

/**
 * Serves levels for endless mode. While the player is busy solving level N, the next level is
 * generated in the background in three flavours (easy / normal / hard). When N is finished the
 * director picks the flavour that matches how the player just played - instantly.
 */

function tutorialLevel(e: EndlessState, levelNumber: number): LevelDefinition {
  const theme = themeForLevel(e.seed, levelNumber);
  const template = TUTORIAL_TEMPLATES[(levelNumber - 1) % TUTORIAL_COUNT];
  return { ...buildTemplateLevel(levelNumber, template, theme.worldId), hueShift: theme.hue, tier: 'tutorial' };
}

function fallbackLevel(spec: GenSpec): LevelDefinition {
  const idx = Math.floor(makeRng(spec.seed)() * SAFE_FALLBACK_TEMPLATES.length);
  return {
    ...buildTemplateLevel(spec.levelNumber, SAFE_FALLBACK_TEMPLATES[idx], spec.worldId),
    hueShift: spec.hue,
    tier: spec.tier ?? 'normal',
    difficulty: spec.difficulty,
  };
}

async function produce(spec: GenSpec): Promise<LevelDefinition> {
  let s = spec;
  for (let i = 0; i < 5; i++) {
    const lvl = await generateLevelAsync(s);
    if (lvl) return lvl;
    // Re-roll with a new seed and slightly lower difficulty; the player never waits on a failure
    s = { ...s, seed: hashSeed(s.seed, i + 17), difficulty: Math.max(0.04, s.difficulty - 0.07) };
  }
  return fallbackLevel(spec);
}

export class LevelFactory {
  private cache = new Map<string, Promise<LevelDefinition>>();
  private queue: Promise<unknown> = Promise.resolve();

  private key(e: EndlessState, levelNumber: number, tier: Tier3) {
    return `${e.seed}:${levelNumber}:${tier}`;
  }

  private enqueue(k: string, spec: GenSpec) {
    if (this.cache.has(k)) return;
    // Sequential queue so background generation never hogs the CPU while the player is playing
    const p = this.queue.then(() => produce(spec));
    this.queue = p.catch(() => undefined);
    this.cache.set(k, p);
  }

  /** Kick off background generation for level `levelNumber` (all three flavours). */
  prefetch(e: EndlessState, levelNumber: number) {
    if (levelNumber <= TUTORIAL_COUNT) return;
    const specs = specsForLevel(e, levelNumber);
    this.enqueue(this.key(e, levelNumber, 'normal'), specs.normal);
    this.enqueue(this.key(e, levelNumber, 'easy'), specs.easy);
    this.enqueue(this.key(e, levelNumber, 'hard'), specs.hard);
  }

  async get(e: EndlessState, levelNumber: number, tier: Tier3 = 'normal'): Promise<LevelDefinition> {
    if (levelNumber <= TUTORIAL_COUNT) return tutorialLevel(e, levelNumber);
    const k = this.key(e, levelNumber, tier);
    if (!this.cache.has(k)) this.enqueue(k, specsForLevel(e, levelNumber)[tier]);
    const lvl = await this.cache.get(k)!;
    // free memory of older entries
    for (const key of this.cache.keys()) {
      const n = Number(key.split(':')[1]);
      if (n < levelNumber - 1) this.cache.delete(key);
    }
    return lvl;
  }

  /** A fresh, clearly easier puzzle to swap in when the player is stuck (never a dead end). */
  async swap(e: EndlessState, levelNumber: number, currentDifficulty: number, salt: number): Promise<LevelDefinition> {
    const base = specsForLevel(e, levelNumber).easy;
    return produce({
      ...base,
      difficulty: Math.max(0.04, Math.min(base.difficulty, currentDifficulty * 0.6)),
      seed: hashSeed(base.seed, salt, 31337),
    });
  }

  async reset() {
    this.cache.clear();
  }
}

export const levelFactory = new LevelFactory();
