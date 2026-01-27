"use client";

import { useEffect, useMemo, useState } from "react";
import { FEARS } from "../../lib/fears";

const KEY = "fear_shuffle_v1";

function shuffle<T>(arr: T[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Page() {
  const [fearId, setFearId] = useState<number | null>(null);

  const fear = useMemo(() => {
    if (fearId == null) return null;
    return FEARS.find(f => f.id === fearId) ?? null;
  }, [fearId]);

  function nextFear() {
    // Queue of ids in random order
    const ids = FEARS.map(f => f.id);

    let state: { queue: number[]; idx: number };
    try {
      state = JSON.parse(localStorage.getItem(KEY) || "");
    } catch {
      state = { queue: [], idx: 0 };
    }

    // (Re)build queue if missing or finished
    if (!state.queue?.length || state.idx >= state.queue.length) {
      state = { queue: shuffle(ids), idx: 0 };
    }

    const id = state.queue[state.idx];
    state.idx += 1;

    localStorage.setItem(KEY, JSON.stringify(state));
    setFearId(id);
  }

  useEffect(() => {
    nextFear(); // pick one on first load
  }, []);

  if (!fear) return null;

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, fontFamily: "system-ui" }}>
      <div style={{ maxWidth: 900, width: "100%", lineHeight: 1.6 }}>
        <div style={{ opacity: 0.6, marginBottom: 10 }}>
          FRYKT NR. {fear.id} av {FEARS.length}
        </div>

        <h1 style={{ fontSize: 42, margin: 0 }}>{fear.title}</h1>

        <p style={{ fontSize: 20, marginTop: 24, whiteSpace: "pre-wrap", overflowWrap: "break-word" }}>
          {fear.description}
        </p>

        <button
          onClick={nextFear}
          style={{
            display: "inline-block",
            marginTop: 40,
            padding: "10px 16px",
            border: "1px solid #ccc",
            borderRadius: 10,
            background: "transparent",
            color: "inherit",
            cursor: "pointer",
          }}
        >
          Ny frykt
        </button>
      </div>
    </main>
  );
}
