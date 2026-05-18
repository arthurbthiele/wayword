import React from "react";
import { Button } from "./ui/Button";
import { clearLocalStorage } from "../utilities/useLocalStorage";

export type GameMode = "daily" | "freeplay" | "triple";

type HeaderProps = {
  mode: GameMode;
  setMode: (mode: GameMode) => void;
  onOpenHelp: () => void;
  onOpenStats: () => void;
  streak?: number;
};

export const Header = ({
  mode,
  setMode,
  onOpenHelp,
  onOpenStats,
  streak,
}: HeaderProps) => {
  const onReset = () => {
    const resetConfig = {
      daily: {
        prefix: "daily:",
        label:
          "Reset your Daily progress for today? Triple and Free play state are not affected.",
      },
      freeplay: {
        prefix: "freeplay:",
        label:
          "Reset your Free play graph, score, and current target? Daily modes are not affected.",
      },
      triple: {
        prefix: "triple:",
        label:
          "Reset your Triple progress for today? Daily and Free play state are not affected.",
      },
    }[mode];
    if (window.confirm(resetConfig.label)) {
      clearLocalStorage(resetConfig.prefix);
      window.location.reload();
    }
  };

  return (
    <header className="wj-header">
      <h1 className="wj-header__brand">
        way<span>word</span>
      </h1>

      <div className="wj-mode-toggle" role="tablist" aria-label="Game mode">
        <button
          type="button"
          role="tab"
          aria-pressed={mode === "daily"}
          onClick={() => setMode("daily")}
        >
          Daily
        </button>
        <button
          type="button"
          role="tab"
          aria-pressed={mode === "triple"}
          onClick={() => setMode("triple")}
        >
          Triple
        </button>
        <button
          type="button"
          role="tab"
          aria-pressed={mode === "freeplay"}
          onClick={() => setMode("freeplay")}
        >
          Free play
        </button>
      </div>

      <div className="wj-header__actions">
        <Button variant="ghost" size="small" onClick={onOpenStats}>
          {streak && streak > 0 ? `Streak ${streak}` : "Stats"}
        </Button>
        <button
          type="button"
          className="wj-header__icon-button"
          onClick={onOpenHelp}
          aria-label="How to play"
          title="How to play"
        >
          ?
        </button>
        <Button variant="ghost" size="small" onClick={onReset}>
          Reset
        </Button>
      </div>
    </header>
  );
};
