import React from "react";
import { Button } from "./ui/Button";
import { clearLocalStorage } from "../utilities/useLocalStorage";

export type GameMode = "daily" | "freeplay";

type HeaderProps = {
  mode: GameMode;
  setMode: (mode: GameMode) => void;
  onOpenHelp: () => void;
};

export const Header = ({ mode, setMode, onOpenHelp }: HeaderProps) => {
  const onReset = () => {
    const prefix = mode === "daily" ? "daily:" : "freeplay:";
    const label =
      mode === "daily"
        ? "Reset your daily-challenge progress for today? Your free-play state is not affected."
        : "Reset your free-play graph, score, and current target? Your daily state is not affected.";
    if (window.confirm(label)) {
      clearLocalStorage(prefix);
      window.location.reload();
    }
  };

  return (
    <header className="wj-header">
      <h1 className="wj-header__brand">
        word <span>journey</span>
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
          aria-pressed={mode === "freeplay"}
          onClick={() => setMode("freeplay")}
        >
          Free play
        </button>
      </div>

      <div className="wj-header__actions">
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
