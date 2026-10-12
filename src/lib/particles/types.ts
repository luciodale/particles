import type { SpacedText } from "./sampleTargets";

export type Point = { x: number; y: number };

export type Target = Point & { color: string };

/** Concentric ripples spreading out from the cloud center before the collapse. */
export type Ripples = {
  center: Point;
  /** Seconds at which each ripple leaves the center. */
  starts: ReadonlyArray<number>;
  speed: number;
  /** Cloud radius; ripples fade out as they pass it. */
  reach: number;
  width: number;
};

export type Particle = {
  home: Point;
  target: Point | null;
  color: string;
  darkColor: string;
  size: number;
  baseAlpha: number;
  /** Two layered sine wanders per axis; incommensurate speeds make the motion read as chaotic, never periodic. */
  wander: { amplitude: number; speeds: readonly [number, number, number, number]; phases: readonly [number, number, number, number] };
  startAt: number;
  flightDuration: number;
  bend: Point;
  launch: { from: Point; c1: Point; c2: Point; to: Point } | null;
};

export type Timeline = {
  fadeIn: number;
  sweep: number;
  flight: number;
  stagger: number;
  captionLag: number;
  solidify: number;
};

export type Layout = {
  width: number;
  height: number;
  logo: { image: HTMLImageElement; x: number; y: number; width: number; height: number };
  caption: SpacedText;
  logoTargets: ReadonlyArray<Target>;
  captionTargets: ReadonlyArray<Target>;
};
