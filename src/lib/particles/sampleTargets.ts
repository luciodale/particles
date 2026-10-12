import type { Target } from "./types";

const ALPHA_THRESHOLD = 140;
const COLOR_STEP = 10;

/** Gradients produce thousands of unique colors; snapping them keeps fillStyle switches per frame low. */
function quantize(channel: number | undefined) {
  return Math.min(255, Math.round((channel ?? 0) / COLOR_STEP) * COLOR_STEP);
}

export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load ${src}`));
    image.src = src;
  });
}

function createScratchContext(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(width));
  canvas.height = Math.max(1, Math.ceil(height));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2D context unavailable");
  return ctx;
}

/** Jittered grid sampling of every opaque pixel; one target per cell keeps the fill even but grainy. */
function sampleContext(ctx: CanvasRenderingContext2D, step: number, offsetX: number, offsetY: number) {
  const { width, height } = ctx.canvas;
  const { data } = ctx.getImageData(0, 0, width, height);
  const targets: Target[] = [];

  for (let gy = 0; gy < height; gy += step) {
    for (let gx = 0; gx < width; gx += step) {
      const x = Math.min(width - 1, Math.floor(gx + Math.random() * step));
      const y = Math.min(height - 1, Math.floor(gy + Math.random() * step));
      const i = (y * width + x) * 4;
      if ((data[i + 3] ?? 0) < ALPHA_THRESHOLD) continue;
      targets.push({
        x: offsetX + x,
        y: offsetY + y,
        color: `rgb(${quantize(data[i])},${quantize(data[i + 1])},${quantize(data[i + 2])})`,
      });
    }
  }
  return targets;
}

type ImageSampleArgs = {
  image: HTMLImageElement;
  width: number;
  height: number;
  left: number;
  top: number;
  step: number;
};

export function sampleImage({ image, width, height, left, top, step }: ImageSampleArgs) {
  const ctx = createScratchContext(width, height);
  ctx.drawImage(image, 0, 0, width, height);
  return sampleContext(ctx, step, left, top);
}

export type SpacedText = {
  text: string;
  fontSize: number;
  fontFamily: string;
  color: string;
  centerX: number;
  top: number;
  letterGap: number;
};

function measureSpacedText(ctx: CanvasRenderingContext2D, { text, letterGap }: SpacedText) {
  const letters = [...text];
  const widths = letters.map((letter) => ctx.measureText(letter).width);
  const totalWidth = widths.reduce((sum, w) => sum + w, 0) + letterGap * (letters.length - 1);
  return { letters, widths, totalWidth };
}

/** Letters are drawn one by one so the spacing is symmetric around the center. */
export function drawSpacedText(ctx: CanvasRenderingContext2D, caption: SpacedText) {
  ctx.font = `600 ${caption.fontSize}px ${caption.fontFamily}`;
  ctx.fillStyle = caption.color;
  ctx.textBaseline = "middle";
  const { letters, widths, totalWidth } = measureSpacedText(ctx, caption);
  let cursor = caption.centerX - totalWidth / 2;
  letters.forEach((letter, i) => {
    ctx.fillText(letter, cursor, caption.top + caption.fontSize * 0.7);
    cursor += (widths[i] ?? 0) + caption.letterGap;
  });
}

export function sampleSpacedText(caption: SpacedText, step: number) {
  const measure = createScratchContext(1, 1);
  measure.font = `600 ${caption.fontSize}px ${caption.fontFamily}`;
  const { totalWidth } = measureSpacedText(measure, caption);
  const left = caption.centerX - totalWidth / 2 - 2;
  const ctx = createScratchContext(totalWidth + 4, caption.fontSize * 1.4);
  drawSpacedText(ctx, { ...caption, centerX: totalWidth / 2 + 2, top: 0 });
  return sampleContext(ctx, step, left, caption.top);
}
