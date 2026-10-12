import { drawSpacedText } from "./sampleTargets";
import type { Layout, Particle, Point, Ripples, Target, Timeline } from "./types";

export const DEFAULT_TIMELINE: Timeline = {
  fadeIn: 0.3,
  sweep: 1.45,
  flight: 1.4,
  stagger: 0.9,
  captionLag: 0.3,
  solidify: 0.8,
};

/** Brightness of the resting cloud relative to the final logo colors. */
const DARKNESS = 0.75;
const DUST_RATIO = 0.8;
/** Number of ripples and seconds between them. */
const RIPPLE_COUNT = 3;
const RIPPLE_INTERVAL = 0.45;
const RIPPLE_FIRST_AT = 0.15;
/** Seconds a ripple takes to reach the edge of the cloud. */
const RIPPLE_TRAVEL = 1.7;
/** Ring thickness as a fraction of the cloud radius. */
const RIPPLE_WIDTH = 0.14;
/** Peak displacement as a fraction of ring thickness; below 0.6 dust compresses into the ring but never crosses over. */
const RIPPLE_PUSH = 0.22;
/** How much the compressed ring brightens. */
const RIPPLE_GLOW = 0.3;

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function gaussian() {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function lerpPoint(a: Point, b: Point, t: number) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function cubicBezier(p0: Point, p1: Point, p2: Point, p3: Point, t: number) {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const d = t * t * t;
  return { x: a * p0.x + b * p1.x + c * p2.x + d * p3.x, y: a * p0.y + b * p1.y + c * p2.y + d * p3.y };
}

function darken(color: string) {
  const channels = color.match(/\d+/g)?.map(Number) ?? [255, 255, 255];
  const [r = 0, g = 0, b = 0] = channels.map((c) => Math.round(c * DARKNESS));
  return `rgb(${r},${g},${b})`;
}

/** Soft elliptical cloud centered on the logo, so the collapse falls naturally into place. */
function cloudShape(layout: Layout) {
  const { width, height, logo } = layout;
  return {
    center: { x: logo.x + logo.width / 2, y: logo.y + logo.height / 2 },
    sigmaX: width * 0.22,
    sigmaY: height * 0.13,
  };
}

type Cloud = ReturnType<typeof cloudShape>;

function sampleCloudPoint(cloud: Cloud) {
  const clip = (value: number) => Math.max(-2.4, Math.min(2.4, value));
  return { x: cloud.center.x + clip(gaussian()) * cloud.sigmaX, y: cloud.center.y + clip(gaussian()) * cloud.sigmaY };
}

function createRipples(center: Point, reach: number): Ripples {
  return {
    center,
    starts: Array.from({ length: RIPPLE_COUNT }, (_, i) => RIPPLE_FIRST_AT + i * RIPPLE_INTERVAL),
    speed: reach / RIPPLE_TRAVEL,
    reach,
    width: reach * RIPPLE_WIDTH,
  };
}

/**
 * Chaotic wander around the particle's home, plus concentric ripples spreading from the center.
 * Each ripple is a derivative-of-gaussian pulse: dust just behind the front is pushed out and dust just ahead is held back,
 * so it bunches into a bright travelling ring, then settles back as the ring passes.
 */
function cloudPosition(particle: Particle, ripples: Ripples, t: number) {
  const { amplitude, speeds, phases } = particle.wander;
  const x = particle.home.x + amplitude * (Math.sin(t * speeds[0] + phases[0]) + 0.6 * Math.sin(t * speeds[1] + phases[1]));
  const y = particle.home.y + amplitude * (Math.sin(t * speeds[2] + phases[2]) + 0.6 * Math.sin(t * speeds[3] + phases[3]));
  const dx = x - ripples.center.x;
  const dy = y - ripples.center.y;
  const r = Math.hypot(dx, dy) || 1e-3;
  const { width } = ripples;

  let shift = 0;
  let glow = 0;
  for (const start of ripples.starts) {
    const front = (t - start) * ripples.speed;
    if (front <= 0) continue;
    // Each ring swells in gently from the center, weakens as it grows, and fades out as it leaves the cloud.
    const strength = (1 - 0.5 * Math.min(1, front / ripples.reach)) * (1 - smoothstep(ripples.reach * 0.9, ripples.reach * 1.2, front)) * smoothstep(0, ripples.reach * 0.35, front);
    const offset = (r - front) / width;
    const envelope = Math.exp(-0.5 * offset * offset);
    shift += -RIPPLE_PUSH * width * strength * offset * envelope * Math.E ** 0.5;
    glow += strength * envelope;
  }

  return { x: x + (dx / r) * shift, y: y + (dy / r) * shift, glow: Math.min(1, glow) };
}

type Simulation = {
  particles: Particle[];
  ripples: Ripples;
  collapseCenter: Point;
  layout: Layout;
  timeline: Timeline;
  collapseAt: number;
  completeAt: number;
};

type ParticleSeed = {
  home: Point;
  target: Point | null;
  color: string;
  startAt: number;
  timeline: Timeline;
};

function createParticle({ home, target, color, startAt, timeline }: ParticleSeed): Particle {
  return {
    home,
    target,
    color,
    darkColor: darken(color),
    size: rand(1, 1.8),
    baseAlpha: rand(0.35, 0.9),
    wander: {
      amplitude: rand(10, 34),
      speeds: [rand(0.5, 1.6), rand(1.4, 3.1), rand(0.5, 1.6), rand(1.4, 3.1)],
      phases: [rand(0, 6.3), rand(0, 6.3), rand(0, 6.3), rand(0, 6.3)],
    },
    startAt,
    flightDuration: timeline.flight * rand(0.85, 1.15),
    bend: { x: gaussian() * 30, y: gaussian() * 30 },
    launch: null,
  };
}

export function createSimulation(layout: Layout, timeline: Timeline) {
  const { logoTargets, captionTargets } = layout;
  const cloud = cloudShape(layout);
  const collapseAt = timeline.fadeIn + timeline.sweep;
  const center = cloud.center;

  function angleOf(p: Point) {
    return Math.atan2(p.y - center.y, p.x - center.x);
  }
  function byAngle(a: Point, b: Point) {
    return angleOf(a) - angleOf(b);
  }

  const targets = [
    ...logoTargets.map((t) => ({ ...t, lag: 0 })),
    ...captionTargets.map((t) => ({ ...t, lag: timeline.captionLag })),
  ].sort(byAngle);
  const homes = Array.from({ length: targets.length }, () => sampleCloudPoint(cloud)).sort(byAngle);
  const maxDistance = Math.max(...homes.map((h) => Math.hypot(h.x - center.x, h.y - center.y)));
  const ripples = createRipples(center, maxDistance);

  function startFor(home: Point, lag: number) {
    // Nearest dust falls first, like matter closest to the well.
    const distance = Math.hypot(home.x - center.x, home.y - center.y) / maxDistance;
    return collapseAt + lag + timeline.stagger * (0.7 * distance + 0.3 * Math.random());
  }

  // Matching by angle makes every particle fall roughly straight inward, so the collapse reads as one implosion.
  const particles = targets.map((target: Target & { lag: number }, j) => {
    const home = homes[j] ?? center;
    return createParticle({ home, target: { x: target.x, y: target.y }, color: target.color, startAt: startFor(home, target.lag), timeline });
  });

  // Extra dust thickens the cloud, then falls into the well and vanishes.
  const dustCount = Math.round(targets.length * DUST_RATIO);
  for (let i = 0; i < dustCount; i++) {
    const home = sampleCloudPoint(cloud);
    const color = targets[Math.floor(Math.random() * targets.length)]?.color ?? "rgb(255,255,255)";
    particles.push(createParticle({ home, target: null, color, startAt: startFor(home, 0), timeline }));
  }

  // Grouping by color lets the renderer switch fillStyle only a handful of times per frame.
  particles.sort((a, b) => (a.color < b.color ? -1 : a.color > b.color ? 1 : 0));

  const completeAt = Math.max(...particles.filter((p) => p.target).map((p) => p.startAt + p.flightDuration));
  const simulation: Simulation = { particles, ripples, collapseCenter: center, layout, timeline, collapseAt, completeAt };
  return simulation;
}

function launchFor(particle: Particle, from: Point, center: Point) {
  if (!particle.target) {
    // Leftover dust only drifts partway into the well before vanishing; sending it all to the center piled it into a bright spot.
    const to = lerpPoint(from, center, 0.6);
    return { from: { x: from.x, y: from.y }, c1: lerpPoint(from, to, 0.33), c2: lerpPoint(from, to, 0.66), to };
  }
  // Paths bow toward the well without all crossing the same point; funnelling every particle through the center made a bright flash.
  const inward = lerpPoint(from, center, 0.45);
  const { target } = particle;
  return {
    from: { x: from.x, y: from.y },
    c1: { x: inward.x + particle.bend.x * 0.5, y: inward.y + particle.bend.y * 0.5 },
    c2: { x: center.x + (target.x - center.x) * 0.75 + particle.bend.x, y: center.y + (target.y - center.y) * 0.75 + particle.bend.y },
    to: target,
  };
}

type FrameState = {
  positions: Float32Array;
  alphas: Float32Array;
  /** 0 = dim cloud color, 1 = final logo color. */
  tints: Float32Array;
  trail: number;
  solid: number;
  done: boolean;
};

export function computeFrame(simulation: Simulation, t: number, frame: FrameState) {
  const { particles, ripples, collapseCenter: center, timeline, collapseAt, completeAt } = simulation;
  const intro = smoothstep(0, timeline.fadeIn, t);

  particles.forEach((particle, i) => {
    let position: Point;
    let alpha: number;
    let tint: number;

    if (t < particle.startAt) {
      const drift = cloudPosition(particle, ripples, t);
      position = drift;
      // Dust caught in a ring brightens, which makes the ripple readable.
      alpha = Math.min(1, particle.baseAlpha * intro * (1 + drift.glow * RIPPLE_GLOW));
      tint = 0.3 + 0.3 * drift.glow;
    } else {
      particle.launch ??= launchFor(particle, cloudPosition(particle, ripples, particle.startAt), center);
      const progress = Math.min(1, (t - particle.startAt) / particle.flightDuration);
      const eased = easeInOutCubic(progress);
      position = cubicBezier(particle.launch.from, particle.launch.c1, particle.launch.c2, particle.launch.to, eased);

      if (particle.target) {
        const startAlpha = particle.baseAlpha;
        // Dim slightly mid-flight, where paths are densest, so overlapping dust doesn't bloom.
        const midFlight = 1 - 0.35 * Math.sin(Math.PI * progress);
        alpha = (startAlpha + (1 - startAlpha) * smoothstep(0.4, 1, progress)) * midFlight;
        tint = 0.3 + 0.7 * smoothstep(0.3, 0.9, progress);
      } else {
        // Leftover dust falls into the well and vanishes.
        alpha = particle.baseAlpha * (1 - progress) ** 2;
        tint = 0.3;
      }
    }

    frame.positions[i * 2] = position.x;
    frame.positions[i * 2 + 1] = position.y;
    frame.alphas[i] = alpha;
    frame.tints[i] = tint;
  });

  // Crisp dust while it ripples, motion trails once it collapses, clean clear before the logo solidifies.
  // Eased in and out: switching trails on abruptly made accumulated streaks pop as a flash.
  const trailing = smoothstep(collapseAt - 0.3, collapseAt + 0.5, t) * (1 - smoothstep(completeAt - 0.6, completeAt + 0.2, t));
  frame.trail = 1 - 0.6 * trailing;
  // Once the dust has landed, the crisp SVG and caption fade in underneath and the dust dissolves into them.
  frame.solid = smoothstep(completeAt - 0.25, completeAt - 0.25 + timeline.solidify, t);
  frame.done = frame.solid >= 1;
  return frame;
}

export function createFrameState(simulation: Simulation): FrameState {
  const count = simulation.particles.length;
  return {
    positions: new Float32Array(count * 2),
    alphas: new Float32Array(count),
    tints: new Float32Array(count),
    trail: 1,
    solid: 0,
    done: false,
  };
}

type ColorPass = { colorOf: (particle: Particle) => string; weightOf: (tint: number) => number };

/** The color shift is two batched passes (dim, then final) weighted by tint, avoiding per-particle color strings. */
const COLOR_PASSES: ReadonlyArray<ColorPass> = [
  { colorOf: (p) => p.darkColor, weightOf: (tint) => 1 - tint },
  { colorOf: (p) => p.color, weightOf: (tint) => tint },
];

export function drawFrame(ctx: CanvasRenderingContext2D, simulation: Simulation, frame: FrameState, background: string) {
  const { width, height, logo, caption } = simulation.layout;
  ctx.globalAlpha = frame.trail;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  if (frame.solid > 0) {
    ctx.globalAlpha = frame.solid;
    ctx.drawImage(logo.image, logo.x, logo.y, logo.width, logo.height);
    drawSpacedText(ctx, caption);
  }

  const dustAlpha = 1 - frame.solid;
  if (dustAlpha > 0) {
    for (const pass of COLOR_PASSES) {
      let currentColor = "";
      simulation.particles.forEach((particle, i) => {
        const alpha = (frame.alphas[i] ?? 0) * dustAlpha * pass.weightOf(frame.tints[i] ?? 0);
        if (alpha < 0.01) return;
        const color = pass.colorOf(particle);
        if (color !== currentColor) {
          currentColor = color;
          ctx.fillStyle = color;
        }
        ctx.globalAlpha = alpha;
        const size = particle.size;
        ctx.fillRect((frame.positions[i * 2] ?? 0) - size / 2, (frame.positions[i * 2 + 1] ?? 0) - size / 2, size, size);
      });
    }
  }
  ctx.globalAlpha = 1;
}
