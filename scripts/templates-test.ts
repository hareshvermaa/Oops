import { buildTemplateLevel } from '../src/game/levels';
import { simulate } from '../src/game/headless';
const good: number[] = [];
for (let t = 1; t <= 20; t++) {
  const lvl = buildTemplateLevel(t, t, 1 + (t % 10));
  let wins = 0;
  for (let k = 0; k < 3; k++) if (simulate(lvl, lvl.intendedSolution.map((g, i) => ({ ...g, id: 's' + i }))).won) wins++;
  const bare = simulate(lvl, []).won;
  console.log(`template ${t}: intended solution wins ${wins}/3, wins with no gadgets: ${bare}, gadgets ${JSON.stringify(lvl.availableGadgets)}`);
  if (wins === 3 && !bare) good.push(t);
}
console.log('GOOD templates:', good.join(','));
