import { generateLevelSync } from '../src/game/generator';
import { GadgetType } from '../src/types/game';
const ALL: GadgetType[] = ['wood_ramp', 'bouncy_pad', 'wind_fan', 'spring_launcher', 'seesaw', 'domino_block'];
for (const intro of ['seesaw', 'domino_block', 'spring_launcher', 'wind_fan'] as GadgetType[]) {
  let ok = 0, ms = 0;
  for (let i = 0; i < 10; i++) {
    const t0 = performance.now();
    const l = generateLevelSync({ levelNumber: 30 + i, difficulty: 0.2, seed: 500 + i * 13, worldId: 1 + i % 10, hue: 40, allowed: ALL, introGadget: intro, tier: 'intro' });
    ms += performance.now() - t0;
    if (l && l.intendedSolution.some(g => g.type === intro)) ok++;
  }
  console.log(`intro ${intro}: ${ok}/10 ok, ${(ms/10).toFixed(0)}ms avg`);
}
for (const twist of ['moon', 'bouncy'] as const) {
  let ok = 0;
  for (let i = 0; i < 10; i++) {
    const l = generateLevelSync({ levelNumber: 40 + i, difficulty: 0.4, seed: 900 + i * 7, worldId: 1 + i % 10, hue: 100, allowed: ALL, twist });
    if (l) ok++;
  }
  console.log(`twist ${twist}: ${ok}/10`);
}
