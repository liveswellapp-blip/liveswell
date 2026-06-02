import { useState, useEffect } from "react";
import { RefreshCw, Check } from "lucide-react";

type State = "idle" | "spinning" | "done";

function Demo({ label, initState }: { label: string; initState: State }) {
  const [state, setState] = useState<State>(initState);

  function trigger() {
    if (state !== "idle") return;
    setState("spinning");
    setTimeout(() => {
      setState("done");
      setTimeout(() => setState("idle"), 1800);
    }, 1600);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* The button itself */}
      <button
        onClick={trigger}
        disabled={state === "spinning"}
        style={{
          background:
            state === "done"
              ? "rgba(16,185,129,0.18)"
              : "rgba(255,255,255,0.05)",
          border:
            state === "done"
              ? "1px solid rgba(16,185,129,0.4)"
              : "1px solid rgba(255,255,255,0.1)",
          transition: "all 0.3s ease",
        }}
        className="w-8 h-8 rounded-full flex items-center justify-center"
        aria-label="Refresh data"
      >
        {state === "done" ? (
          <Check size={13} className="text-emerald-400" />
        ) : (
          <RefreshCw
            size={13}
            className={`text-slate-400 ${state === "spinning" ? "animate-spin" : ""}`}
          />
        )}
      </button>
      <span className="text-slate-600 text-[9px] uppercase tracking-wider">{label}</span>
    </div>
  );
}

export default function RefreshButton() {
  return (
    <div
      className="flex items-center justify-center gap-0"
      style={{
        width: 420,
        height: 200,
        background: "linear-gradient(160deg,#030f1c 0%,#041a2e 100%)",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Context strip showing where it lives */}
      <div className="flex flex-col gap-5 items-center w-full px-8">
        <p className="text-slate-600 text-[9px] uppercase tracking-widest">Tap to see each state</p>

        {/* Header mock showing placement */}
        <div
          className="w-full rounded-xl px-4 py-3 flex items-center justify-between"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px #34d399" }} />
            <span className="text-emerald-400 text-[11px] font-bold tracking-widest uppercase">Jacksonville Beach</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-600 text-[9px]">Updated 2 min ago</span>
            <Demo label="" initState="idle" />
          </div>
        </div>

        {/* Three isolated states for reference */}
        <div className="flex items-end gap-8">
          <Demo label="Idle" initState="idle" />
          <Demo label="Loading" initState="spinning" />
          <Demo label="Done" initState="done" />
        </div>
      </div>
    </div>
  );
}
