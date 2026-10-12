import { useEffect, useRef } from "react";
import { buildLayout } from "../lib/particles/buildLayout";
import { loadImage } from "../lib/particles/sampleTargets";
import { computeFrame, createFrameState, createSimulation, DEFAULT_TIMELINE, drawFrame } from "../lib/particles/simulation";

type UseParticleLogoAnimationArgs = {
  logoSrc: string;
  caption: string;
  onComplete?: () => void;
};

export function useParticleLogoAnimation({ logoSrc, caption, onComplete }: UseParticleLogoAnimationArgs) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Effect is justified: it synchronises with external systems (canvas, rAF, ResizeObserver).
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!container || !canvas || !ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const styles = getComputedStyle(container);
    const background = styles.backgroundColor;
    let cancelled = false;
    let frameId = 0;
    let startedAt = 0;
    let completed = false;
    let observer: ResizeObserver | null = null;

    function run(image: HTMLImageElement) {
      if (!container || !canvas || !ctx) return;
      let simulation = createSimulation(measure(image), DEFAULT_TIMELINE);
      let frame = createFrameState(simulation);
      const timeOffset = reducedMotion ? simulation.completeAt : 0;

      function measure(img: HTMLImageElement) {
        const { width, height } = container!.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas!.width = Math.round(width * dpr);
        canvas!.height = Math.round(height * dpr);
        ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
        return buildLayout({
          image: img,
          caption,
          captionColor: styles.color,
          fontFamily: styles.fontFamily,
          width,
          height,
        });
      }

      observer = new ResizeObserver(() => {
        simulation = createSimulation(measure(image), DEFAULT_TIMELINE);
        frame = createFrameState(simulation);
        if (frame.done || completed) {
          cancelAnimationFrame(frameId);
          frameId = requestAnimationFrame(tick);
        }
      });
      observer.observe(container);

      function tick(now: number) {
        if (cancelled) return;
        startedAt ||= now;
        const t = (now - startedAt) / 1000 + timeOffset;
        computeFrame(simulation, t, frame);
        drawFrame(ctx!, simulation, frame, background);
        if (frame.done && !completed) {
          completed = true;
          onCompleteRef.current?.();
        }
        // The final frame is the static SVG, so the loop stops and costs nothing while the user logs in.
        if (!frame.done) frameId = requestAnimationFrame(tick);
      }
      frameId = requestAnimationFrame(tick);
    }

    loadImage(logoSrc).then((image) => {
      if (!cancelled) run(image);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      observer?.disconnect();
    };
  }, [logoSrc, caption]);

  return { containerRef, canvasRef };
}
