import Matter from 'matter-js';
import {
  LevelDefinition,
  PlacedGadget,
  DynamicObject,
  TargetZone,
  FixedObstacle,
  GadgetType,
} from '../types/game';
import { sound } from '../utils/audio';

const { Engine, World, Bodies, Body, Composite, Constraint, Events, Vector } = Matter;

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export class PhysicsEngine {
  public engine: Matter.Engine;
  public world: Matter.World;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private level: LevelDefinition;
  private placedGadgets: PlacedGadget[] = [];
  private selectedGadgetId: string | null = null;
  private ghostHintGadget: PlacedGadget | null = null;
  private dynamicBodies: Map<
    string,
    { body: Matter.Body; def: DynamicObject; initialX: number; initialY: number }
  > = new Map();
  private gadgetBodies: Matter.Body[] = [];
  private staticObstacleBodies: Matter.Body[] = [];
  private targetSensor: Matter.Body | null = null;
  private particles: Particle[] = [];
  private confetti: Particle[] = [];
  private isRunning: boolean = false;
  private won: boolean = false;
  private hasTriggeredWin: boolean = false;
  private winCallback?: () => void;
  private collisionCallback?: () => void;
  private rafId: number | null = null;
  private lastTime: number = 0;
  public physicsUpdatesSinceGo: number = 0;

  // Eye animation, breathing, squash-and-stretch, and collision feedback
  private lastImpactTime: number = 0;
  private animationTime: number = 0;
  private impactSquashMap: Map<string, number> = new Map();

  constructor(
    canvas: HTMLCanvasElement,
    level: LevelDefinition,
    onWin?: () => void,
    onCollision?: () => void
  ) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Failed to get 2D canvas context');
    this.ctx = context;
    this.level = level;
    this.winCallback = onWin;
    this.collisionCallback = onCollision;

    this.engine = Engine.create({
      gravity: { x: 0, y: 1.1, scale: 0.001 },
      enableSleeping: false,
    });
    this.world = this.engine.world;

    this.setupCollisionHandlers();
    this.loadLevel(level);
  }

  public setWinCallback(cb: () => void) {
    this.winCallback = cb;
  }

  public setSelectedGadgetId(id: string | null) {
    this.selectedGadgetId = id;
  }

  public setGhostHintGadget(ghost: PlacedGadget | null) {
    this.ghostHintGadget = ghost;
  }

  public getDebugMetrics() {
    let primary = null;
    for (const entry of this.dynamicBodies.values()) {
      if (entry.def.isPrimaryGoal) {
        primary = {
          label: entry.def.label,
          type: entry.def.type,
          x: Number(entry.body.position.x.toFixed(1)),
          y: Number(entry.body.position.y.toFixed(1)),
          vx: Number(entry.body.velocity.x.toFixed(2)),
          vy: Number(entry.body.velocity.y.toFixed(2)),
          speed: Number(Vector.magnitude(entry.body.velocity).toFixed(2)),
          isStatic: entry.body.isStatic,
          isSleeping: entry.body.isSleeping,
        };
        break;
      }
    }

    return {
      isRunning: this.isRunning,
      won: this.won,
      physicsUpdatesSinceGo: this.physicsUpdatesSinceGo,
      primary,
    };
  }

  private setupCollisionHandlers() {
    Events.on(this.engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        const { bodyA, bodyB } = pair;

        // Check target goal sensor collision
        if (this.targetSensor && (bodyA === this.targetSensor || bodyB === this.targetSensor)) {
          const other = bodyA === this.targetSensor ? bodyB : bodyA;
          if (other.label?.startsWith('primary_goal') && !this.hasTriggeredWin) {
            this.handleWin();
          }
        }

        // Bouncy pad impulse
        const isBouncy = bodyA.label === 'bouncy_pad' || bodyB.label === 'bouncy_pad';
        if (isBouncy) {
          const pad = bodyA.label === 'bouncy_pad' ? bodyA : bodyB;
          const dynamicBody = bodyA.label === 'bouncy_pad' ? bodyB : bodyA;
          if (!dynamicBody.isStatic) {
            // Apply impulse along pad's upward normal
            const normalAngle = pad.angle - Math.PI / 2;
            const impulseStrength = 0.048 * dynamicBody.mass;
            Body.applyForce(dynamicBody, dynamicBody.position, {
              x: Math.cos(normalAngle) * impulseStrength + (Math.random() - 0.5) * 0.002,
              y: Math.sin(normalAngle) * impulseStrength,
            });
            sound.playBoing();
            this.spawnImpactParticles(dynamicBody.position.x, dynamicBody.position.y, '#EC4899', 10);
          }
        }

        // Spring launcher mechanical impulse
        const isSpring = bodyA.label?.startsWith('gadget_spring_') || bodyB.label?.startsWith('gadget_spring_');
        if (isSpring) {
          const spring = bodyA.label?.startsWith('gadget_spring_') ? bodyA : bodyB;
          const dynamicBody = bodyA.label?.startsWith('gadget_spring_') ? bodyB : bodyA;
          if (!dynamicBody.isStatic) {
            const launchAngle = spring.angle;
            const force = 0.065 * dynamicBody.mass;
            Body.applyForce(dynamicBody, dynamicBody.position, {
              x: Math.cos(launchAngle) * force,
              y: Math.sin(launchAngle) * force - 0.015 * dynamicBody.mass,
            });
            sound.playBoing();
            this.spawnImpactParticles(dynamicBody.position.x, dynamicBody.position.y, '#F59E0B', 12);
          }
        }

        // General collision audio, squash-and-stretch & particle effect
        const relVel = Vector.magnitude(Vector.sub(bodyA.velocity, bodyB.velocity));
        if (relVel > 1.4) {
          sound.playWoodClack();
          this.lastImpactTime = Date.now();
          const midX = (bodyA.position.x + bodyB.position.x) / 2;
          const midY = (bodyA.position.y + bodyB.position.y) / 2;
          this.spawnImpactParticles(midX, midY, '#CBD5E1', 6);
          const squashStrength = Math.min(0.4, relVel * 0.05);
          if (bodyA.id) this.impactSquashMap.set(String(bodyA.id), squashStrength);
          if (bodyB.id) this.impactSquashMap.set(String(bodyB.id), squashStrength);
          if (this.collisionCallback) this.collisionCallback();
        }
      }
    });
  }

  public loadLevel(level: LevelDefinition, gadgets: PlacedGadget[] = []) {
    this.level = level;
    this.placedGadgets = [...gadgets];
    this.won = false;
    this.hasTriggeredWin = false;
    this.isRunning = false;
    this.particles = [];
    this.confetti = [];

    // Clear world
    World.clear(this.world, false);
    Engine.clear(this.engine);
    this.dynamicBodies.clear();
    this.gadgetBodies = [];
    this.staticObstacleBodies = [];

    // Perimeter walls (playfield 720 x 980)
    const wallOptions = { isStatic: true, friction: 0.1, restitution: 0.3, label: 'perimeter_wall' };
    const walls = [
      Bodies.rectangle(360, -10, 740, 20, wallOptions), // ceiling
      Bodies.rectangle(360, 970, 740, 20, wallOptions), // floor
      Bodies.rectangle(-10, 490, 20, 1000, wallOptions), // left wall
      Bodies.rectangle(730, 490, 20, 1000, wallOptions), // right wall
    ];
    World.add(this.world, walls);

    // Fixed obstacles
    for (const obs of level.fixedObstacles) {
      const angleRad = ((obs.angle || 0) * Math.PI) / 180;
      const body = Bodies.rectangle(obs.x, obs.y, obs.width, obs.height, {
        isStatic: true,
        angle: angleRad,
        friction: obs.friction ?? 0.08,
        restitution: obs.restitution ?? 0.25,
        label: `obstacle_${obs.id}`,
      });
      this.staticObstacleBodies.push(body);
      World.add(this.world, body);
    }

    // Target zone sensor
    const tz = level.targetZone;
    this.targetSensor = Bodies.rectangle(tz.x, tz.y, tz.width || 140, tz.height || 40, {
      isStatic: true,
      isSensor: true,
      label: 'target_sensor',
    });
    World.add(this.world, this.targetSensor);

    // Build placed gadgets
    this.rebuildGadgetBodies();

    // Build dynamic objects (set to static during SETUP mode)
    for (const item of level.dynamicObjects) {
      let body: Matter.Body;
      const label = item.isPrimaryGoal ? `primary_goal_${item.id}` : `dynamic_${item.id}`;

      if (item.type === 'alarm_clock' || item.type === 'coffee_mug') {
        body = Bodies.rectangle(item.x, item.y, 48, 48, {
          isStatic: false,
          density: item.density ?? 0.002,
          restitution: item.restitution ?? 0.65,
          friction: 0.03,
          chamfer: { radius: 14 },
          label,
        });
      } else if (item.type === 'rubber_duck') {
        body = Bodies.rectangle(item.x, item.y, 52, 44, {
          isStatic: false,
          density: item.density ?? 0.0018,
          restitution: item.restitution ?? 0.65,
          friction: 0.03,
          chamfer: { radius: 14 },
          label,
        });
      } else if (item.type === 'bowling_pin') {
        body = Bodies.rectangle(item.x, item.y, 32, 58, {
          isStatic: false,
          density: item.density ?? 0.002,
          restitution: item.restitution ?? 0.55,
          friction: 0.03,
          chamfer: { radius: 14 },
          label,
        });
      } else {
        // ball_egg, boulder, gumball, soda_bottle (rolling can)
        const r = item.radius || 26;
        body = Bodies.circle(item.x, item.y, r, {
          isStatic: false,
          density: item.density ?? 0.002,
          restitution: item.restitution ?? 0.65,
          friction: item.friction ?? 0.05,
          label,
        });
      }

      // Explicitly freeze for SETUP mode after mass & inertia calculation
      Body.setStatic(body, true);

      this.dynamicBodies.set(item.id, {
        body,
        def: item,
        initialX: item.x,
        initialY: item.y,
      });
      World.add(this.world, body);
    }
  }

  public setGadgets(gadgets: PlacedGadget[]) {
    this.placedGadgets = [...gadgets];
    this.rebuildGadgetBodies();
  }

  private rebuildGadgetBodies() {
    for (const b of this.gadgetBodies) {
      Composite.remove(this.world, b);
    }
    this.gadgetBodies = [];

    for (const g of this.placedGadgets) {
      const angleRad = (g.angle * Math.PI) / 180;

      if (g.type === 'wood_ramp') {
        const body = Bodies.rectangle(g.x, g.y, 140, 18, {
          isStatic: true,
          angle: angleRad,
          friction: 0.05,
          restitution: 0.25,
          label: `gadget_ramp_${g.id}`,
        });
        this.gadgetBodies.push(body);
        World.add(this.world, body);
      } else if (g.type === 'bouncy_pad') {
        const body = Bodies.rectangle(g.x, g.y, 110, 24, {
          isStatic: true,
          angle: angleRad,
          friction: 0.05,
          restitution: 1.45,
          label: 'bouncy_pad',
        });
        this.gadgetBodies.push(body);
        World.add(this.world, body);
      } else if (g.type === 'wind_fan') {
        const body = Bodies.rectangle(g.x, g.y, 70, 50, {
          isStatic: true,
          angle: angleRad,
          friction: 0.2,
          label: `gadget_fan_${g.id}`,
        });
        this.gadgetBodies.push(body);
        World.add(this.world, body);
      } else if (g.type === 'domino_block') {
        const body = Bodies.rectangle(g.x, g.y, 16, 68, {
          isStatic: !this.isRunning,
          angle: angleRad,
          friction: 0.35,
          restitution: 0.1,
          density: 0.003,
          label: `gadget_domino_${g.id}`,
        });
        this.gadgetBodies.push(body);
        World.add(this.world, body);
      } else if (g.type === 'seesaw') {
        const plank = Bodies.rectangle(g.x, g.y, 180, 16, {
          isStatic: !this.isRunning,
          angle: angleRad,
          friction: 0.1,
          restitution: 0.3,
          label: `gadget_seesaw_${g.id}`,
        });
        const pivot = Constraint.create({
          pointA: { x: g.x, y: g.y },
          bodyB: plank,
          pointB: { x: 0, y: 0 },
          stiffness: 1,
          length: 0,
        });
        this.gadgetBodies.push(plank);
        World.add(this.world, [plank, pivot]);
      } else if (g.type === 'spring_launcher') {
        const body = Bodies.rectangle(g.x, g.y, 64, 44, {
          isStatic: true,
          angle: angleRad,
          friction: 0.1,
          restitution: 0.8,
          label: `gadget_spring_${g.id}`,
        });
        this.gadgetBodies.push(body);
        World.add(this.world, body);
      }
    }
  }

  public startSimulation() {
    this.isRunning = true;
    this.won = false;
    this.hasTriggeredWin = false;
    this.physicsUpdatesSinceGo = 0;

    // Wake up dynamic objects and clear velocities
    for (const entry of this.dynamicBodies.values()) {
      Body.setStatic(entry.body, false);
      Body.setVelocity(entry.body, { x: 0, y: 0 });
      Body.setAngularVelocity(entry.body, 0);
    }

    // Wake up dynamic gadgets (dominoes, seesaws)
    for (const b of this.gadgetBodies) {
      if (b.label.includes('domino') || b.label.includes('seesaw')) {
        Body.setStatic(b, false);
        Body.setVelocity(b, { x: 0, y: 0 });
        Body.setAngularVelocity(b, 0);
      }
    }
  }

  public resetSimulation() {
    this.isRunning = false;
    this.won = false;
    this.hasTriggeredWin = false;
    this.physicsUpdatesSinceGo = 0;
    this.particles = [];
    this.confetti = [];

    // Reset all dynamic objects to initial poses and freeze for setup
    for (const entry of this.dynamicBodies.values()) {
      Body.setStatic(entry.body, true);
      Body.setPosition(entry.body, { x: entry.initialX, y: entry.initialY });
      Body.setAngle(entry.body, 0);
      Body.setVelocity(entry.body, { x: 0, y: 0 });
      Body.setAngularVelocity(entry.body, 0);
    }

    // Rebuild gadgets in initial poses
    this.rebuildGadgetBodies();
  }

  private handleWin() {
    if (this.hasTriggeredWin) return;
    this.hasTriggeredWin = true;
    this.won = true;
    sound.playDing();
    sound.playFanfare();
    this.spawnConfetti();
    if (this.winCallback) {
      this.winCallback();
    }
  }

  private spawnImpactParticles(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        radius: 3 + Math.random() * 4,
        color,
        alpha: 1,
        life: 0,
        maxLife: 20 + Math.random() * 15,
      });
    }
  }

  private spawnConfetti() {
    const colors = ['#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
    for (let i = 0; i < 90; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
      const speed = 6 + Math.random() * 12;
      this.confetti.push({
        x: this.level.targetZone.x + (Math.random() - 0.5) * 40,
        y: this.level.targetZone.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 4 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        life: 0,
        maxLife: 80 + Math.random() * 40,
      });
    }
  }

  public startRenderLoop() {
    this.lastTime = performance.now();
    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - this.lastTime) / 1000, 0.05);
      this.lastTime = currentTime;

      this.update(dt);
      this.render();

      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  public stopRenderLoop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public update(dt: number) {
    this.animationTime += dt;

    // Decay squash factors smoothly
    for (const [id, val] of this.impactSquashMap.entries()) {
      const next = val * Math.exp(-dt * 14);
      if (next < 0.01) {
        this.impactSquashMap.delete(id);
      } else {
        this.impactSquashMap.set(id, next);
      }
    }

    if (this.isRunning && !this.won) {
      this.physicsUpdatesSinceGo++;

      // Wind fan forces
      for (const g of this.placedGadgets) {
        if (g.type === 'wind_fan') {
          const rad = (g.angle * Math.PI) / 180;
          const fanDir = { x: Math.cos(rad), y: Math.sin(rad) };
          for (const entry of this.dynamicBodies.values()) {
            const body = entry.body;
            const diff = Vector.sub(body.position, { x: g.x, y: g.y });
            const dist = Vector.magnitude(diff);
            if (dist < 320) {
              const normDiff = Vector.normalise(diff);
              if (Vector.dot(fanDir, normDiff) > 0.4) {
                const strength = (1 - dist / 320) * 0.0035 * body.mass;
                Body.applyForce(body, body.position, {
                  x: fanDir.x * strength,
                  y: fanDir.y * strength - 0.0009 * body.mass,
                });
              }
            }
          }
        }
      }

      // Step physics at 60Hz
      Engine.update(this.engine, 1000 / 60);

      // Continuous distance check for target zone reachability
      const tz = this.level.targetZone;
      for (const entry of this.dynamicBodies.values()) {
        if (entry.def.isPrimaryGoal && !this.hasTriggeredWin) {
          const dx = Math.abs(entry.body.position.x - tz.x);
          const dy = Math.abs(entry.body.position.y - tz.y);
          if (dx < (tz.width || 140) / 2 + 25 && dy < (tz.height || 40) / 2 + 25) {
            this.handleWin();
            break;
          }
        }
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      p.alpha = 1 - p.life / p.maxLife;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
      }
    }

    // Update confetti
    for (let i = this.confetti.length - 1; i >= 0; i--) {
      const c = this.confetti[i];
      c.x += c.vx;
      c.y += c.vy;
      c.vy += 0.25;
      c.life++;
      c.alpha = 1 - c.life / c.maxLife;
      if (c.life >= c.maxLife) {
        this.confetti.splice(i, 1);
      }
    }
  }

  // --- Cartoon Vector Renderer ---
  public render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    // 1. Cozy room backdrop
    this.drawRoomBackground(ctx, w, h);

    // 2. Ghost hint silhouette if active
    if (this.ghostHintGadget) {
      this.drawGhostGadget(ctx, this.ghostHintGadget);
    }

    // 3. Static obstacles
    for (const obs of this.level.fixedObstacles) {
      this.drawObstacle(ctx, obs);
    }

    // 4. Target goal zone (receptacle, cup, basket, pillow)
    this.drawTargetZone(ctx, this.level.targetZone);

    // 5. Placed gadgets
    for (const g of this.placedGadgets) {
      const isSelected = g.id === this.selectedGadgetId;
      this.drawGadget(ctx, g, isSelected);
    }

    // 6. Dynamic objects with expressive shapes and faces
    for (const entry of this.dynamicBodies.values()) {
      this.drawDynamicObject(ctx, entry.body, entry.def);
    }

    // 7. Particle bursts & confetti
    this.drawParticles(ctx);

    // 8. If in setup mode, draw goal indicator
    if (!this.isRunning && !this.won) {
      this.drawGoalIndicator(ctx);
    }
  }

  private drawRoomBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const worldId = this.level.worldId || 1;

    if (worldId === 1) {
      // --- World 1: Kitchen Catastrophe ---
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#FFFBEB');
      grad.addColorStop(0.7, '#FEF3C7');
      grad.addColorStop(1, '#FDE68A');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Checkered kitchen tile pattern
      ctx.fillStyle = 'rgba(245, 158, 11, 0.07)';
      for (let x = 0; x < w; x += 44) {
        for (let y = 0; y < h - 40; y += 44) {
          if ((Math.floor(x / 44) + Math.floor(y / 44)) % 2 === 0) {
            ctx.fillRect(x, y, 44, 44);
          }
        }
      }

      // Diagonal morning sunlight beam
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(240, 0);
      ctx.lineTo(w, 750);
      ctx.lineTo(w - 220, 750);
      ctx.closePath();
      ctx.fill();

      // Kitchen counter wood trim baseboard
      ctx.fillStyle = '#B45309';
      ctx.fillRect(0, h - 34, w, 34);
      ctx.fillStyle = '#D97706';
      ctx.fillRect(0, h - 34, w, 5);
      ctx.fillStyle = '#78350F';
      ctx.fillRect(0, h - 5, w, 5);
    } else if (worldId === 2) {
      // --- World 2: Messy Bedroom ---
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#EDE9FE');
      grad.addColorStop(0.7, '#DDD6FE');
      grad.addColorStop(1, '#C4B5FD');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Soft bedtime stars & crescent moon
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.arc(620, 110, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#DDD6FE';
      ctx.beginPath();
      ctx.arc(634, 104, 28, 0, Math.PI * 2);
      ctx.fill();

      // Twinkling stars pattern
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      const starOffsets = [[80, 100], [220, 70], [380, 120], [510, 80], [140, 240], [320, 290], [540, 260], [180, 480], [480, 490]];
      for (const [sx, sy] of starOffsets) {
        ctx.beginPath();
        ctx.arc(sx, sy, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Cozy plush bedroom carpet floor
      ctx.fillStyle = '#6D28D9';
      ctx.fillRect(0, h - 34, w, 34);
      ctx.fillStyle = '#8B5CF6';
      ctx.fillRect(0, h - 34, w, 6);
    } else if (worldId === 3) {
      // --- World 3: Toy Workshop ---
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#ECFDF5');
      grad.addColorStop(0.7, '#D1FAE5');
      grad.addColorStop(1, '#A7F3D0');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Blueprint drafting grid
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.12)';
      ctx.lineWidth = 1;
      for (let x = 32; x < w; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h - 34);
        ctx.stroke();
      }
      for (let y = 32; y < h - 34; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Wooden toy block motifs in background
      ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
      ctx.fillRect(50, 80, 36, 36);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.fillRect(92, 80, 36, 36);
      ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
      ctx.fillRect(71, 40, 36, 36);

      // Workbench wooden floor with brass screws
      ctx.fillStyle = '#065F46';
      ctx.fillRect(0, h - 34, w, 34);
      ctx.fillStyle = '#059669';
      ctx.fillRect(0, h - 34, w, 6);
    } else if (worldId === 4) {
      // --- World 4: Office Chaos ---
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#FEF3C7');
      grad.addColorStop(0.7, '#FDE68A');
      grad.addColorStop(1, '#FCD34D');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Corkboard texture stippling
      ctx.fillStyle = 'rgba(180, 83, 9, 0.08)';
      for (let x = 20; x < w; x += 28) {
        for (let y = 20; y < h - 40; y += 28) {
          ctx.beginPath();
          ctx.arc(x + ((y * 7) % 11), y + ((x * 5) % 11), 1.8, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Pinned pastel sticky notes in background
      ctx.fillStyle = 'rgba(254, 240, 138, 0.5)';
      ctx.fillRect(60, 90, 48, 48);
      ctx.fillStyle = 'rgba(244, 114, 182, 0.4)';
      ctx.fillRect(580, 140, 48, 48);
      ctx.fillStyle = 'rgba(103, 232, 249, 0.4)';
      ctx.fillRect(490, 80, 48, 48);

      // Oak desk baseboard with millimeter ruler ticks
      ctx.fillStyle = '#78350F';
      ctx.fillRect(0, h - 34, w, 34);
      ctx.fillStyle = '#92400E';
      ctx.fillRect(0, h - 34, w, 6);
      ctx.strokeStyle = '#FEF3C7';
      ctx.lineWidth = 1;
      for (let rx = 10; rx < w; rx += 20) {
        ctx.beginPath();
        ctx.moveTo(rx, h - 34);
        ctx.lineTo(rx, h - 26);
        ctx.stroke();
      }
    } else if (worldId === 5) {
      // --- World 5: Supermarket Sweep ---
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#FDF2F8');
      grad.addColorStop(0.7, '#FCE7F3');
      grad.addColorStop(1, '#FBCFE8');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Aisle pastel vertical stripes
      ctx.fillStyle = 'rgba(236, 72, 153, 0.06)';
      for (let x = 0; x < w; x += 60) {
        ctx.fillRect(x, 0, 30, h - 34);
      }

      // Distant grocery shelves
      ctx.fillStyle = 'rgba(244, 114, 182, 0.18)';
      ctx.fillRect(40, 120, 200, 10);
      ctx.fillRect(480, 180, 200, 10);

      // Supermarket tile floor
      ctx.fillStyle = '#9D174D';
      ctx.fillRect(0, h - 34, w, 34);
      ctx.fillStyle = '#BE185D';
      ctx.fillRect(0, h - 34, w, 6);
    } else if (worldId === 6) {
      // --- World 6: Lush Garden ---
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#ECFCCB');
      grad.addColorStop(0.6, '#D9F99D');
      grad.addColorStop(1, '#BEF264');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Distant rolling green hills
      ctx.fillStyle = 'rgba(132, 204, 22, 0.2)';
      ctx.beginPath();
      ctx.arc(180, 520, 280, Math.PI, 0);
      ctx.arc(520, 550, 260, Math.PI, 0);
      ctx.fill();

      // Floating yellow pollen/dandelion motes
      const gardenTime = this.animationTime * 2;
      ctx.fillStyle = '#FEF08A';
      for (let i = 0; i < 8; i++) {
        const mx = (100 + i * 85 + Math.sin(gardenTime + i) * 20) % w;
        const my = (140 + i * 75 + Math.cos(gardenTime + i * 2) * 15) % (h - 60);
        ctx.beginPath();
        ctx.arc(mx, my, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Lawn garden baseboard with grass tufts
      ctx.fillStyle = '#3F6212';
      ctx.fillRect(0, h - 34, w, 34);
      ctx.fillStyle = '#65A30D';
      ctx.fillRect(0, h - 34, w, 6);
    } else if (worldId === 7) {
      // --- World 7: Construction Zone ---
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#EFF6FF');
      grad.addColorStop(0.7, '#DBEAFE');
      grad.addColorStop(1, '#BFDBFE');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Blueprint grid & crane silhouettes
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.15)';
      ctx.lineWidth = 1;
      for (let x = 40; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h - 34);
        ctx.stroke();
      }
      for (let y = 40; y < h - 34; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Construction hazard warning stripes floor
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, h - 34, w, 34);
      ctx.fillStyle = '#F59E0B';
      for (let hx = -20; hx < w + 40; hx += 36) {
        ctx.beginPath();
        ctx.moveTo(hx, h);
        ctx.lineTo(hx + 18, h - 34);
        ctx.lineTo(hx + 30, h - 34);
        ctx.lineTo(hx + 12, h);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#D97706';
      ctx.fillRect(0, h - 34, w, 4);
    } else if (worldId === 8) {
      // --- World 8: Candy Factory ---
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#FDF4FF');
      grad.addColorStop(0.7, '#FAE8FF');
      grad.addColorStop(1, '#F5D0FE');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Peppermint swirls in background
      ctx.fillStyle = 'rgba(217, 70, 239, 0.1)';
      ctx.beginPath();
      ctx.arc(100, 140, 50, 0, Math.PI * 2);
      ctx.arc(620, 200, 60, 0, Math.PI * 2);
      ctx.fill();

      // Dripping frosting along top ceiling
      ctx.fillStyle = '#F0ABFC';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let fx = 0; fx <= w; fx += 60) {
        ctx.quadraticCurveTo(fx + 30, 28, fx + 60, 0);
      }
      ctx.lineTo(w, 0);
      ctx.closePath();
      ctx.fill();

      // Marshmallow tile baseboard
      ctx.fillStyle = '#86198F';
      ctx.fillRect(0, h - 34, w, 34);
      ctx.fillStyle = '#C026D3';
      ctx.fillRect(0, h - 34, w, 6);
    } else if (worldId === 9) {
      // --- World 9: Science Lab ---
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#ECFEFF');
      grad.addColorStop(0.7, '#CFFAFE');
      grad.addColorStop(1, '#A5F3FC');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Isometric graph lines
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.12)';
      ctx.lineWidth = 1;
      for (let x = 36; x < w; x += 36) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h - 34);
        ctx.stroke();
      }
      for (let y = 36; y < h - 34; y += 36) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Rising fizz bubbles
      const labTime = this.animationTime * 3;
      ctx.fillStyle = 'rgba(6, 182, 212, 0.28)';
      for (let b = 0; b < 10; b++) {
        const bx = 80 + b * 60;
        const by = (h - 80 - (labTime * 20 + b * 45) % (h - 120));
        ctx.beginPath();
        ctx.arc(bx, by, 4 + (b % 3), 0, Math.PI * 2);
        ctx.fill();
      }

      // Cleanroom metallic floor
      ctx.fillStyle = '#164E63';
      ctx.fillRect(0, h - 34, w, 34);
      ctx.fillStyle = '#0891B2';
      ctx.fillRect(0, h - 34, w, 6);
    } else {
      // --- World 10: Grand Finale ---
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#2E1065');
      grad.addColorStop(0.7, '#3B0764');
      grad.addColorStop(1, '#581C87');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Golden stars and arcade sparkles
      ctx.fillStyle = '#FDE047';
      for (let i = 0; i < 20; i++) {
        const sx = (i * 73 + 40) % w;
        const sy = (i * 61 + 30) % (h - 80);
        ctx.beginPath();
        ctx.arc(sx, sy, 2 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

      // Royal stage corner drapes
      ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(80, 80, 0, 160);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(w, 0);
      ctx.quadraticCurveTo(w - 80, 80, w, 160);
      ctx.closePath();
      ctx.fill();

      // Gilded trophy pedestal baseboard
      ctx.fillStyle = '#78350F';
      ctx.fillRect(0, h - 34, w, 34);
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(0, h - 34, w, 6);
    }
  }

  private drawObstacle(ctx: CanvasRenderingContext2D, obs: FixedObstacle) {
    ctx.save();
    ctx.translate(obs.x, obs.y);
    if (obs.angle) {
      ctx.rotate((obs.angle * Math.PI) / 180);
    }

    const hw = obs.width / 2;
    const hh = obs.height / 2;

    // Contact drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.beginPath();
    ctx.roundRect(-hw + 4, -hh + 6, obs.width, obs.height, 8);
    ctx.fill();

    // Main surface
    ctx.fillStyle = obs.color || '#A16207';
    ctx.beginPath();
    ctx.roundRect(-hw, -hh, obs.width, obs.height, 8);
    ctx.fill();

    // Dimensional top highlight bevel
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-hw + 6, -hh + 3);
    ctx.lineTo(hw - 6, -hh + 3);
    ctx.stroke();

    // Screw studs on shelf tips
    ctx.fillStyle = '#CBD5E1';
    ctx.beginPath();
    ctx.arc(-hw + 10, 0, 3, 0, Math.PI * 2);
    ctx.arc(hw - 10, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  private drawTargetZone(ctx: CanvasRenderingContext2D, tz: TargetZone) {
    ctx.save();
    ctx.translate(tz.x, tz.y);

    const w = tz.width || 140;
    const h = tz.height || 40;
    const worldId = this.level.worldId || 1;

    // Glowing target perimeter
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.roundRect(-w / 2 - 8, -h / 2 - 8, w + 16, h + 16, 16);
    ctx.stroke();
    ctx.setLineDash([]);

    if (worldId === 1) {
      // --- World 1: Frying Pan ---
      // Cast-iron pan body
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 12);
      ctx.fill();

      // Pan handle on left
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.roundRect(-w / 2 - 34, -7, 36, 14, 6);
      ctx.fill();
      ctx.fillStyle = '#CBD5E1';
      ctx.beginPath();
      ctx.arc(-w / 2 - 26, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Golden sizzling interior
      ctx.fillStyle = '#FDE047';
      ctx.beginPath();
      ctx.roundRect(-w / 2 + 6, -h / 2 + 5, w - 12, h - 10, 8);
      ctx.fill();

      // Butter pat with steam
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(-12, -7, 24, 14);
      ctx.strokeStyle = '#CA8A04';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-12, -7, 24, 14);
    } else if (worldId === 2) {
      // --- World 2: Snooze Pillow ---
      ctx.fillStyle = '#818CF8';
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 14);
      ctx.fill();

      ctx.fillStyle = '#EEF2FF';
      ctx.beginPath();
      ctx.roundRect(-w / 2 + 5, -h / 2 + 4, w - 10, h - 8, 10);
      ctx.fill();

      // Tufting buttons
      ctx.fillStyle = '#A5B4FC';
      for (const px of [-30, 0, 30]) {
        ctx.beginPath();
        ctx.arc(px, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (worldId === 3) {
      // --- World 3: Toy Chest ---
      ctx.fillStyle = '#92400E';
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 10);
      ctx.fill();

      ctx.fillStyle = '#F59E0B';
      ctx.beginPath();
      ctx.roundRect(-w / 2 + 6, -h / 2 + 5, w - 12, h - 10, 6);
      ctx.fill();

      // Golden latch
      ctx.fillStyle = '#FCD34D';
      ctx.fillRect(-8, -h / 2 + 2, 16, 10);
    } else {
      // Standard cheerful receptacle
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 12);
      ctx.fill();

      ctx.fillStyle = '#FDE047';
      ctx.beginPath();
      ctx.roundRect(-w / 2 + 6, -h / 2 + 5, w - 12, h - 10, 8);
      ctx.fill();
    }

    // Label banner
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`★ ${tz.label}`, 0, 0);

    ctx.restore();
  }

  private drawGadget(ctx: CanvasRenderingContext2D, g: PlacedGadget, isSelected: boolean) {
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate((g.angle * Math.PI) / 180);

    // Continuous Rotation Handle & Selection Halo
    if (isSelected) {
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, 85, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -85);
      ctx.stroke();

      // Rotation Handle Knob (at 0, -85)
      ctx.fillStyle = '#2563EB';
      ctx.beginPath();
      ctx.arc(0, -85, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('↻', 0, -85);

      // Angle degree readout badge
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.beginPath();
      ctx.roundRect(-24, 45, 48, 18, 6);
      ctx.fill();
      ctx.fillStyle = '#F8FAFC';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`${Math.round(g.angle)}°`, 0, 54);
    }

    if (g.type === 'wood_ramp') {
      // Wooden Ramp
      ctx.fillStyle = '#92400E';
      ctx.beginPath();
      ctx.roundRect(-70, -9, 140, 18, 6);
      ctx.fill();

      // Wood plank stripes
      ctx.fillStyle = '#B45309';
      ctx.fillRect(-64, -7, 128, 4);

      // Directional arrow
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(15, -4);
      ctx.lineTo(28, 0);
      ctx.lineTo(15, 4);
      ctx.fill();
    } else if (g.type === 'bouncy_pad') {
      // Spring Bouncy Pad
      ctx.fillStyle = '#334155';
      ctx.fillRect(-45, 6, 90, 8);

      // Coiled chrome springs
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 3;
      for (const sx of [-28, 0, 28]) {
        ctx.beginPath();
        ctx.moveTo(sx, 6);
        ctx.lineTo(sx - 4, 1);
        ctx.lineTo(sx + 4, -4);
        ctx.lineTo(sx, -9);
        ctx.stroke();
      }

      // Jelly cushion
      ctx.fillStyle = '#EC4899';
      ctx.beginPath();
      ctx.roundRect(-55, -16, 110, 14, 7);
      ctx.fill();

      ctx.fillStyle = '#F472B6';
      ctx.beginPath();
      ctx.roundRect(-48, -14, 96, 5, 3);
      ctx.fill();

      // Star emblem
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, -9, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (g.type === 'wind_fan') {
      // Electric Fan
      ctx.fillStyle = '#0284C7';
      ctx.beginPath();
      ctx.roundRect(-30, -22, 60, 44, 10);
      ctx.fill();

      ctx.fillStyle = '#E0F2FE';
      ctx.beginPath();
      ctx.arc(8, 0, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#0369A1';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Spinning blades
      const spinAngle = this.isRunning ? (performance.now() / 70) % (Math.PI * 2) : 0;
      ctx.save();
      ctx.translate(8, 0);
      ctx.rotate(spinAngle);
      ctx.fillStyle = '#0284C7';
      for (let b = 0; b < 3; b++) {
        ctx.rotate((Math.PI * 2) / 3);
        ctx.beginPath();
        ctx.ellipse(0, -9, 4, 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // Wind streamlines
      if (this.isRunning) {
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
        ctx.lineWidth = 2;
        const wave = Math.sin(performance.now() / 90) * 8;
        ctx.beginPath();
        ctx.moveTo(28, -10);
        ctx.lineTo(140, -25 + wave);
        ctx.moveTo(28, 0);
        ctx.lineTo(160, 0 - wave);
        ctx.moveTo(28, 10);
        ctx.lineTo(140, 25 + wave);
        ctx.stroke();
      }
    } else if (g.type === 'domino_block') {
      // Domino block
      ctx.fillStyle = '#F8FAFC';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-8, -34, 16, 68, 4);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.lineTo(7, 0);
      ctx.stroke();

      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(0, -16, 3, 0, Math.PI * 2);
      ctx.arc(0, 16, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (g.type === 'seesaw') {
      // Seesaw
      ctx.fillStyle = '#059669';
      ctx.beginPath();
      ctx.roundRect(-90, -8, 180, 16, 5);
      ctx.fill();

      // Red rubber end bumpers
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(-90, -8, 8, 16);
      ctx.fillRect(82, -8, 8, 16);

      // Fulcrum triangle
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.moveTo(-14, 18);
      ctx.lineTo(14, 18);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
    } else if (g.type === 'spring_launcher') {
      // Spring launcher
      ctx.fillStyle = '#D97706';
      ctx.beginPath();
      ctx.roundRect(-32, -22, 64, 44, 8);
      ctx.fill();

      // Launch punching pad
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.roundRect(14, -18, 14, 36, 4);
      ctx.fill();

      // Plunger spring
      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(-4, -6);
      ctx.lineTo(4, 6);
      ctx.lineTo(14, 0);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawGhostGadget(ctx: CanvasRenderingContext2D, ghost: PlacedGadget) {
    ctx.save();
    ctx.translate(ghost.x, ghost.y);
    ctx.rotate((ghost.angle * Math.PI) / 180);

    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.18)';

    if (ghost.type === 'wood_ramp') {
      ctx.beginPath();
      ctx.roundRect(-70, -9, 140, 18, 6);
      ctx.fill();
      ctx.stroke();
    } else if (ghost.type === 'bouncy_pad') {
      ctx.beginPath();
      ctx.roundRect(-55, -16, 110, 24, 7);
      ctx.fill();
      ctx.stroke();
    } else if (ghost.type === 'wind_fan') {
      ctx.beginPath();
      ctx.roundRect(-30, -22, 60, 44, 10);
      ctx.fill();
      ctx.stroke();
    } else if (ghost.type === 'spring_launcher') {
      ctx.beginPath();
      ctx.roundRect(-32, -22, 64, 44, 8);
      ctx.fill();
      ctx.stroke();
    }

    ctx.setLineDash([]);
    ctx.restore();
  }

  // --- Real Distinct Cartoon Character System ---
  private drawDynamicObject(
    ctx: CanvasRenderingContext2D,
    body: Matter.Body,
    def: DynamicObject
  ) {
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);

    const speed = Vector.magnitude(body.velocity);
    const recentlyImpacted = Date.now() - this.lastImpactTime < 320;
    const squash = this.impactSquashMap.get(String(body.id)) || 0;

    // Apply impact squash-and-stretch
    if (squash > 0.01) {
      ctx.scale(1 + squash * 0.45, 1 - squash * 0.35);
    }

    // Idle breathing wobble when in SETUP mode
    if (!this.isRunning && !this.won) {
      const wobble = Math.sin(this.animationTime * 3) * 0.04;
      ctx.rotate(wobble);
    }

    // Blinking cycle every ~3.5s
    const isBlinking = (this.animationTime % 3.6) > 3.45;

    if (def.type === 'alarm_clock') {
      // --- Vintage Alarm Clock ---
      ctx.fillStyle = '#CBD5E1';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-16, -26, 8, 0, Math.PI * 2);
      ctx.arc(16, -26, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Feet
      ctx.fillStyle = '#64748B';
      ctx.fillRect(-18, 20, 6, 8);
      ctx.fillRect(12, 20, 6, 8);

      // Red body
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.roundRect(-24, -24, 48, 48, 12);
      ctx.fill();
      ctx.stroke();

      // White clock face
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();

      // Expressive eyes
      this.drawExpressiveEyes(ctx, 0, -2, 14, 5, body.velocity, recentlyImpacted, speed, isBlinking);

      // Clock hands
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -6);
      ctx.moveTo(0, 0);
      ctx.lineTo(6, 0);
      ctx.stroke();
    } else if (def.type === 'rubber_duck') {
      // --- Cute Rubber Duck ---
      ctx.fillStyle = '#FACC15';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.ellipse(-4, 4, 20, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Duck tail
      ctx.beginPath();
      ctx.moveTo(-20, 4);
      ctx.lineTo(-28, -4);
      ctx.lineTo(-16, -2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Duck head
      ctx.beginPath();
      ctx.arc(10, -8, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Orange beak
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.moveTo(18, -10);
      ctx.lineTo(28, -6);
      ctx.lineTo(18, -2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      this.drawExpressiveEyes(ctx, 8, -10, 10, 3.5, body.velocity, recentlyImpacted, speed, isBlinking);
    } else if (def.type === 'coffee_mug') {
      // --- Ceramic Coffee Mug ---
      ctx.strokeStyle = '#0284C7';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(-20, 0, 10, Math.PI * 0.5, Math.PI * 1.5);
      ctx.stroke();

      ctx.fillStyle = '#0284C7';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-18, -24, 36, 48, 8);
      ctx.fill();
      ctx.stroke();

      // Coffee surface top rim
      ctx.fillStyle = '#78350F';
      ctx.beginPath();
      ctx.ellipse(0, -22, 14, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Rising steam curls
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.5;
      const steamWave = Math.sin(this.animationTime * 4) * 3;
      ctx.beginPath();
      ctx.moveTo(-4, -26);
      ctx.quadraticCurveTo(-8 + steamWave, -34, -4, -40);
      ctx.moveTo(4, -26);
      ctx.quadraticCurveTo(8 - steamWave, -34, 4, -40);
      ctx.stroke();

      this.drawExpressiveEyes(ctx, 0, 2, 16, 4.5, body.velocity, recentlyImpacted, speed, isBlinking);
    } else if (def.type === 'soda_bottle') {
      // --- Rolling Soda Can ---
      const r = def.radius || 26;
      ctx.fillStyle = '#E2E8F0';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(0, 4, r * 0.55, r * 0.2, -0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#94A3B8';
      ctx.fillRect(-4, -r + 2, 8, 5);

      this.drawExpressiveEyes(ctx, 0, -3, r * 0.8, 3.5, body.velocity, recentlyImpacted, speed, isBlinking);
    } else if (def.type === 'bowling_pin') {
      // --- Bowling Pin ---
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-14, -14, 28, 42, 6);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.roundRect(-7, -28, 14, 16, 3);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#EF4444';
      ctx.fillRect(-8, -18, 16, 4);

      this.drawExpressiveEyes(ctx, 0, 4, 12, 3.5, body.velocity, recentlyImpacted, speed, isBlinking);
    } else {
      // --- Ball / Fresh Egg / Gumball / Boulder ---
      const r = def.radius || 26;
      let primaryColor = '#FFFBEB';
      let shineColor = '#FEF3C7';

      if (def.type === 'gumball') {
        primaryColor = '#EC4899';
        shineColor = '#F472B6';
      } else if (def.type === 'boulder') {
        primaryColor = '#64748B';
        shineColor = '#94A3B8';
      }

      ctx.fillStyle = primaryColor;
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.5;

      if (def.type === 'ball_egg') {
        // Oval egg silhouette
        ctx.beginPath();
        ctx.ellipse(0, 2, r * 0.9, r * 1.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = shineColor;
        ctx.beginPath();
        ctx.ellipse(-r * 0.3, -r * 0.4, r * 0.3, r * 0.45, -0.3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = shineColor;
        ctx.beginPath();
        ctx.arc(-r * 0.35, -r * 0.35, r * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }

      this.drawExpressiveEyes(ctx, 0, -2, r, r * 0.28, body.velocity, recentlyImpacted, speed, isBlinking);
    }

    ctx.restore();
  }

  private drawExpressiveEyes(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    eyeSpan: number,
    eyeRadius: number,
    velocity: { x: number; y: number },
    recentlyImpacted: boolean,
    speed: number,
    isBlinking: boolean = false
  ) {
    const pupilRadius = eyeRadius * 0.45;
    let lookX = 0;
    let lookY = 0;

    if (this.isRunning && speed > 0.5) {
      lookX = (velocity.x / (speed + 0.001)) * (eyeRadius - pupilRadius);
      lookY = (velocity.y / (speed + 0.001)) * (eyeRadius - pupilRadius);
    } else if (!this.isRunning) {
      // In setup mode, glance downward toward the target zone!
      lookX = 1.2;
      lookY = 1.8;
    }

    for (const side of [-1, 1]) {
      const ex = centerX + side * (eyeSpan * 0.34);
      const ey = centerY;

      if (this.won) {
        // Joyful happy arc eyes (^ ^)
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(ex, ey + 2, eyeRadius * 0.8, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      } else if (isBlinking) {
        // Cute blinking closed eye
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ex - eyeRadius, ey);
        ctx.lineTo(ex + eyeRadius, ey);
        ctx.stroke();
      } else if (recentlyImpacted) {
        // Impact X eyes
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ex - 3, ey - 3);
        ctx.lineTo(ex + 3, ey + 3);
        ctx.moveTo(ex + 3, ey - 3);
        ctx.lineTo(ex - 3, ey + 3);
        ctx.stroke();
      } else {
        // White sclera
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ex, ey, eyeRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Pupil
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.arc(ex + lookX, ey + lookY, pupilRadius, 0, Math.PI * 2);
        ctx.fill();

        // Specular eye glint
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(ex + lookX - 1, ey + lookY - 1, pupilRadius * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }

      // Rosy Pink Cheeks
      ctx.fillStyle = 'rgba(244, 114, 182, 0.55)';
      ctx.beginPath();
      ctx.ellipse(ex, ey + eyeRadius + 4, eyeRadius * 0.7, eyeRadius * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Cute mouth
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (this.won) {
      // Big open happy smile
      ctx.arc(centerX, centerY + eyeRadius * 1.3, 5, 0, Math.PI);
      ctx.fillStyle = '#EF4444';
      ctx.fill();
      ctx.stroke();
    } else if (speed > 5) {
      // Surprised open mouth
      ctx.arc(centerX, centerY + eyeRadius * 1.5, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#EF4444';
      ctx.fill();
      ctx.stroke();
    } else {
      // Gentle smile
      ctx.arc(centerX, centerY + eyeRadius * 1.1, 4.5, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const c of this.confetti) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, c.alpha);
      ctx.fillStyle = c.color;
      ctx.fillRect(c.x - c.radius, c.y - c.radius, c.radius * 2, c.radius * 2);
      ctx.restore();
    }
  }

  private drawGoalIndicator(ctx: CanvasRenderingContext2D) {
    const tz = this.level.targetZone;
    const pulse = (Math.sin(performance.now() / 250) + 1) * 6;

    ctx.save();
    ctx.fillStyle = '#EA580C';
    ctx.beginPath();
    ctx.moveTo(tz.x, tz.y - 36 - pulse);
    ctx.lineTo(tz.x - 12, tz.y - 56 - pulse);
    ctx.lineTo(tz.x + 12, tz.y - 56 - pulse);
    ctx.closePath();
    ctx.fill();

    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#EA580C';
    ctx.textAlign = 'center';
    ctx.fillText('TARGET HERE', tz.x, tz.y - 64 - pulse);
    ctx.restore();
  }

  // --- Headless Simulation Runner for 200-Level QA Validator ---
  public static simulateHeadless(
    level: LevelDefinition,
    gadgets: PlacedGadget[],
    maxFrames: number = 600
  ): { won: boolean; framesTaken: number } {
    const engine = Engine.create({
      gravity: { x: 0, y: 1.1, scale: 0.001 },
      enableSleeping: false,
    });
    const world = engine.world;

    const wallOptions = { isStatic: true, friction: 0.1, restitution: 0.3 };
    World.add(world, [
      Bodies.rectangle(360, -10, 740, 20, wallOptions),
      Bodies.rectangle(360, 970, 740, 20, wallOptions),
      Bodies.rectangle(-10, 490, 20, 1000, wallOptions),
      Bodies.rectangle(730, 490, 20, 1000, wallOptions),
    ]);

    for (const obs of level.fixedObstacles) {
      World.add(
        world,
        Bodies.rectangle(obs.x, obs.y, obs.width, obs.height, {
          isStatic: true,
          angle: ((obs.angle || 0) * Math.PI) / 180,
          friction: obs.friction ?? 0.08,
          restitution: obs.restitution ?? 0.25,
        })
      );
    }

    const tz = level.targetZone;
    const targetSensor = Bodies.rectangle(tz.x, tz.y, tz.width || 140, tz.height || 40, {
      isStatic: true,
      isSensor: true,
      label: 'target_sensor',
    });
    World.add(world, targetSensor);

    for (const g of gadgets) {
      const angleRad = (g.angle * Math.PI) / 180;
      if (g.type === 'wood_ramp') {
        World.add(
          world,
          Bodies.rectangle(g.x, g.y, 140, 18, {
            isStatic: true,
            angle: angleRad,
            friction: 0.05,
            restitution: 0.25,
          })
        );
      } else if (g.type === 'bouncy_pad') {
        World.add(
          world,
          Bodies.rectangle(g.x, g.y, 110, 24, {
            isStatic: true,
            angle: angleRad,
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
          })
        );
      } else if (g.type === 'domino_block') {
        World.add(
          world,
          Bodies.rectangle(g.x, g.y, 16, 68, {
            isStatic: false,
            angle: angleRad,
            density: 0.003,
          })
        );
      } else if (g.type === 'seesaw') {
        const plank = Bodies.rectangle(g.x, g.y, 180, 16, {
          isStatic: false,
          angle: angleRad,
        });
        const pivot = Constraint.create({
          pointA: { x: g.x, y: g.y },
          bodyB: plank,
          length: 0,
        });
        World.add(world, [plank, pivot]);
      } else if (g.type === 'spring_launcher') {
        World.add(
          world,
          Bodies.rectangle(g.x, g.y, 64, 44, {
            isStatic: true,
            angle: angleRad,
            label: `gadget_spring_${g.id}`,
          })
        );
      }
    }

    const dynamicList: Matter.Body[] = [];
    let goalBody: Matter.Body | null = null;
    for (const item of level.dynamicObjects) {
      let b: Matter.Body;
      if (item.type === 'alarm_clock' || item.type === 'coffee_mug') {
        b = Bodies.rectangle(item.x, item.y, 48, 48, {
          isStatic: false,
          density: item.density ?? 0.002,
          restitution: item.restitution ?? 0.65,
          friction: 0.03,
          chamfer: { radius: 14 },
        });
      } else if (item.type === 'rubber_duck') {
        b = Bodies.rectangle(item.x, item.y, 52, 44, {
          isStatic: false,
          density: item.density ?? 0.0018,
          restitution: item.restitution ?? 0.65,
          friction: 0.03,
          chamfer: { radius: 14 },
        });
      } else if (item.type === 'bowling_pin') {
        b = Bodies.rectangle(item.x, item.y, 32, 58, {
          isStatic: false,
          density: item.density ?? 0.002,
          restitution: item.restitution ?? 0.55,
          friction: 0.03,
          chamfer: { radius: 14 },
        });
      } else {
        b = Bodies.circle(item.x, item.y, item.radius || 26, {
          isStatic: false,
          density: item.density ?? 0.002,
          restitution: item.restitution ?? 0.65,
          friction: item.friction ?? 0.05,
        });
      }

      if (item.isPrimaryGoal) {
        goalBody = b;
      }
      dynamicList.push(b);
      World.add(world, b);
    }

    let won = false;
    let framesTaken = 0;

    Events.on(engine, 'collisionStart', (e) => {
      for (const pair of e.pairs) {
        if (
          (pair.bodyA === targetSensor && pair.bodyB === goalBody) ||
          (pair.bodyB === targetSensor && pair.bodyA === goalBody)
        ) {
          won = true;
        }

        if (pair.bodyA.label === 'bouncy_pad' || pair.bodyB.label === 'bouncy_pad') {
          const dyn = pair.bodyA.label === 'bouncy_pad' ? pair.bodyB : pair.bodyA;
          if (!dyn.isStatic) {
            Body.applyForce(dyn, dyn.position, { x: 0.004 * dyn.mass, y: -0.045 * dyn.mass });
          }
        }
      }
    });

    for (let f = 0; f < maxFrames; f++) {
      framesTaken = f;
      for (const g of gadgets) {
        if (g.type === 'wind_fan') {
          const rad = (g.angle * Math.PI) / 180;
          const fanDir = { x: Math.cos(rad), y: Math.sin(rad) };
          for (const b of dynamicList) {
            const diff = Vector.sub(b.position, { x: g.x, y: g.y });
            const dist = Vector.magnitude(diff);
            if (dist < 320) {
              const normDiff = Vector.normalise(diff);
              if (Vector.dot(fanDir, normDiff) > 0.4) {
                const s = (1 - dist / 320) * 0.0035 * b.mass;
                Body.applyForce(b, b.position, {
                  x: fanDir.x * s,
                  y: fanDir.y * s - 0.0009 * b.mass,
                });
              }
            }
          }
        }
      }

      Engine.update(engine, 1000 / 60);

      if (goalBody && !won) {
        const dx = Math.abs(goalBody.position.x - tz.x);
        const dy = Math.abs(goalBody.position.y - tz.y);
        if (dx < (tz.width || 140) / 2 + 25 && dy < (tz.height || 40) / 2 + 25) {
          won = true;
          break;
        }
      }

      if (won) break;
    }

    World.clear(world, false);
    Engine.clear(engine);

    return { won, framesTaken };
  }
}
