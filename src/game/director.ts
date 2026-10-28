import { EndlessState, GadgetType, LevelTier } from '../types/game';
import { GenSpec } from './generator';
import { hashSeed, makeRng, themeForLevel } from './themes';

/**
 * The "Director" decides what the NEXT level should feel like, based on how the player just played.
 * Goals (flow theory + variable rewards, no dark patterns):
 *  - keep the player winning roughly 3 of 4 levels on their first or second try
 *  - rise very slowly, with breathers (sawtooth) so effort never becomes a wall
 *  - if the player struggled, the next level is a gift (easier); if they cruised, nudge up
 *  - sprinkle surprises (twist levels, lucky levels, mystery eggs) at unpredictable intervals
 */

export const TUTORIAL_TEMPLATES = [1, 2]; // The guided onboarding is limited to the first two levels.
export const SAFE_FALLBACK_TEMPLATES = [1, 2, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19, 20];
export const TUTORIAL_COUNT = TUTORIAL_TEMPLATES.length;

export const PAL_IDS = ['🐣', '🐥', '🐰', '🐱', '🐶', '🐼', '🦊', '🐸', '🦄', '🐙', '🐢', '🐧', '🐨', '🦁', '🐯', '🐵'];

export const INTRO_SCHEDULE: { gadget: GadgetType; minLevel: number }[] = [
  { gadget: 'seesaw', minLevel: 14 },
  { gadget: 'domino_block', minLevel: 22 },
];

export const BASE_MECHANICS: GadgetType[] = ['wood_ramp', 'bouncy_pad', 'wind_fan', 'spring_launcher'];

export function defaultEndless(): EndlessState {
  return {
    seed: Math.floor(Math.random() * 2 ** 31),
    level: 1,
    skill: 0.2,
    frustration: 0,
    streak: 0,
    bestStreak: 0,
    sinceBreather: 0,
    sinceTwist: 0,
    sinceEgg: 0,
    totalWins: 0,
    totalFails: 0,
    totalStars: 0,
    coins: 0,
    gems: 0,
    pals: [],
    gadgetCards: [],
    collectionRewardClaimed: false,
    villageLevels: [0, 0, 0, 0],
    dailySpinClaimDay: '',
    bestMiniScore: 0,
    mechanicsSeen: [...BASE_MECHANICS],
    lastWorld: 1,
    lastHue: 0,
    lastDifficulty: 0.05,
    dailyLastClaim: '',
    dailyStreak: 0,
    recent: [],
  };
}

export interface LevelOutcome {
  levelNumber: number;
  difficulty: number;
  attempts: number; // 1 = solved on first GO
  hintsUsed: number;
  thinkSeconds: number;
  tier: LevelTier;
  rewardMultiplier: number;
  introGadget?: GadgetType;
  worldId?: number;
  hue?: number;
}

export interface RewardSummary {
  stars: number;
  coins: number;
  streak: number;
  bonusEgg: boolean;
  newPal: string | null;
  duplicatePalCoins: number;
  luckyMultiplier: number;
  encouragement: string;
}

/** 0..1 how smoothly the level went. */
export function performanceScore(o: LevelOutcome): number {
  const byAttempts = o.attempts <= 1 ? 1 : o.attempts === 2 ? 0.72 : o.attempts === 3 ? 0.5 : 0.28;
  const hintPenalty = Math.min(0.3, o.hintsUsed * 0.12);
  const slowPenalty = o.thinkSeconds > 120 ? 0.1 : 0;
  return Math.max(0, byAttempts - hintPenalty - slowPenalty);
}

/** Stars are about smooth solving, never about punishing: 3 = first try, 2 = within 3, 1 = any win. */
export function starsFor(o: LevelOutcome): number {
  if (o.attempts <= 1 && o.hintsUsed === 0) return 3;
  if (o.attempts <= 3) return 2;
  return 1;
}

const ENCOURAGE = {
  great: ['Smooth moves!', 'Genius contraption!', 'You made that look easy!', 'Chain reaction master!'],
  ok: ['Nice one!', 'Yes! That worked!', 'Oops… turned into a win!', 'Persistence pays off!'],
  tough: ['You never gave up — that was a tricky one!', 'Brilliant comeback!', 'That one was sneaky, and you beat it!'],
};

function pick<T>(arr: T[], r: number): T {
  return arr[Math.floor(r * arr.length) % arr.length];
}

function localDay(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function canClaimDaily(e: EndlessState): boolean {
  return e.dailyLastClaim !== localDay();
}

export function claimDaily(e: EndlessState): { next: EndlessState; coins: number; streak: number } {
  const today = localDay();
  let streak = 1;
  if (e.dailyLastClaim) {
    const last = new Date(e.dailyLastClaim + 'T00:00:00');
    const gap = Math.round((new Date(today + 'T00:00:00').getTime() - last.getTime()) / 86400000);
    // Forgiving streak: missing a single day does not break it
    streak = gap <= 2 ? Math.min(30, e.dailyStreak + 1) : 1;
  }
  const coins = 30 + Math.min(streak, 7) * 10;
  return { next: { ...e, dailyLastClaim: today, dailyStreak: streak, coins: e.coins + coins }, coins, streak };
}

/** Called when the player fails a run (UI shows a funny OOPS). Raises frustration gently. */
export function recordFail(e: EndlessState): EndlessState {
  return { ...e, frustration: Math.min(1, e.frustration + 0.18), totalFails: e.totalFails + 1 };
}

/** Called once when a level is solved. Updates skill model and returns rewards. */
export function recordWin(e: EndlessState, o: LevelOutcome): { next: EndlessState; reward: RewardSummary } {
  const perf = performanceScore(o);
  const stars = starsFor(o);
  const rng = makeRng(hashSeed(e.seed, o.levelNumber, 77, o.attempts));

  // skill: EMA toward performance, scaled so one bad level can't crash it
  // Skill only grows when the player beats levels near or above their current level (no inflation
  // from easy breathers) and only drops a little when they struggle on something much harder.
  let skill = e.skill;
  const dRel = o.difficulty - e.skill;
  if (perf >= 0.72) skill += dRel >= -0.06 ? 0.05 : 0.01;
  else if (perf <= 0.5) skill -= dRel <= 0.1 ? 0.07 : 0.03;
  skill = Math.min(0.95, Math.max(0.02, skill));

  let frustration = e.frustration * 0.45;
  if (o.attempts >= 3) frustration = Math.min(1, frustration + 0.3);
  if (o.thinkSeconds > 120) frustration = Math.min(1, frustration + 0.15);

  const smooth = o.attempts <= 3;
  const streak = smooth ? e.streak + 1 : 0;

  // coins
  const lucky = o.tier === 'lucky' ? 3 : 1;
  let coins = (10 + stars * 5 + Math.min(streak, 10) * 2) * lucky;

  // mystery egg: variable reward with pity timer (guaranteed after 6 levels without one)
  const eggChance = 0.16 + (o.attempts >= 3 ? 0.1 : 0) + (o.tier === 'lucky' ? 0.3 : 0);
  const bonusEgg = e.sinceEgg >= 5 || rng() < eggChance;
  let newPal: string | null = null;
  let duplicatePalCoins = 0;
  let pals = e.pals;
  if (bonusEgg) {
    const missing = PAL_IDS.filter((p) => !e.pals.includes(p));
    if (missing.length > 0) {
      newPal = pick(missing, rng());
      pals = [...e.pals, newPal];
    } else {
      duplicatePalCoins = 60;
      coins += duplicatePalCoins;
    }
  }

  const mechanicsSeen =
    o.introGadget && !e.mechanicsSeen.includes(o.introGadget) ? [...e.mechanicsSeen, o.introGadget] : e.mechanicsSeen;

  const sinceBreather = o.tier === 'breather' || o.tier === 'relief' || o.tier === 'lucky' ? 0 : e.sinceBreather + 1;
  const sinceTwist = o.tier === 'twist' ? 0 : e.sinceTwist + 1;

  const recent = [...e.recent, perf].slice(-8);
  const next: EndlessState = {
    ...e,
    level: o.levelNumber + 1,
    skill,
    frustration,
    streak,
    bestStreak: Math.max(e.bestStreak, streak),
    sinceBreather,
    sinceTwist,
    sinceEgg: bonusEgg ? 0 : e.sinceEgg + 1,
    totalWins: e.totalWins + 1,
    totalStars: e.totalStars + stars,
    coins: e.coins + coins,
    pals,
    mechanicsSeen,
    lastDifficulty: o.difficulty,
    lastWorld: o.worldId ?? e.lastWorld,
    lastHue: o.hue ?? e.lastHue,
    recent,
  };

  const encouragement =
    perf >= 0.9 ? pick(ENCOURAGE.great, rng()) : perf >= 0.5 ? pick(ENCOURAGE.ok, rng()) : pick(ENCOURAGE.tough, rng());

  return {
    next,
    reward: { stars, coins, streak, bonusEgg, newPal, duplicatePalCoins, luckyMultiplier: lucky, encouragement },
  };
}

/** Slow, saturating difficulty curve: never a wall, always a little more. */
export function baseDifficulty(levelNumber: number): number {
  const n = Math.max(0, levelNumber - TUTORIAL_COUNT);
  return 0.05 + 0.5 * (1 - Math.exp(-n / 45)) + 0.25 * (1 - Math.exp(-n / 300));
}

export type Tier3 = 'easy' | 'normal' | 'hard';

/**
 * Chooses which of the pre-generated candidates to serve next.
 * Sustained struggle -> recovery level; cruising -> hard; otherwise normal.
 */
export function chooseTier(e: EndlessState, justPlayed: LevelOutcome): Tier3 {
  const perf = performanceScore(justPlayed);
  const recentLowScores = e.recent.slice(-3).filter((score) => score <= 0.35).length;
  if (justPlayed.attempts >= 5 || e.frustration >= 0.72 || recentLowScores >= 2) return 'easy';
  if (justPlayed.attempts === 1 && justPlayed.hintsUsed === 0 && e.frustration < 0.2 && e.recent.slice(-3).every((r) => r >= 0.72)) {
    return 'hard';
  }
  return 'normal';
}

/** Builds the generation spec(s) for level `levelNumber` for each of the three tiers. */
export function specsForLevel(e: EndlessState, levelNumber: number): Record<Tier3, GenSpec> {
  const rng = makeRng(hashSeed(e.seed, levelNumber, 4242));
  const theme = themeForLevel(e.seed, levelNumber);
  // Never more than a small step above what this player has shown they can handle
  const base = Math.min(baseDifficulty(levelNumber) + (e.skill - 0.4) * 0.22, e.skill + 0.12);
  const recentLowScores = e.recent.slice(-3).filter((score) => score <= 0.35).length;

  // Level "kind": decided once per level number so all three tiers share the same flavour
  let kind: LevelTier = 'normal';
  let twist: 'moon' | 'bouncy' | null = null;
  let introGadget: GadgetType | undefined;
  const intro = INTRO_SCHEDULE.find((i) => levelNumber >= i.minLevel && !e.mechanicsSeen.includes(i.gadget));
  const roll = rng();
  if (intro) {
    kind = 'intro';
    introGadget = intro.gadget;
  } else if (
    e.sinceBreather >= 3 + Math.floor(rng() * 2) &&
    (e.frustration >= 0.58 || recentLowScores >= 2)
  ) {
    kind = 'breather';
  } else if (levelNumber > 12 && e.sinceTwist >= 5 + Math.floor(rng() * 4)) {
    kind = 'twist';
    twist = rng() < 0.5 ? 'moon' : 'bouncy';
  } else if (levelNumber > 6 && roll < 0.07) {
    kind = 'lucky';
  }

  const kindScale = kind === 'breather' ? 0.6 : kind === 'twist' ? 0.8 : kind === 'lucky' ? 0.75 : kind === 'intro' ? 0.65 : 1;
  const mk = (tierScale: number, tier: LevelTier, suffix: number): GenSpec => ({
    levelNumber,
    difficulty: Math.min(0.92, Math.max(0.04, base * kindScale * tierScale)),
    seed: hashSeed(e.seed, levelNumber, suffix),
    worldId: theme.worldId,
    hue: theme.hue,
    allowed: e.mechanicsSeen.concat(introGadget && !e.mechanicsSeen.includes(introGadget) ? [introGadget] : []),
    introGadget,
    twist,
    tier,
    rewardMultiplier: kind === 'lucky' ? 3 : 1,
  });

  const tierName: LevelTier = kind;
  return {
    easy: mk(0.55, kind === 'normal' ? 'relief' : tierName, 1),
    normal: mk(1, tierName, 2),
    hard: mk(1.15, tierName, 3),
  };
}
