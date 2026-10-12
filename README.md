# particles

Particle login intro for Stylus: a drifting dust cloud, gentle ripples from the center, then a collapse into the logo and caption, finishing on the crisp SVG.

```bash
bun install
bun run dev
```

- `src/components/StylusIntro.tsx`: drop in component (`onComplete` fires when the logo has formed).
- `src/lib/particles/simulation.ts`: motion, ripples, collapse, rendering. Tuning constants live at the top.
- `src/lib/particles/buildLayout.ts`: logo and caption sizing.
