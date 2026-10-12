import { StylusIntro } from "./components/StylusIntro";
import { useReplay } from "./hooks/useReplay";

export function App() {
  const { runId, isComplete, handleComplete, handleReplay } = useReplay();

  return (
    <main className="relative min-h-dvh">
      <StylusIntro key={runId} onComplete={handleComplete} />
      <button
        type="button"
        onClick={handleReplay}
        className={`absolute right-4 bottom-4 rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 transition-opacity duration-700 hover:border-slate-500 ${isComplete ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        Replay
      </button>
    </main>
  );
}
