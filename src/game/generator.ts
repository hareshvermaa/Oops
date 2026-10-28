import {
  DynamicObject,
  FixedObstacle,
  GadgetType,
  LevelDefinition,
  LevelTier,
  LevelTwist,
  PlacedGadget,
  TargetZone,
} from '../types/game';
import { simulate } from './headless';
import { makeRng, makeTitle, Rng, themeFor } from './themes';

/**
 * Procedural level generator.
 *
 * Levels are NOT picked from a list. For every request we
 *   1. build random scenery (shelves, walls, pockets) scaled by a difficulty value 0..1,
 *   2. SEARCH for a working gadget solution with the real physics engine (hill-climbing on how
 *      close the hero gets to the goal),
 *   3. reject the level if it is trivial (wins with no gadgets) or fragile (solution needs pixel-
 *      perfect placement), and re-roll.
 * So every level a player ever sees is proven solvable AND forgiving.
 */

export interface GenSpec {
  levelNumber: number;
  difficulty: number; // 0..1
  seed: number;
  worldId: number;
  hue: number;
  allowed: GadgetType[]; // gadgets that may appear
  introGadget?: GadgetType; // must be part of the solution (teaches a new mechanic)
  twist?: LevelTwist;
  tier?: LevelTier;
  rewardMultiplier?: number;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const norm360 = (a: number) => ((Math.round(a) % 360) + 360) % 360;

interface Scenery {
  obstacles: FixedObstacle[];
  start: { x: number; y: number };
  target: TargetZone;
  dir: 1 | -1;
}

function buildScenery(rng: Rng, d: number, worldId: number): Scenery {
  const theme = themeFor(worldId);
  const dir: 1 | -1 = rng() < 0.5 ? 1 : -1;
  const mx = (x: number) => (dir === 1 ? x : 720 - x);
  const ma = (a: number) => (dir === 1 ? a : -a);
  const [c1, c2] = theme.shelfColors;

  const sx = 105 + rng() * 120;
  const obstacles: FixedObstacle[] = [
    {
      id: 'shelf_start',
      type: 'shelf',
      x: Math.round(mx(sx + 20)),
      y: 180,
      width: Math.round(120 + rng() * 40),
      height: 18,
      angle: ma(Math.round(20 + rng() * 8)),
      color: c1,
    },
  ];

  const tw = Math.round(150 - d * 45);
  const farSide = rng() < 0.8;
  const tx = farSide ? 330 + rng() * 270 : 120 + rng() * 480;
  const target: TargetZone = {
    x: Math.round(mx(tx)),
    y: 840,
    width: tw,
    height: 40,
    label: theme.targetLabel,
    type: theme.targetType,
  };

  const k = clamp(1 + Math.floor(d * 4 + rng() * 1.2), 1, 5);
  const spacing = 440 / k;
  let lastSign = rng() < 0.5 ? 1 : -1;
  for (let i = 0; i < k; i++) {
    const w = Math.round(130 + rng() * 140);
    const y = Math.round(300 + (i + 0.5) * spacing + (rng() - 0.5) * spacing * 0.3);
    const x = Math.round(w / 2 + 30 + rng() * (720 - w - 60));
    lastSign = rng() < 0.7 ? -lastSign : lastSign;
    const ang = lastSign * Math.round(10 + rng() * 16);
    obstacles.push({
      id: `shelf_${i}`,
      type: 'shelf',
      x,
      y,
      width: w,
      height: 18,
      angle: ang,
      color: i % 2 === 0 ? c2 : c1,
    });
  }

  if (d > 0.12 && rng() < 0.15 + d * 0.6) {
    const h = Math.round(160 + rng() * 140);
    const midX = (mx(sx) + target.x) / 2;
    obstacles.push({
      id: 'barrier',
      type: 'wall',
      x: Math.round(clamp(midX + (rng() - 0.5) * 160, 120, 600)),
      y: 800 - h / 2,
      width: 24,
      height: h,
      color: '#475569',
    });
  }

  if (d > 0.35 && rng() < d) {
    const gap = tw / 2 + 14;
    for (const side of [-1, 1]) {
      obstacles.push({
        id: `pocket_${side}`,
        type: 'wall',
        x: Math.round(clamp(target.x + side * gap, 40, 680)),
        y: 825,
        width: 16,
        height: 90,
        color: '#334155',
      });
    }
  }

  return { obstacles, start: { x: Math.round(mx(sx)), y: 120 }, target, dir };
}

// --- tiny geometry helpers to keep proposed gadgets away from scenery ---
function nearObstacle(x: number, y: number, obstacles: FixedObstacle[], pad: number): boolean {
  for (const o of obstacles) {
    const a = -((o.angle || 0) * Math.PI) / 180;
    const dx = x - o.x;
    const dy = y - o.y;
    const lx = dx * Math.cos(a) - dy * Math.sin(a);
    const ly = dx * Math.sin(a) + dy * Math.cos(a);
    if (Math.abs(lx) < o.width / 2 + pad && Math.abs(ly) < o.height / 2 + pad) return true;
  }
  return false;
}

function propose(
  rng: Rng,
  type: GadgetType,
  anchor: { x: number; y: number },
  target: TargetZone,
  scenery: Scenery,
  existing: PlacedGadget[],
  idx: number
): PlacedGadget | null {
  const tdir = target.x >= anchor.x ? 1 : -1;
  let x = anchor.x;
  let y = anchor.y;
  let angle = 0;

  switch (type) {
    case 'wood_ramp':
      y = anchor.y + 40 + rng() * 110;
      x = anchor.x + tdir * (rng() * 140 - 50);
      angle = rng() < 0.15 ? rng() * 120 - 60 : tdir * (8 + rng() * 42);
      break;
    case 'bouncy_pad':
      y = anchor.y + 60 + rng() * 220;
      x = anchor.x + (rng() * 80 - 40);
      angle = tdir * rng() * 55 * (rng() < 0.2 ? -1 : 1);
      break;
    case 'wind_fan':
      x = anchor.x - tdir * (60 + rng() * 110);
      y = anchor.y + (rng() * 80 - 40);
      angle = tdir === 1 ? rng() * 50 - 35 : 180 - (rng() * 50 - 35);
      break;
    case 'spring_launcher':
      y = anchor.y + 60 + rng() * 200;
      x = anchor.x + (rng() * 100 - 50);
      angle = tdir === 1 ? -(20 + rng() * 65) : -180 + (20 + rng() * 65);
      break;
    case 'seesaw':
      y = anchor.y + 60 + rng() * 180;
      x = anchor.x + (rng() * 120 - 60);
      angle = rng() * 30 - 15;
      break;
    case 'domino_block':
      x = anchor.x + tdir * (40 + rng() * 100);
      y = anchor.y + 30 + rng() * 100;
      angle = rng() * 40 - 20;
      break;
  }

  x = Math.round(clamp(x, 60, 660));
  y = Math.round(clamp(y, 80, 900));
  if (nearObstacle(x, y, scenery.obstacles, 38)) return null;
  for (const g of existing) if (Math.hypot(g.x - x, g.y - y) < 70) return null;
  return { id: `sol_${idx}`, type, x, y, angle: norm360(angle) };
}

function pickType(rng: Rng, remaining: Partial<Record<GadgetType, number>>): GadgetType | null {
  const bag: GadgetType[] = [];
  for (const [t, n] of Object.entries(remaining) as [GadgetType, number][]) {
    for (let i = 0; i < (n || 0); i++) bag.push(t);
  }
  if (bag.length === 0) return null;
  return bag[Math.floor(rng() * bag.length)];
}

function budgetFor(d: number, allowed: GadgetType[], intro?: GadgetType): Partial<Record<GadgetType, number>> {
  const counts: Partial<Record<GadgetType, number>> = { wood_ramp: 1 + (d > 0.2 ? 1 : 0) + (d > 0.55 ? 1 : 0) };
  const extraTypes = 1 + Math.floor(d * 3);
  const pool = allowed.filter((t) => t !== 'wood_ramp');
  let given = 0;
  for (const t of pool) {
    if (given >= extraTypes && t !== intro) continue;
    counts[t] = t === 'bouncy_pad' && d > 0.5 ? 2 : 1;
    given++;
  }
  if (intro) {
    counts[intro] = counts[intro] || 1;
    counts.wood_ramp = Math.min(counts.wood_ramp || 1, 1);
  }
  return counts;
}

/** How many gadgets the solution must contain: harder levels need real chain reactions. */
export function minGadgetsFor(d: number): number {
  if (d < 0.18) return 1;
  if (d < 0.45) return 2;
  return 3;
}

function hintFor(sol: PlacedGadget[]): string {
  const names: Record<GadgetType, string> = {
    wood_ramp: 'ramp',
    bouncy_pad: 'bouncy pad',
    wind_fan: 'fan',
    domino_block: 'domino',
    seesaw: 'seesaw',
    spring_launcher: 'spring',
  };
  if (sol.length === 0) return 'Watch where the hero goes first, then help it along!';
  const first = sol[0];
  const where = first.y < 380 ? 'near the top' : first.y < 640 ? 'around the middle' : 'down low';
  return `A ${names[first.type]} ${where} could change everything. Tap GO to see what happens!`;
}

/**
 * Generator implemented as a JS generator so callers can run it in small slices
 * (never freezing the phone UI) or synchronously (tests / tools).
 */
export function* generateLevelSteps(spec: GenSpec): Generator<void, LevelDefinition | null, void> {
  const theme = themeFor(spec.worldId);
  const d = clamp(spec.difficulty, 0.02, 0.95);
  const rng = makeRng(spec.seed);
  const maxAttempts = 14;
  let simCount = 0;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const scenery = buildScenery(rng, d, spec.worldId);
    const counts = budgetFor(d, spec.allowed, spec.introGadget);
    const gravityScale = spec.twist === 'moon' ? 0.55 : 1;

    const item: DynamicObject = {
      id: `item_${spec.levelNumber}`,
      type: theme.item,
      x: scenery.start.x,
      y: scenery.start.y,
      radius: 26,
      density: 0.002,
      restitution: spec.twist === 'bouncy' ? 0.9 : 0.65,
      friction: 0.05,
      label: theme.itemLabel,
      isPrimaryGoal: true,
    };

    const base: LevelDefinition = {
      id: spec.levelNumber,
      worldId: spec.worldId,
      title: makeTitle(rng, theme),
      objective: `Guide the ${theme.itemLabel} into the ${theme.targetLabel}!`,
      worldTheme: theme.name,
      parSeconds: 12,
      maxGadgetsFor3Stars: 0,
      fixedObstacles: scenery.obstacles,
      dynamicObjects: [item],
      availableGadgets: counts,
      targetZone: scenery.target,
      intendedSolution: [],
      hintTip: '',
      generated: true,
      difficulty: d,
      gravityScale,
      twist: spec.twist ?? null,
      hueShift: spec.hue,
      tier: spec.tier ?? 'normal',
      rewardMultiplier: spec.rewardMultiplier ?? 1,
      introGadget: spec.introGadget,
    };

    // Reject trivial scenery (hero wins without any help)
    const bare = simulate(base, []);
    simCount++;
    if (bare.won) continue;

    let gadgets: PlacedGadget[] = [];
    let current = bare;
    let currentScore = bare.minDistToTarget;
    const remaining = { ...counts };
    const totalRounds = Object.values(counts).reduce((a, b) => a + (b || 0), 0);
    const minNeeded = Math.min(spec.introGadget ? 2 : minGadgetsFor(d), totalRounds);
    let solved = false;

    for (let round = 0; round < totalRounds && !solved; round++) {
      let best: { g: PlacedGadget; res: ReturnType<typeof simulate>; score: number } | null = null;
      const forced = round === 0 && spec.introGadget ? spec.introGadget : null;
      const candidates = round === 0 ? 44 : 30;

      for (let c = 0; c < candidates; c++) {
        const type = forced ?? pickType(rng, remaining);
        if (!type) break;
        const traj = current.trajectory;
        const anchor =
          traj.length > 0 && rng() < 0.9
            ? traj[Math.min(traj.length - 1, Math.floor(Math.pow(rng(), 0.8) * traj.length))]
            : scenery.start;
        const g = propose(rng, type, anchor, scenery.target, scenery, gadgets, gadgets.length);
        if (!g) continue;
        const res = simulate(base, [...gadgets, g]);
        simCount++;
        if (simCount % 4 === 0) yield;
        // Too-early win = the puzzle would be too simple for this difficulty; skip it
        if (res.won && gadgets.length + 1 < minNeeded) continue;
        const score = res.won ? -1 : res.minDistToTarget;
        if (!best || score < best.score) best = { g, res, score };
        if (res.won) break;
      }

      if (!best) break;
      const improved = best.score < currentScore - 6 || best.res.won;
      if (!improved && !(forced && gadgets.length === 0)) break;
      gadgets = [...gadgets, best.g];
      remaining[best.g.type] = Math.max(0, (remaining[best.g.type] || 0) - 1);
      current = best.res;
      currentScore = best.score;
      solved = best.res.won;
    }

    if (!solved) continue;

    // Forgiveness check: the player must not need pixel-perfect placement.
    const jitter = 8 + (1 - d) * 8;
    const angJitter = 4 + (1 - d) * 4;
    let okRuns = 0;
    const need = d < 0.6 ? 3 : 2;
    const verifyRng = makeRng(spec.seed ^ 0x5bd1e995);
    for (let t = 0; t < 4; t++) {
      const wobbled = gadgets.map((g) => ({
        ...g,
        x: g.x + Math.round((verifyRng() - 0.5) * 2 * jitter),
        y: g.y + Math.round((verifyRng() - 0.5) * 2 * jitter),
        angle: norm360(g.angle + (verifyRng() - 0.5) * 2 * angJitter),
      }));
      if (simulate(base, wobbled).won) okRuns++;
      simCount++;
      yield;
    }
    if (okRuns < need) continue;

    // The exact stored solution must work (twice, physics has a tiny random bounce)
    if (!simulate(base, gadgets).won || !simulate(base, gadgets).won) continue;

    const used = gadgets.length;
    return {
      ...base,
      maxGadgetsFor3Stars: used,
      intendedSolution: gadgets.map((g) => ({ type: g.type, x: g.x, y: g.y, angle: g.angle })),
      hintTip: hintFor(gadgets),
      title: spec.twist === 'moon' ? `🌙 ${base.title}` : spec.twist === 'bouncy' ? `🎈 ${base.title}` : base.title,
    };
  }
  return null;
}

/** Synchronous convenience wrapper (tests, tools, fallbacks). */
export function generateLevelSync(spec: GenSpec): LevelDefinition | null {
  const it = generateLevelSteps(spec);
  for (;;) {
    const r = it.next();
    if (r.done) return r.value;
  }
}

/** Async wrapper that yields to the browser regularly so the UI stays smooth. */
export function generateLevelAsync(spec: GenSpec): Promise<LevelDefinition | null> {
  return new Promise((resolve) => {
    const it = generateLevelSteps(spec);
    const tick = () => {
      const start = performance.now();
      for (;;) {
        const r = it.next();
        if (r.done) {
          resolve(r.value);
          return;
        }
        if (performance.now() - start > 10) break; // ~10ms slices
      }
      setTimeout(tick, 0);
    };
    tick();
  });
}
