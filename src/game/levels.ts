import {
  LevelDefinition,
  WorldInfo,
  GadgetType,
  DynamicObject,
  FixedObstacle,
  TargetZone,
  IntendedGadgetPlacement,
} from '../types/game';

export const WORLDS: WorldInfo[] = [
  {
    id: 1,
    name: 'Kitchen Catastrophe',
    subtitle: 'Toasters, breakfast bowls & flying spoons',
    themeColor: '#EA580C',
    bgGradient: 'from-amber-50 to-orange-100',
    icon: '🍳',
    startLevel: 1,
    endLevel: 20,
  },
  {
    id: 2,
    name: 'Messy Bedroom',
    subtitle: 'Alarm clocks, pillow bounces & book dominoes',
    themeColor: '#3B82F6',
    bgGradient: 'from-sky-50 to-blue-100',
    icon: '⏰',
    startLevel: 21,
    endLevel: 40,
  },
  {
    id: 3,
    name: 'Toy Workshop',
    subtitle: 'Rubber ducks, bowling pins & wind-up gears',
    themeColor: '#10B981',
    bgGradient: 'from-emerald-50 to-teal-100',
    icon: '🧸',
    startLevel: 41,
    endLevel: 60,
  },
  {
    id: 4,
    name: 'Office Chaos',
    subtitle: 'Rolling chairs, coffee mugs & paper catapults',
    themeColor: '#6366F1',
    bgGradient: 'from-indigo-50 to-purple-100',
    icon: '☕',
    startLevel: 61,
    endLevel: 80,
  },
  {
    id: 5,
    name: 'Supermarket Sweep',
    subtitle: 'Shopping carts, cereal boxes & soda rockets',
    themeColor: '#EC4899',
    bgGradient: 'from-pink-50 to-rose-100',
    icon: '🛒',
    startLevel: 81,
    endLevel: 100,
  },
  {
    id: 6,
    name: 'Lush Garden',
    subtitle: 'Watering cans, seed rolls & bee bouncers',
    themeColor: '#84CC16',
    bgGradient: 'from-lime-50 to-emerald-100',
    icon: '🌻',
    startLevel: 101,
    endLevel: 120,
  },
  {
    id: 7,
    name: 'Construction Zone',
    subtitle: 'Wrecking balls, girders & heavy barrels',
    themeColor: '#F59E0B',
    bgGradient: 'from-amber-100 to-yellow-200',
    icon: '🚧',
    startLevel: 121,
    endLevel: 140,
  },
  {
    id: 8,
    name: 'Candy Factory',
    subtitle: 'Gumball chutes, peppermint spins & jelly pads',
    themeColor: '#D946EF',
    bgGradient: 'from-fuchsia-50 to-pink-100',
    icon: '🍬',
    startLevel: 141,
    endLevel: 160,
  },
  {
    id: 9,
    name: 'Science Lab',
    subtitle: 'Anti-gravity fans, flask balances & magnets',
    themeColor: '#06B6D4',
    bgGradient: 'from-cyan-50 to-sky-100',
    icon: '🧪',
    startLevel: 161,
    endLevel: 180,
  },
  {
    id: 10,
    name: 'Grand Finale',
    subtitle: 'The Ultimate Rube Goldberg Mega-Contraptions',
    themeColor: '#8B5CF6',
    bgGradient: 'from-violet-100 to-fuchsia-100',
    icon: '🏆',
    startLevel: 181,
    endLevel: 200,
  },
];

function createLevel(id: number): LevelDefinition {
  const worldIndex = Math.floor((id - 1) / 20);
  const worldId = worldIndex + 1;
  const world = WORLDS[worldIndex];
  const levelInWorld = ((id - 1) % 20) + 1; // 1 to 20

  const worldItemTypes: Record<
    number,
    { item: DynamicObject['type']; label: string; targetType: TargetZone['type']; targetLabel: string }
  > = {
    1: { item: 'ball_egg', label: 'Fresh Egg', targetType: 'cup', targetLabel: 'Frying Pan' },
    2: { item: 'alarm_clock', label: 'Alarm Clock', targetType: 'target_pad', targetLabel: 'Snooze Pillow' },
    3: { item: 'rubber_duck', label: 'Rubber Duck', targetType: 'basket', targetLabel: 'Toy Chest' },
    4: { item: 'coffee_mug', label: 'Coffee Mug', targetType: 'cup', targetLabel: 'Coaster Tray' },
    5: { item: 'soda_bottle', label: 'Rolling Soda Can', targetType: 'basket', targetLabel: 'Shopping Basket' },
    6: { item: 'boulder', label: 'Garden Melon', targetType: 'basket', targetLabel: 'Wheelbarrow' },
    7: { item: 'boulder', label: 'Steel Rivet', targetType: 'target_pad', targetLabel: 'Bucket Chute' },
    8: { item: 'gumball', label: 'Giant Gumball', targetType: 'cup', targetLabel: 'Candy Dispenser' },
    9: { item: 'gumball', label: 'Plasma Sphere', targetType: 'finish_gate', targetLabel: 'Particle Collector' },
    10: { item: 'ball_egg', label: 'Golden Relic', targetType: 'bell', targetLabel: 'Victory Gong' },
  };

  const itemMeta = worldItemTypes[worldId] || worldItemTypes[1];

  let startX = 160;
  let startY = 120;
  let targetZone: TargetZone = {
    x: 580,
    y: 840,
    width: 140,
    height: 40,
    label: itemMeta.targetLabel,
    type: itemMeta.targetType,
  };

  let fixedObstacles: FixedObstacle[] = [];
  let availableGadgets: { [key in GadgetType]?: number } = {};
  let intendedSolution: IntendedGadgetPlacement[] = [];
  let title = '';
  let objective = '';
  let hintTip = '';

  // 20 completely distinct level patterns
  switch (levelInWorld) {
    case 1:
      title = `${world.name}: Gentle Slope`;
      objective = `Guide the ${itemMeta.label} into the ${itemMeta.targetLabel}!`;
      hintTip = 'Place a wooden ramp beneath the top shelf and another above the goal.';
      fixedObstacles = [
        { id: 'shelf_start', type: 'shelf', x: 180, y: 180, width: 140, height: 18, angle: 22, color: '#A16207' },
        { id: 'shelf_mid', type: 'shelf', x: 400, y: 500, width: 160, height: 18, angle: 22, color: '#A16207' },
      ];
      availableGadgets = { wood_ramp: 2 };
      intendedSolution = [
        { type: 'wood_ramp', x: 290, y: 340, angle: 24 },
        { type: 'wood_ramp', x: 510, y: 670, angle: 24 },
      ];
      break;

    case 2:
      title = `${world.name}: Bouncy Leap`;
      objective = `Use a bouncy pad to rebound high over the tall barrier into the ${itemMeta.targetLabel}!`;
      hintTip = 'Position a bouncy pad near the floor angled up to leap over the divider.';
      fixedObstacles = [
        { id: 'shelf_start', type: 'shelf', x: 140, y: 170, width: 120, height: 18, angle: 25, color: '#A16207' },
        { id: 'barrier', type: 'wall', x: 360, y: 650, width: 24, height: 260, color: '#475569' },
      ];
      availableGadgets = { wood_ramp: 1, bouncy_pad: 1 };
      intendedSolution = [
        { type: 'wood_ramp', x: 220, y: 320, angle: 35 },
        { type: 'bouncy_pad', x: 260, y: 860, angle: 20 },
      ];
      break;

    case 3:
      title = `${world.name}: Zig-Zag Ramps`;
      objective = `Guide the ${itemMeta.label} smoothly through alternating slopes!`;
      hintTip = 'Place ramps to steer the roll from left to right past the shelves.';
      fixedObstacles = [
        { id: 'shelf_start', type: 'shelf', x: 140, y: 170, width: 120, height: 18, angle: 22, color: '#A16207' },
        { id: 'mid_shelf_1', type: 'shelf', x: 540, y: 430, width: 240, height: 18, angle: -24, color: '#475569' },
        { id: 'mid_shelf_2', type: 'shelf', x: 220, y: 580, width: 280, height: 18, angle: 22, color: '#475569' },
      ];
      availableGadgets = { wood_ramp: 2 };
      intendedSolution = [
        { type: 'wood_ramp', x: 240, y: 290, angle: 26 },
        { type: 'wood_ramp', x: 420, y: 720, angle: 26 },
      ];
      break;

    case 4:
      title = `${world.name}: Wind Fan Boost`;
      objective = `Use an electric wind fan to carry the object across the gap!`;
      hintTip = 'Position the fan horizontally to push the falling item rightward.';
      fixedObstacles = [
        { id: 'shelf_start', type: 'shelf', x: 140, y: 170, width: 120, height: 18, angle: 22, color: '#A16207' },
        { id: 'divider', type: 'wall', x: 320, y: 720, width: 24, height: 280, color: '#475569' },
      ];
      availableGadgets = { wood_ramp: 2, wind_fan: 1 };
      intendedSolution = [
        { type: 'wood_ramp', x: 220, y: 320, angle: 30 },
        { type: 'wind_fan', x: 160, y: 560, angle: 0 },
        { type: 'wood_ramp', x: 460, y: 700, angle: 25 },
      ];
      break;

    case 5:
      title = `${world.name}: Dual Ramp Glide`;
      objective = `Build a steep glide into the target platform!`;
      hintTip = 'Overlap ramp slopes to create continuous rolling momentum.';
      fixedObstacles = [
        { id: 'shelf_start', type: 'shelf', x: 140, y: 170, width: 120, height: 18, angle: 22, color: '#A16207' },
        { id: 'table_mid', type: 'shelf', x: 460, y: 620, width: 180, height: 18, angle: 15, color: '#A16207' },
      ];
      availableGadgets = { wood_ramp: 2 };
      intendedSolution = [
        { type: 'wood_ramp', x: 240, y: 320, angle: 35 },
        { type: 'wood_ramp', x: 380, y: 520, angle: 25 },
      ];
      break;

    case 6:
      title = `${world.name}: Long Runway`;
      objective = `Guide momentum down the long platform into the ${itemMeta.targetLabel}!`;
      hintTip = 'Aim the ramp directly onto the long platform.';
      fixedObstacles = [
        { id: 'shelf_start', type: 'shelf', x: 140, y: 170, width: 120, height: 18, angle: 22, color: '#A16207' },
        { id: 'table_runway', type: 'shelf', x: 380, y: 560, width: 240, height: 18, angle: 12, color: '#A16207' },
      ];
      availableGadgets = { wood_ramp: 2 };
      intendedSolution = [
        { type: 'wood_ramp', x: 250, y: 340, angle: 30 },
        { type: 'wood_ramp', x: 480, y: 720, angle: 25 },
      ];
      break;

    case 7:
      title = `${world.name}: Trampoline Spire`;
      objective = `Bounce high over the tall spire into the goal!`;
      hintTip = 'Position the bouncy pad so the ball hits it at high speed.';
      fixedObstacles = [
        { id: 'shelf_start', type: 'shelf', x: 140, y: 170, width: 120, height: 18, angle: 22, color: '#A16207' },
        { id: 'spire', type: 'wall', x: 380, y: 640, width: 24, height: 300, color: '#334155' },
      ];
      availableGadgets = { wood_ramp: 1, bouncy_pad: 1 };
      intendedSolution = [
        { type: 'wood_ramp', x: 220, y: 320, angle: 35 },
        { type: 'bouncy_pad', x: 250, y: 860, angle: 20 },
      ];
      break;

    case 8:
      title = `${world.name}: Wind Tunnel Channel`;
      objective = `Guide the item through the windy channel!`;
      hintTip = 'Use a ramp to drop into the air stream.';
      fixedObstacles = [
        { id: 'shelf_start', type: 'shelf', x: 140, y: 170, width: 120, height: 18, angle: 22, color: '#A16207' },
        { id: 'channel_1', type: 'shelf', x: 280, y: 460, width: 180, height: 18, angle: 15, color: '#475569' },
        { id: 'channel_2', type: 'shelf', x: 480, y: 680, width: 180, height: 18, angle: 15, color: '#475569' },
      ];
      availableGadgets = { wood_ramp: 2, wind_fan: 1 };
      intendedSolution = [
        { type: 'wood_ramp', x: 240, y: 310, angle: 30 },
        { type: 'wind_fan', x: 180, y: 620, angle: 0 },
        { type: 'wood_ramp', x: 420, y: 550, angle: 20 },
      ];
      break;

    case 9:
      title = `${world.name}: Three-Step Stairway`;
      objective = `Build a 3-tier ramp staircase to cross the shelves!`;
      hintTip = 'Place three ramps that cascade into each other.';
      fixedObstacles = [
        { id: 'shelf_start', type: 'shelf', x: 140, y: 170, width: 120, height: 18, angle: 22, color: '#A16207' },
        { id: 'step_1', type: 'shelf', x: 340, y: 440, width: 140, height: 18, angle: 15, color: '#A16207' },
        { id: 'step_2', type: 'shelf', x: 460, y: 660, width: 140, height: 18, angle: 15, color: '#A16207' },
      ];
      availableGadgets = { wood_ramp: 3 };
      intendedSolution = [
        { type: 'wood_ramp', x: 240, y: 300, angle: 25 },
        { type: 'wood_ramp', x: 380, y: 540, angle: 25 },
        { type: 'wood_ramp', x: 500, y: 760, angle: 25 },
      ];
      break;

    case 10:
      title = `${world.name}: Pillar Showcase`;
      objective = `Unleash ramps and bouncy pads to complete the world showcase!`;
      hintTip = 'Combine a ramp start with a high bouncy rebound.';
      fixedObstacles = [
        { id: 'shelf_start', type: 'shelf', x: 140, y: 170, width: 120, height: 18, angle: 22, color: '#A16207' },
        { id: 'pillar', type: 'wall', x: 340, y: 580, width: 24, height: 260, color: '#334155' },
      ];
      availableGadgets = { wood_ramp: 1, bouncy_pad: 1 };
      intendedSolution = [
        { type: 'wood_ramp', x: 220, y: 320, angle: 35 },
        { type: 'bouncy_pad', x: 250, y: 860, angle: 20 },
      ];
      break;

    case 11:
      title = `${world.name}: Opposite Corner Drop`;
      objective = `Launch from top-right down across to the bottom-left ${itemMeta.targetLabel}!`;
      hintTip = 'Angle the ramp to roll leftward towards the goal.';
      startX = 560;
      startY = 120;
      targetZone = { x: 160, y: 840, width: 140, height: 40, label: itemMeta.targetLabel, type: itemMeta.targetType };
      fixedObstacles = [
        { id: 'shelf_start', type: 'shelf', x: 580, y: 170, width: 120, height: 18, angle: -22, color: '#A16207' },
        { id: 'mid_col', type: 'wall', x: 360, y: 500, width: 24, height: 260, color: '#475569' },
      ];
      availableGadgets = { wood_ramp: 1, bouncy_pad: 1 };
      intendedSolution = [
        { type: 'wood_ramp', x: 480, y: 320, angle: -30 },
        { type: 'bouncy_pad', x: 450, y: 860, angle: -20 },
      ];
      break;

    case 12:
      title = `${world.name}: Floating Center Island`;
      objective = `Navigate around the floating shelf block into the ${itemMeta.targetLabel}!`;
      hintTip = 'Guide the rolling item smoothly past the top of the island.';
      fixedObstacles = [
        { id: 'shelf_start', type: 'shelf', x: 140, y: 170, width: 120, height: 18, angle: 22, color: '#A16207' },
        { id: 'island', type: 'shelf', x: 360, y: 460, width: 220, height: 36, color: '#475569' },
      ];
      availableGadgets = { wood_ramp: 2 };
      intendedSolution = [
        { type: 'wood_ramp', x: 240, y: 310, angle: 25 },
        { type: 'wood_ramp', x: 480, y: 640, angle: 25 },
      ];
      break;

    case 13:
      title = `${world.name}: Spring Box Blast`;
      objective = `Drop onto the mechanical Spring Box to blast across the wall!`;
      hintTip = 'Place the Spring Box right below the drop to launch it forward.';
      fixedObstacles = [
        { id: 'shelf_start', type: 'shelf', x: 140, y: 170, width: 120, height: 18, angle: 22, color: '#A16207' },
        { id: 'divider', type: 'wall', x: 360, y: 680, width: 24, height: 260, color: '#475569' },
      ];
      availableGadgets = { wood_ramp: 1, spring_launcher: 1 };
      intendedSolution = [
        { type: 'wood_ramp', x: 200, y: 320, angle: 35 },
        { type: 'spring_launcher', x: 220, y: 860, angle: 335 },
      ];
      break;

    case 14:
      title = `${world.name}: High Ridge Split`;
      objective = `Drop from the center ridge and carry the momentum rightward!`;
      hintTip = 'Place ramps to catch the drop from the ridge.';
      startX = 340;
      startY = 120;
      fixedObstacles = [
        { id: 'shelf_start', type: 'shelf', x: 320, y: 170, width: 120, height: 18, angle: 20, color: '#A16207' },
        { id: 'sub_shelf', type: 'shelf', x: 240, y: 520, width: 180, height: 18, angle: 10, color: '#A16207' },
      ];
      availableGadgets = { wood_ramp: 2 };
      intendedSolution = [
        { type: 'wood_ramp', x: 400, y: 320, angle: 25 },
        { type: 'wood_ramp', x: 500, y: 680, angle: 25 },
      ];
      break;

    case 15:
      title = `${world.name}: Underhang Tunnel`;
      objective = `Pass cleanly under the low ceiling overhang into the goal!`;
      hintTip = 'Create a low angle ramp glide beneath the shelf.';
      fixedObstacles = [
        { id: 'shelf_start', type: 'shelf', x: 140, y: 170, width: 120, height: 18, angle: 22, color: '#A16207' },
        { id: 'overhang', type: 'shelf', x: 360, y: 340, width: 260, height: 20, color: '#475569' },
      ];
      availableGadgets = { wood_ramp: 2 };
      intendedSolution = [
        { type: 'wood_ramp', x: 260, y: 320, angle: 30 },
        { type: 'wood_ramp', x: 480, y: 680, angle: 25 },
      ];
      break;

    case 16:
      title = `${world.name}: Deep Valley Leap`;
      objective = `Leap over the deep pit divider into the ${itemMeta.targetLabel}!`;
      hintTip = 'Bounce high off the floor pad.';
      fixedObstacles = [
        { id: 'shelf_start', type: 'shelf', x: 140, y: 170, width: 120, height: 18, angle: 22, color: '#A16207' },
        { id: 'pit_wall', type: 'wall', x: 380, y: 660, width: 30, height: 280, color: '#334155' },
      ];
      availableGadgets = { wood_ramp: 1, bouncy_pad: 1 };
      intendedSolution = [
        { type: 'wood_ramp', x: 220, y: 320, angle: 35 },
        { type: 'bouncy_pad', x: 250, y: 860, angle: 20 },
      ];
      break;

    case 17:
      title = `${world.name}: Triple Step Down`;
      objective = `Link 3 ramps down through the alternating shelves!`;
      hintTip = 'Connect the ramps so the item never drops straight down.';
      fixedObstacles = [
        { id: 'shelf_start', type: 'shelf', x: 140, y: 170, width: 120, height: 18, angle: 22, color: '#A16207' },
        { id: 'step_a', type: 'shelf', x: 300, y: 400, width: 140, height: 18, angle: 15, color: '#A16207' },
        { id: 'step_b', type: 'shelf', x: 480, y: 620, width: 140, height: 18, angle: 15, color: '#A16207' },
      ];
      availableGadgets = { wood_ramp: 3 };
      intendedSolution = [
        { type: 'wood_ramp', x: 220, y: 280, angle: 25 },
        { type: 'wood_ramp', x: 380, y: 520, angle: 25 },
        { type: 'wood_ramp', x: 520, y: 740, angle: 25 },
      ];
      break;

    case 18:
      title = `${world.name}: Dual Jet Propulsion`;
      objective = `Catch the falling object in horizontal crosswinds!`;
      hintTip = 'Position the fan to give maximum lateral push.';
      fixedObstacles = [
        { id: 'shelf_start', type: 'shelf', x: 140, y: 170, width: 120, height: 18, angle: 22, color: '#A16207' },
        { id: 'divider', type: 'wall', x: 340, y: 700, width: 24, height: 260, color: '#475569' },
      ];
      availableGadgets = { wood_ramp: 2, wind_fan: 1 };
      intendedSolution = [
        { type: 'wood_ramp', x: 220, y: 320, angle: 30 },
        { type: 'wind_fan', x: 160, y: 540, angle: 0 },
        { type: 'wood_ramp', x: 460, y: 680, angle: 25 },
      ];
      break;

    case 19:
      title = `${world.name}: Slot Drop`;
      objective = `Leap between the narrow pillars into the target!`;
      hintTip = 'Angle the launch pad to arc through the gap.';
      fixedObstacles = [
        { id: 'shelf_start', type: 'shelf', x: 140, y: 170, width: 120, height: 18, angle: 22, color: '#A16207' },
        { id: 'col1', type: 'wall', x: 310, y: 620, width: 24, height: 200, color: '#475569' },
        { id: 'col2', type: 'wall', x: 450, y: 620, width: 24, height: 200, color: '#475569' },
      ];
      availableGadgets = { wood_ramp: 1, bouncy_pad: 1 };
      intendedSolution = [
        { type: 'wood_ramp', x: 220, y: 320, angle: 35 },
        { type: 'bouncy_pad', x: 250, y: 860, angle: 20 },
      ];
      break;

    case 20:
    default:
      title = `${world.name}: Climax Mega-Machine`;
      objective = `Master the ultimate contraption challenge of ${world.name}!`;
      hintTip = 'Combine a ramp start with a high bouncy leap over the barrier.';
      fixedObstacles = [
        { id: 'shelf_start', type: 'shelf', x: 140, y: 170, width: 120, height: 18, angle: 22, color: '#A16207' },
        { id: 'barrier', type: 'wall', x: 360, y: 600, width: 24, height: 300, color: '#334155' },
      ];
      availableGadgets = { wood_ramp: 2, bouncy_pad: 1, wind_fan: 1 };
      intendedSolution = [
        { type: 'wood_ramp', x: 220, y: 320, angle: 35 },
        { type: 'bouncy_pad', x: 250, y: 860, angle: 20 },
      ];
      break;
  }

  const dynamicObjects: DynamicObject[] = [
    {
      id: `item_${id}`,
      type: itemMeta.item,
      x: startX,
      y: startY,
      radius: 26,
      density: 0.002,
      restitution: 0.65,
      friction: 0.05,
      label: itemMeta.label,
      isPrimaryGoal: true,
    },
  ];

  return {
    id,
    worldId,
    title,
    objective,
    worldTheme: world.name,
    parSeconds: 8 + (id % 5),
    maxGadgetsFor3Stars: Object.values(availableGadgets).reduce((a, b) => a + (b || 0), 0),
    fixedObstacles,
    dynamicObjects,
    availableGadgets,
    targetZone,
    intendedSolution,
    hintTip,
  };
}

export const ALL_LEVELS: Record<number, LevelDefinition> = {};
for (let i = 1; i <= 200; i++) {
  ALL_LEVELS[i] = createLevel(i);
}

export function getLevel(id: number): LevelDefinition {
  return ALL_LEVELS[id] || ALL_LEVELS[1];
}

export function getWorldLevels(worldId: number): LevelDefinition[] {
  const levels: LevelDefinition[] = [];
  const start = (worldId - 1) * 20 + 1;
  const end = worldId * 20;
  for (let i = start; i <= end; i++) {
    levels.push(getLevel(i));
  }
  return levels;
}
