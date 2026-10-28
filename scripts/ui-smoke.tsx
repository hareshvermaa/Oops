import React from 'react';
import { renderToString } from 'react-dom/server';
import { TitleScreen } from '../src/components/TitleScreen';
import { HUD } from '../src/components/HUD';
import { LevelCompleteModal } from '../src/components/LevelCompleteModal';
import { OopsBanner } from '../src/components/OopsBanner';
import { PalsModal } from '../src/components/PalsModal';
import { ProgressionHub } from '../src/components/ProgressionHub';
import { HintModal } from '../src/components/HintModal';
import { GadgetTray } from '../src/components/GadgetTray';
import { defaultEndless } from '../src/game/director';
import { generateLevelSync } from '../src/game/generator';
import { PhysicsEngine } from '../src/game/PhysicsEngine';

const noop = () => {};
const e = defaultEndless();
const lvl = generateLevelSync({ levelNumber: 12, difficulty: 0.3, seed: 7, worldId: 4, hue: 120, allowed: ['wood_ramp', 'bouncy_pad', 'wind_fan', 'spring_launcher'] })!;
const out: string[] = [];
const chk = (name: string, el: React.ReactElement) => { const h = renderToString(el); out.push(`${name}: ${h.length} chars OK`); };
chk('Title', <TitleScreen endless={e} dailyReady onPlay={noop} onDaily={noop} onProgression={noop} onPals={noop} onHowToPlay={noop} onSettings={noop} onValidator={noop} onExportGuide={noop} />);
chk('HUD', <HUD level={lvl} simulationMode="SETUP" hintsRemaining={5} coins={10} streak={2} soundEnabled onBack={noop} onHint={noop} onToggleSound={noop} />);
chk('Complete', <LevelCompleteModal levelNumber={12} levelTitle={lvl.title} reward={{ stars: 3, coins: 25, streak: 4, bonusEgg: true, newPal: '🐱', duplicatePalCoins: 0, luckyMultiplier: 1, encouragement: 'Yay' }} doubled={false} nextReady onNextLevel={noop} onReplay={noop} onDoubleCoins={noop} />);
chk('Oops', <OopsBanner fails={5} nearMiss onRetry={noop} onHint={noop} onSwap={noop} />);
chk('Pals', <PalsModal pals={['🐱']} onClose={noop} />);
chk('Progression hub', <ProgressionHub endless={e} onClose={noop} onSpin={noop} onUpgradeBuilding={() => true} onMiniGameReward={noop} onShare={async () => {}} />);
chk('Hint', <HintModal level={lvl} hintsRemaining={0} coins={100} hintCoinCost={45} onClose={noop} onRevealGhost={noop} onAutoPlaceOne={noop} onWatchAdForHints={noop} onBuyHints={noop} />);
chk('Tray', <GadgetTray availableGadgets={lvl.availableGadgets as Record<string, number>} placedGadgets={[]} selectedGadgetId={null} simulationMode="SETUP" onAddGadget={noop} onUpdateAngle={noop} onDeleteSelected={noop} onClearAll={noop} onGo={noop} onReset={noop} />);

// Live-engine path used by the real game: loadLevel -> setGadgets -> resetSimulation -> startSimulation -> update
const fake = { width: 720, height: 980, getContext: () => ({}) } as unknown as HTMLCanvasElement;
const eng = new PhysicsEngine(fake, lvl);
eng.silent = true;
const sol = lvl.intendedSolution.map((g, i) => ({ ...g, id: 's' + i }));
eng.setGadgets(sol);
eng.resetSimulation();
let failed = false; eng.setFailCallback(() => { failed = true; });
eng.startSimulation();
for (let i = 0; i < 1500 && !eng.getRunStats().won && !failed; i++) eng.update(1 / 60);
out.push(`live engine path (reset->start->update) with stored solution: won=${eng.getRunStats().won}`);
// And the no-gadget path must trigger the fail callback (stuck detection) instead of hanging forever
const eng2 = new PhysicsEngine(fake, lvl); eng2.silent = true; eng2.setGadgets([]); eng2.resetSimulation();
let failed2: string | null = null; eng2.setFailCallback((r) => { failed2 = r; });
eng2.startSimulation();
for (let i = 0; i < 2000 && !failed2; i++) eng2.update(1 / 60);
out.push(`no-gadget run -> fail callback: ${failed2} after ${eng2.getRunStats().steps} steps`);
console.log(out.join('\n'));
