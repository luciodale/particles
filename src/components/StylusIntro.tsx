import logoUrl from "../assets/spark.svg";
import { useParticleLogoAnimation } from "../hooks/useParticleLogoAnimation";

type StylusIntroProps = {
  onComplete?: () => void;
};

/** Background and caption colors are read from these Tailwind classes, so restyle here. */
export function StylusIntro({ onComplete }: StylusIntroProps) {
  const { containerRef, canvasRef } = useParticleLogoAnimation({ logoSrc: logoUrl, caption: "STYLUS", onComplete });

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden bg-slate-950 font-sans text-slate-200">
      <canvas ref={canvasRef} className="block size-full" aria-label="Stylus" role="img" />
    </div>
  );
}
