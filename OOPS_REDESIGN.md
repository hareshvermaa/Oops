# OOPS! — Endless Adaptive Redesign

## What was wrong (verified in the original code)
- 200 levels = 20 hand-made templates x 10 skins (`createLevel` switched on `levelInWorld`).
- Templates 3, 8 and 17 were won by the hero with NO gadgets placed (tested with the real engine).
- `seesaw` / `domino_block` and 4 obstacle types were never used by any level.
- `FAILED` state existed but nothing ever set it: a stuck/fallen hero just sat there.
- The old validator re-implemented physics separately, so it did not test the real game.

## What changed
| Area | Change |
|---|---|
| Levels | Endless. Levels 1-10 hand-made tutorial (re-skinned), then procedurally generated forever (`src/game/generator.ts`). |
| Solvability | Every generated level is solved by search with the REAL physics engine (headless), rejected if trivial or if the solution needs pixel-perfect placement. |
| Difficulty | `src/game/director.ts`: skill model, frustration score, sawtooth pacing, easy/normal/hard variants pre-generated in the background (`levelFactory.ts`) and chosen from how the last level went. |
| Surprises | Twist levels (moon gravity, super-bouncy), lucky levels (x3 coins), breathers, new-gadget intro levels, mystery eggs (pity timer), daily gift with forgiving streak. |
| Visuals | Every level uses a different world AND a clearly different hue than the previous level. Cute pastel UI. |
| Failure | Real fail detection (stuck/timeout) + friendly OOPS banner; 3 fails = free ghost hint; 5 fails = "Easier" swap. |
| Ads | `src/utils/ads.ts`: rewarded-only design (hint, double coins). Stub only — AdMob NOT integrated yet. Interstitials off by default, rules built in. |
| Cleanup | Removed unused deps (genai/express/dotenv), dev unlock now DEV-only. |

## Tests (run `npm test`)
- `scripts/templates-test.ts` — all 20 templates against the real engine.
- `scripts/gen-test.ts` / `gen-test2.ts` — generator success rate, speed, intro/twist levels.
- `scripts/campaign-test.ts` — virtual players of 3 skill levels through the whole director loop.

## Tuning knobs (all heuristic — tune with real player data)
- `director.ts`: `baseDifficulty()`, skill steps in `recordWin()`, `chooseTier()`, `INTRO_SCHEDULE`.
- `generator.ts`: `minGadgetsFor()`, scenery counts, forgiveness jitter.

## NOT done yet
- Android packaging (Capacitor), real AdMob, touch testing on a real phone, audio review.
- Family-policy decision (child-directed or not) before enabling any ads.
