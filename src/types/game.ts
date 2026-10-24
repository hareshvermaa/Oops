export type GadgetType =
  | 'wood_ramp'
  | 'bouncy_pad'
  | 'wind_fan'
  | 'domino_block'
  | 'seesaw'
  | 'spring_launcher';

export interface PlacedGadget {
  id: string;
  type: GadgetType;
  x: number;
  y: number;
  angle: number; // 0 to 359 degrees continuous
  flipped?: boolean;
}

export type ObstacleType =
  | 'wall'
  | 'shelf'
  | 'pipe'
  | 'slope'
  | 'trampoline_fixed'
  | 'switch_trigger'
  | 'trapdoor';

export interface FixedObstacle {
  id: string;
  type: ObstacleType;
  x: number;
  y: number;
  width: number;
  height: number;
  angle?: number;
  restitution?: number;
  friction?: number;
  label?: string;
  color?: string;
}

export type DynamicItemType =
  | 'ball_egg'
  | 'alarm_clock'
  | 'rubber_duck'
  | 'coffee_mug'
  | 'bowling_pin'
  | 'soda_bottle'
  | 'boulder'
  | 'gumball';

export interface DynamicObject {
  id: string;
  type: DynamicItemType;
  x: number;
  y: number;
  radius?: number;
  width?: number;
  height?: number;
  density?: number;
  restitution?: number;
  friction?: number;
  label: string;
  isPrimaryGoal: boolean;
}

export interface TargetZone {
  x: number;
  y: number;
  radius?: number;
  width?: number;
  height?: number;
  label: string;
  type: 'cup' | 'basket' | 'bell' | 'target_pad' | 'finish_gate';
}

export interface IntendedGadgetPlacement {
  type: GadgetType;
  x: number;
  y: number;
  angle: number;
}

export interface LevelDefinition {
  id: number; // 1 to 200
  worldId: number; // 1 to 10
  title: string;
  objective: string;
  worldTheme: string;
  parSeconds: number;
  maxGadgetsFor3Stars: number;
  fixedObstacles: FixedObstacle[];
  dynamicObjects: DynamicObject[];
  availableGadgets: { [key in GadgetType]?: number };
  targetZone: TargetZone;
  intendedSolution: IntendedGadgetPlacement[];
  hintTip: string;
}

export interface WorldInfo {
  id: number;
  name: string;
  subtitle: string;
  themeColor: string;
  bgGradient: string;
  icon: string;
  startLevel: number;
  endLevel: number;
}

export interface LevelProgress {
  stars: number; // 0, 1, 2, or 3
  completed: boolean;
  bestTimeSeconds: number;
  gadgetsUsed: number;
}

export interface PlayerProgress {
  completedLevels: Record<number, LevelProgress>;
  unlockedWorldMax: number;
  hintsRemaining: number;
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticsEnabled: boolean;
  lastPlayedLevel: number;
}

export type ScreenState =
  | 'TITLE'
  | 'WORLD_SELECT'
  | 'LEVEL_SELECT'
  | 'PLAYING'
  | 'SETTINGS'
  | 'HOW_TO_PLAY'
  | 'VALIDATOR'
  | 'EXPORT_GUIDE';

export type SimulationMode = 'SETUP' | 'RUNNING' | 'COMPLETED' | 'FAILED';
