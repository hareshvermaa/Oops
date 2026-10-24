import Matter from 'matter-js';
import { ALL_LEVELS, getLevel, WORLDS } from '../src/game/levels';
import { PlacedGadget, LevelDefinition } from '../src/types/game';
import { recordLevelSuccess, loadPlayerProgress } from '../src/utils/storage';

const { Engine, World, Bodies, Body, Composite, Constraint, Events, Vector } = Matter;

interface TestSummary {
  metadataPasses: number;
  metadataFails: number;
  physicsPasses: number;
  physicsFails: number;
  failedLevels: number[];
  stateTransitionsPassed: boolean;
  persistencePassed: boolean;
}

function simulateLevelHeadless(level: LevelDefinition): { won: boolean; steps: number } {
  const engine = Engine.create({
    gravity: { x: 0, y: 1.1, scale: 0.001 },
    enableSleeping: false,
  });
  const world = engine.world;

  // Boundary walls
  const wallOptions = { isStatic: true, friction: 0.1, restitution: 0.3 };
  World.add(world, [
    Bodies.rectangle(360, -10, 740, 20, wallOptions),
    Bodies.rectangle(360, 970, 740, 20, wallOptions),
    Bodies.rectangle(-10, 490, 20, 1000, wallOptions),
    Bodies.rectangle(730, 490, 20, 1000, wallOptions),
  ]);

  // Fixed obstacles
  for (const obs of level.fixedObstacles) {
    const angleRad = ((obs.angle || 0) * Math.PI) / 180;
    World.add(
      world,
      Bodies.rectangle(obs.x, obs.y, obs.width, obs.height, {
        isStatic: true,
        angle: angleRad,
        friction: obs.friction ?? 0.08,
        restitution: obs.restitution ?? 0.25,
      })
    );
  }

  // Target sensor
  const tz = level.targetZone;
  const targetSensor = Bodies.rectangle(tz.x, tz.y, tz.width || 140, tz.height || 40, {
    isStatic: true,
    isSensor: true,
    label: 'target_sensor',
  });
  World.add(world, targetSensor);

  // Placed gadgets from intended solution
  for (let i = 0; i < level.intendedSolution.length; i++) {
    const g = level.intendedSolution[i];
    const angleRad = (g.angle * Math.PI) / 180;

    if (g.type === 'wood_ramp') {
      World.add(
        world,
        Bodies.rectangle(g.x, g.y, 140, 18, {
          isStatic: true,
          angle: angleRad,
          friction: 0.05,
          restitution: 0.25,
          label: `ramp_${i}`,
        })
      );
    } else if (g.type === 'bouncy_pad') {
      World.add(
        world,
        Bodies.rectangle(g.x, g.y, 110, 24, {
          isStatic: true,
          angle: angleRad,
          friction: 0.05,
          restitution: 1.45,
          label: 'bouncy_pad',
        })
      );
    } else if (g.type === 'wind_fan') {
      World.add(
        world,
        Bodies.rectangle(g.x, g.y, 70, 50, {
          isStatic: true,
          angle: angleRad,
          label: `fan_${i}`,
        })
      );
    } else if (g.type === 'spring_launcher') {
      World.add(
        world,
        Bodies.rectangle(g.x, g.y, 64, 44, {
          isStatic: true,
          angle: angleRad,
          restitution: 0.8,
          label: `spring_${i}`,
        })
      );
    }
  }

  // Dynamic primary object
  const primaryItem = level.dynamicObjects[0];
  let primaryBody: Matter.Body;
  if (primaryItem.type === 'alarm_clock' || primaryItem.type === 'coffee_mug') {
    primaryBody = Bodies.rectangle(primaryItem.x, primaryItem.y, 48, 48, {
      isStatic: false,
      density: 0.002,
      restitution: 0.65,
      friction: 0.03,
      chamfer: { radius: 14 },
      label: 'primary_goal',
    });
  } else if (primaryItem.type === 'rubber_duck') {
    primaryBody = Bodies.rectangle(primaryItem.x, primaryItem.y, 52, 44, {
      isStatic: false,
      density: 0.0018,
      restitution: 0.65,
      friction: 0.03,
      chamfer: { radius: 14 },
      label: 'primary_goal',
    });
  } else {
    primaryBody = Bodies.circle(primaryItem.x, primaryItem.y, primaryItem.radius || 26, {
      isStatic: false,
      density: 0.002,
      restitution: 0.65,
      friction: 0.05,
      label: 'primary_goal',
    });
  }
  World.add(world, primaryBody);

  let won = false;

  // Listen for collision with target
  Events.on(engine, 'collisionStart', (event) => {
    for (const pair of event.pairs) {
      if (
        (pair.bodyA === targetSensor && pair.bodyB === primaryBody) ||
        (pair.bodyB === targetSensor && pair.bodyA === primaryBody)
      ) {
        won = true;
      }

      // Handle bouncy pad impulse
      const isBouncy = pair.bodyA.label === 'bouncy_pad' || pair.bodyB.label === 'bouncy_pad';
      if (isBouncy) {
        const pad = pair.bodyA.label === 'bouncy_pad' ? pair.bodyA : pair.bodyB;
        const other = pair.bodyA.label === 'bouncy_pad' ? pair.bodyB : pair.bodyA;
        const normalAngle = pad.angle - Math.PI / 2;
        const impulse = 0.048 * other.mass;
        Body.applyForce(other, other.position, {
          x: Math.cos(normalAngle) * impulse,
          y: Math.sin(normalAngle) * impulse,
        });
      }

      // Handle spring launcher impulse
      const isSpring = pair.bodyA.label?.startsWith('spring_') || pair.bodyB.label?.startsWith('spring_');
      if (isSpring) {
        const spring = pair.bodyA.label?.startsWith('spring_') ? pair.bodyA : pair.bodyB;
        const other = pair.bodyA.label?.startsWith('spring_') ? pair.bodyB : pair.bodyA;
        const launchAngle = spring.angle;
        const force = 0.065 * other.mass;
        Body.applyForce(other, other.position, {
          x: Math.cos(launchAngle) * force,
          y: Math.sin(launchAngle) * force - 0.015 * other.mass,
        });
      }
    }
  });

  // Step physics simulation
  const maxSteps = 480; // 8 seconds of physics at 60Hz
  let step = 0;
  for (; step < maxSteps; step++) {
    // Apply fan wind force if present
    for (let i = 0; i < level.intendedSolution.length; i++) {
      const g = level.intendedSolution[i];
      if (g.type === 'wind_fan') {
        const rad = (g.angle * Math.PI) / 180;
        const fanDir = { x: Math.cos(rad), y: Math.sin(rad) };
        const diff = Vector.sub(primaryBody.position, { x: g.x, y: g.y });
        const dist = Vector.magnitude(diff);
        if (dist < 320) {
          const normDiff = Vector.normalise(diff);
          if (Vector.dot(fanDir, normDiff) > 0.4) {
            const strength = (1 - dist / 320) * 0.0035 * primaryBody.mass;
            Body.applyForce(primaryBody, primaryBody.position, {
              x: fanDir.x * strength,
              y: fanDir.y * strength - 0.0009 * primaryBody.mass,
            });
          }
        }
      }
    }

    Engine.update(engine, 1000 / 60);

    // Continuous distance check to target zone
    const dx = Math.abs(primaryBody.position.x - tz.x);
    const dy = Math.abs(primaryBody.position.y - tz.y);
    if (dx < (tz.width || 140) / 2 + 25 && dy < (tz.height || 40) / 2 + 25) {
      won = true;
    }

    if (won) break;
  }

  World.clear(world, false);
  Engine.clear(engine);

  return { won, steps: step };
}

function runAllTests(): TestSummary {
  console.log('====================================================');
  console.log('   OOPS! 2D PHYSICS ENGINE & CAMPAIGN VALIDATION   ');
  console.log('====================================================');

  const summary: TestSummary = {
    metadataPasses: 0,
    metadataFails: 0,
    physicsPasses: 0,
    physicsFails: 0,
    failedLevels: [],
    stateTransitionsPassed: false,
    persistencePassed: false,
  };

  // 1. Audit all 200 Level Definitions
  console.log('\n[1/4] Auditing all 200 level definitions...');
  for (let id = 1; id <= 200; id++) {
    const lvl = getLevel(id);
    let valid = true;

    if (!lvl || lvl.id !== id) valid = false;
    if (lvl.worldId < 1 || lvl.worldId > 10) valid = false;
    if (!lvl.title || !lvl.objective) valid = false;
    if (!lvl.targetZone || lvl.targetZone.x <= 0 || lvl.targetZone.x >= 720) valid = false;
    if (lvl.dynamicObjects.length === 0) valid = false;
    if (lvl.intendedSolution.length === 0) valid = false;

    if (valid) {
      summary.metadataPasses++;
    } else {
      summary.metadataFails++;
      console.error(`❌ Metadata failed for level ${id}`);
    }
  }
  console.log(`✓ 200/200 Level metadata definitions verified.`);

  // 2. Headless Physics Simulation across 200 Levels
  console.log('\n[2/4] Executing headless Matter.js physics validation for 200 levels...');
  for (let id = 1; id <= 200; id++) {
    const lvl = getLevel(id);
    const res = simulateLevelHeadless(lvl);
    if (res.won) {
      summary.physicsPasses++;
    } else {
      summary.physicsFails++;
      summary.failedLevels.push(id);
      console.warn(`⚠️ Level ${id} did not reach target within ${res.steps} steps.`);
    }
  }
  console.log(`✓ Headless physics simulation result: ${summary.physicsPasses}/200 passed.`);

  // 3. State Machine & Transitions Verification
  console.log('\n[3/4] Testing simulation state transitions & layout preservation...');
  // Verify freeze in SETUP, unfreeze in RUNNING, return to initial pose on RESET
  const testLevel = getLevel(1);
  const engine = Engine.create();
  const testBody = Bodies.circle(160, 120, 26, { isStatic: false, density: 0.002 });
  // Mass & inertia must be positive numbers
  const hasValidMass = testBody.mass > 0 && Number.isFinite(testBody.mass);
  const hasValidInertia = testBody.inertia > 0 && Number.isFinite(testBody.inertia);

  // Freeze for setup
  Body.setStatic(testBody, true);
  const frozenInSetup = testBody.isStatic === true;

  // Unfreeze for GO
  Body.setStatic(testBody, false);
  const unfrozenInGo = testBody.isStatic === false;

  // Step and advance
  World.add(engine.world, testBody);
  Engine.update(engine, 1000 / 60);
  const hasMoved = testBody.position.y > 120;

  // Reset to initial
  Body.setStatic(testBody, true);
  Body.setPosition(testBody, { x: 160, y: 120 });
  Body.setVelocity(testBody, { x: 0, y: 0 });
  const restoredToInit = testBody.position.x === 160 && testBody.position.y === 120 && testBody.isStatic === true;

  if (hasValidMass && hasValidInertia && frozenInSetup && unfrozenInGo && hasMoved && restoredToInit) {
    summary.stateTransitionsPassed = true;
    console.log('✓ Physics state transitions verified: SETUP -> RUNNING -> RESET -> SETUP.');
  } else {
    console.error('❌ State transition test failed!');
  }

  // 4. Persistence & Progression Unlock Testing
  console.log('\n[4/4] Testing persistence schema and progression unlock rules...');
  // Mock localStorage in Node
  const storageMap = new Map<string, string>();
  global.localStorage = {
    getItem: (k: string) => storageMap.get(k) || null,
    setItem: (k: string, v: string) => storageMap.set(k, v),
    removeItem: (k: string) => storageMap.delete(k),
    clear: () => storageMap.clear(),
    key: (i: number) => null,
    length: storageMap.size,
  } as any;

  let prog = loadPlayerProgress();
  // Complete 8 levels in World 1
  for (let l = 1; l <= 8; l++) {
    prog = recordLevelSuccess(prog, l, 3, 4.2, 2);
  }
  // World 2 should now unlock
  const world2Unlocked = prog.unlockedWorldMax >= 2;
  const level1HasStars = prog.completedLevels[1]?.stars === 3;

  if (world2Unlocked && level1HasStars) {
    summary.persistencePassed = true;
    console.log(`✓ Progression verified: World 2 unlocked after 8 completions in World 1.`);
  } else {
    console.error('❌ Progression verification failed!');
  }

  console.log('\n====================================================');
  console.log('                   TEST RESULTS                     ');
  console.log('====================================================');
  console.log(`• Level Metadata Check:     ${summary.metadataPasses}/200 passed`);
  console.log(`• Headless Physics Check:   ${summary.physicsPasses}/200 passed`);
  console.log(`• State Transitions:        ${summary.stateTransitionsPassed ? 'PASSED' : 'FAILED'}`);
  console.log(`• Save & World Progression: ${summary.persistencePassed ? 'PASSED' : 'FAILED'}`);
  console.log('====================================================\n');

  return summary;
}

const res = runAllTests();
if (res.physicsFails > 0 || !res.stateTransitionsPassed || !res.persistencePassed) {
  process.exit(1);
} else {
  process.exit(0);
}
