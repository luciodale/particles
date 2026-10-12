import { useState } from "react";

export function useReplay() {
  const [runId, setRunId] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  function handleComplete() {
    setIsComplete(true);
  }

  function handleReplay() {
    setIsComplete(false);
    setRunId((id) => id + 1);
  }

  return { runId, isComplete, handleComplete, handleReplay };
}
