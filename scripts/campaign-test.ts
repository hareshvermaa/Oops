import { levelFactory } from '../src/game/levelFactory';
import { chooseTier, defaultEndless, LevelOutcome, recordFail, recordWin, TUTORIAL_COUNT } from '../src/game/director';
import { makeRng } from '../src/game/themes';

const pWin = (d: number, s: number) => Math.max(0.12, Math.min(0.97, 0.92 - 1.6 * Math.max(0, d - s * 0.6)));

async function run(name: string, s: number, levels: number) {
  let e = defaultEndless();
  e.seed = 12345;
  const rng = makeRng(99 + Math.floor(s * 100));
  let lvl = await levelFactory.get(e, 1, 'normal');
  const rows: any[] = [];
  let prevWorld = -1, prevHue = -999, sameWorld = 0;
  const setThemes = new Map<number, { world: number; hue: number }>();
  for (let i = 0; i < levels; i++) {
    const set = Math.floor((lvl.id - 1) / 10);
    const expectedWorld = (set % 10) + 1;
    const knownTheme = setThemes.get(set);
    if (lvl.worldId !== expectedWorld || (knownTheme && knownTheme.hue !== lvl.hueShift)) {
      throw new Error(`Theme changed inside set ${set + 1} or did not follow the expected sequence`);
    }
    if (lvl.id % 10 === 1 && prevHue >= 0 && Math.abs(((lvl.hueShift! - prevHue + 540) % 360) - 180) < 70) {
      throw new Error(`Adjacent ten-level sets have insufficient palette contrast at level ${lvl.id}`);
    }
    setThemes.set(set, { world: lvl.worldId, hue: lvl.hueShift ?? 0 });
    e = { ...e, lastWorld: lvl.worldId, lastHue: lvl.hueShift ?? 0 };
    if (lvl.worldId === prevWorld) sameWorld++;
    prevWorld = lvl.worldId; prevHue = lvl.hueShift ?? 0;
    const d = lvl.difficulty ?? 0.05;
    let attempts = 0;
    for (;;) {
      attempts++;
      if (rng() < pWin(d, s) || attempts >= 8) break;
      e = recordFail(e);
    }
    const o: LevelOutcome = { levelNumber: lvl.id, difficulty: d, attempts, hintsUsed: attempts >= 5 ? 1 : 0, thinkSeconds: 20 + attempts * 15, tier: lvl.tier ?? 'normal', rewardMultiplier: 1, introGadget: lvl.introGadget, worldId: lvl.worldId, hue: lvl.hueShift };
    const { next } = recordWin(e, o);
    rows.push({ n: lvl.id, d, attempts, tier: lvl.tier, twist: lvl.twist, gad: lvl.intendedSolution.length });
    const t = chooseTier(next, o);
    e = next;
    lvl = await levelFactory.get(e, e.level, t);
  }
  const first = rows.filter(r => r.attempts === 1).length;
  const hard = rows.filter(r => r.attempts >= 4).length;
  const avgAtt = rows.reduce((a, r) => a + r.attempts, 0) / rows.length;
  const at = (n: number) => rows[n - 1] ? rows[n - 1].d.toFixed(2) : '-';
  const kinds: Record<string, number> = {};
  rows.forEach(r => { const k = r.twist ? 'twist' : r.tier!; kinds[k] = (kinds[k] || 0) + 1; });
  console.log(`[${name}] levels=${rows.length} firstTry=${first} (${(100*first/rows.length).toFixed(0)}%) 4+attempts=${hard} avgAttempts=${avgAtt.toFixed(2)}`);
  console.log(`   difficulty@10=${at(10)} @20=${at(20)} @30=${at(30)} @40=${at(40)} @50=${at(50)}  kinds=${JSON.stringify(kinds)}`);
  console.log(`   consecutive same world (expected for 10-level sets): ${sameWorld}, sets verified: ${setThemes.size}, coins=${e.coins} pals=${e.pals.length} skill=${e.skill.toFixed(2)} bestStreak=${e.bestStreak}`);
  levelFactory.reset();
}
(async () => {
  if (TUTORIAL_COUNT !== 2) throw new Error(`Expected two guided tutorial levels, got ${TUTORIAL_COUNT}`);
  await run('weak', 0.3, 45);
  await run('average', 0.6, 45);
  await run('strong', 0.95, 45);
  const beyondCampaignCap = await levelFactory.get({ ...defaultEndless(), seed: 12345 }, 201, 'normal');
  if (beyondCampaignCap.id !== 201) throw new Error('Endless generation stopped at the former 200-level limit');
  console.log(`unbounded generation check: level ${beyondCampaignCap.id} generated successfully`);
})();
