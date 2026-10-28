import { DynamicObject, TargetZone } from '../types/game';

export interface WorldTheme {
  id: number;
  name: string;
  icon: string;
  item: DynamicObject['type'];
  itemLabel: string;
  targetType: TargetZone['type'];
  targetLabel: string;
  shelfColors: [string, string];
  adjectives: string[];
  nouns: string[];
}

export const WORLD_THEMES: WorldTheme[] = [
  { id: 1, name: 'Kitchen Catastrophe', icon: '🍳', item: 'ball_egg', itemLabel: 'Fresh Egg', targetType: 'cup', targetLabel: 'Frying Pan', shelfColors: ['#A16207', '#CA8A04'], adjectives: ['Sizzling', 'Crispy', 'Toasty', 'Buttery', 'Sunny'], nouns: ['Breakfast', 'Pancake Run', 'Spoon Slide', 'Waffle Drop', 'Brunch'] },
  { id: 2, name: 'Messy Bedroom', icon: '⏰', item: 'alarm_clock', itemLabel: 'Alarm Clock', targetType: 'target_pad', targetLabel: 'Snooze Pillow', shelfColors: ['#7C3AED', '#6366F1'], adjectives: ['Sleepy', 'Dreamy', 'Cozy', 'Snoozy', 'Fluffy'], nouns: ['Pillow Fort', 'Bedtime', 'Nap Slide', 'Blanket Roll', 'Midnight Dash'] },
  { id: 3, name: 'Toy Workshop', icon: '🧸', item: 'rubber_duck', itemLabel: 'Rubber Duck', targetType: 'basket', targetLabel: 'Toy Chest', shelfColors: ['#0D9488', '#14B8A6'], adjectives: ['Squeaky', 'Wind-up', 'Wobbly', 'Blocky', 'Giggly'], nouns: ['Playtime', 'Block Tower', 'Gear Glide', 'Duck Dash', 'Toy Parade'] },
  { id: 4, name: 'Office Chaos', icon: '☕', item: 'coffee_mug', itemLabel: 'Coffee Mug', targetType: 'cup', targetLabel: 'Coaster Tray', shelfColors: ['#475569', '#64748B'], adjectives: ['Busy', 'Sticky-note', 'Paperclip', 'Caffeinated', 'Stapled'], nouns: ['Monday', 'Desk Dash', 'Coffee Break', 'Memo Slide', 'Meeting'] },
  { id: 5, name: 'Supermarket Sweep', icon: '🛒', item: 'soda_bottle', itemLabel: 'Rolling Soda Can', targetType: 'basket', targetLabel: 'Shopping Basket', shelfColors: ['#DB2777', '#F472B6'], adjectives: ['Bargain', 'Fizzy', 'Fresh', 'Aisle-5', 'Discount'], nouns: ['Sale', 'Cart Chase', 'Snack Run', 'Checkout', 'Shelf Hop'] },
  { id: 6, name: 'Lush Garden', icon: '🌻', item: 'boulder', itemLabel: 'Garden Melon', targetType: 'basket', targetLabel: 'Wheelbarrow', shelfColors: ['#65A30D', '#84CC16'], adjectives: ['Blooming', 'Buzzy', 'Leafy', 'Dewy', 'Sprouting'], nouns: ['Meadow', 'Seed Roll', 'Bee Bounce', 'Garden Path', 'Petal Slide'] },
  { id: 7, name: 'Construction Zone', icon: '🚧', item: 'boulder', itemLabel: 'Steel Rivet', targetType: 'target_pad', targetLabel: 'Bucket Chute', shelfColors: ['#D97706', '#F59E0B'], adjectives: ['Hard-hat', 'Clanky', 'Girder', 'Heavy', 'Bolted'], nouns: ['Build Site', 'Crane Drop', 'Beam Slide', 'Barrel Roll', 'Dig-in'] },
  { id: 8, name: 'Candy Factory', icon: '🍬', item: 'gumball', itemLabel: 'Giant Gumball', targetType: 'cup', targetLabel: 'Candy Dispenser', shelfColors: ['#C026D3', '#E879F9'], adjectives: ['Sugary', 'Minty', 'Gooey', 'Sprinkly', 'Jelly'], nouns: ['Candy Rush', 'Lollipop Slide', 'Gumdrop Drop', 'Sweet Spin', 'Taffy Twist'] },
  { id: 9, name: 'Science Lab', icon: '🧪', item: 'gumball', itemLabel: 'Plasma Sphere', targetType: 'finish_gate', targetLabel: 'Particle Collector', shelfColors: ['#0891B2', '#22D3EE'], adjectives: ['Bubbly', 'Fizzing', 'Glowing', 'Atomic', 'Quirky'], nouns: ['Experiment', 'Flask Run', 'Beaker Slide', 'Lab Test', 'Eureka'] },
  { id: 10, name: 'Grand Finale', icon: '🏆', item: 'ball_egg', itemLabel: 'Golden Relic', targetType: 'bell', targetLabel: 'Victory Gong', shelfColors: ['#7C3AED', '#A855F7'], adjectives: ['Glittering', 'Golden', 'Starry', 'Grand', 'Dazzling'], nouns: ['Showtime', 'Spotlight', 'Encore', 'Confetti Run', 'Curtain Call'] },
];

export function themeFor(worldId: number): WorldTheme {
  return WORLD_THEMES[(worldId - 1) % WORLD_THEMES.length] || WORLD_THEMES[0];
}

// --- Deterministic RNG (mulberry32) so generated levels are reproducible from a seed ---
export type Rng = () => number;

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(...nums: number[]): number {
  let h = 2166136261;
  for (const n of nums) {
    h ^= Math.floor(n) + 0x9e3779b9;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Every level gets a different world AND a clearly different hue than the previous one,
 * so two consecutive levels never look alike.
 */
export function pickTheme(rng: Rng, prevWorld: number, prevHue: number): { worldId: number; hue: number } {
  let worldId = 1 + Math.floor(rng() * 10);
  if (worldId === prevWorld) worldId = (worldId % 10) + 1;
  let hue = Math.floor(rng() * 360);
  for (let i = 0; i < 12; i++) {
    const diff = Math.abs(((hue - prevHue + 540) % 360) - 180);
    if (diff >= 70 && diff <= 290) break;
    hue = Math.floor(rng() * 360);
  }
  return { worldId, hue };
}

/** Keep one world theme for each ten-level set while changing the palette between sets. */
export function themeForLevel(seed: number, levelNumber: number): { worldId: number; hue: number } {
  const setIndex = Math.max(0, Math.floor((levelNumber - 1) / 10));
  return {
    worldId: (setIndex % WORLD_THEMES.length) + 1,
    hue: (seed % 360 + setIndex * 113) % 360,
  };
}

export function makeTitle(rng: Rng, theme: WorldTheme): string {
  const a = theme.adjectives[Math.floor(rng() * theme.adjectives.length)];
  const n = theme.nouns[Math.floor(rng() * theme.nouns.length)];
  return `${a} ${n}`;
}
