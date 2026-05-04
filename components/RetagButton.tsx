"use client";

import { useState } from "react";

export default function RetagButton({ pending }: { pending: number }) {
  const [running, setRunning] = useState(false);
  const [left, setLeft] = useState(pending);
  const [done, setDone] = useState(false);

  const run = async () => {
    setRunning(true);
    let remaining = left;
    while (remaining > 0) {
      const res = await fetch("/api/admin/retag", { method: "POST" });
      const data = await res.json();
      if (data.done || data.remaining === 0) {
        setLeft(0);
        setDone(true);
        break;
      }
      remaining = data.remaining ?? remaining - 1;
      setLeft(remaining);
    }
    setRunning(false);
    setDone(true);
  };

  if (done || left === 0) {
    return <span className="text-xs text-stone-400">Style tags up to date</span>;
  }

  return (
    <button
      onClick={run}
      disabled={running}
      className="text-xs text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 underline underline-offset-2 transition-colors disabled:opacity-50"
    >
      {running ? `Re-tagging… ${left} left` : `Update style fields (${left} items)`}
    </button>
  );
}
