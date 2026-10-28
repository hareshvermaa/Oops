import { generateLevelSync } from '../src/game/generator';
import { simulate } from '../src/game/headless';
import { GadgetType } from '../src/types/game';

const ALL: GadgetType[] = ['wood_ramp', 'bouncy_pad', 'wind_fan', 'spring_launcher', 'seesaw', 'domino_block'];
const tiers = [0.05, 0.15, 0.3, 0.5, 0.7, 0.9];
for (const d of tiers) {
  let ok = 0, tot = 0, ms = 0, gad = 0; const hist: Record<string, number> = {};
  for (let i = 0; i < 12; i++) {
    const t0 = performance.now();
    const lvl = generateLevelSync({ levelNumber: 20 + i, difficulty: d, seed: 1000 + i * 77, worldId: 1 + (i % 10), hue: i * 31, allowed: ALL });
    ms += performance.now() - t0;
    tot++;
    if (lvl) {
      ok++; gad += lvl.intendedSolution.length; for (const g of lvl.intendedSolution) hist[g.type] = (hist[g.type]||0)+1;
      const re = simulate(lvl, lvl.intendedSolution.map((g, k) => ({ ...g, id: 'v' + k })));
      if (!re.won) console.log('  !! stored solution failed re-verify', lvl.title);
    }
  }
  console.log(`d=${d}: success ${ok}/${tot}, avg ${(ms / tot).toFixed(0)}ms/level, avg solution gadgets ${(gad / Math.max(1, ok)).toFixed(1)} ${JSON.stringify(hist)}`);
}
