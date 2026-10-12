import { sampleImage, sampleSpacedText, type SpacedText } from "./sampleTargets";
import type { Layout } from "./types";

type BuildLayoutArgs = {
  image: HTMLImageElement;
  caption: string;
  captionColor: string;
  fontFamily: string;
  width: number;
  height: number;
};

export function buildLayout({ image, caption, captionColor, fontFamily, width, height }: BuildLayoutArgs) {
  const aspect = image.naturalWidth / image.naturalHeight || 1;
  const logoHeight = Math.min(height * 0.26, (width * 0.5) / aspect, 220);
  const logoWidth = logoHeight * aspect;
  const fontSize = Math.max(12, logoHeight * 0.085);
  const gap = logoHeight * 0.14;
  const blockHeight = logoHeight + gap + fontSize * 1.4;
  const top = (height - blockHeight) / 2;
  const step = logoHeight < 160 ? 1.2 : 1.35;

  const logo = { image, x: (width - logoWidth) / 2, y: top, width: logoWidth, height: logoHeight };
  const captionText: SpacedText = {
    text: caption,
    fontSize,
    fontFamily,
    color: captionColor,
    centerX: width / 2,
    top: top + logoHeight + gap,
    letterGap: fontSize * 0.9,
  };

  const layout: Layout = {
    width,
    height,
    logo,
    caption: captionText,
    logoTargets: sampleImage({ image, width: logoWidth, height: logoHeight, left: logo.x, top: logo.y, step }),
    captionTargets: sampleSpacedText(captionText, step * 0.7),
  };
  return layout;
}
