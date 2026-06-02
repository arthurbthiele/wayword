import React, { useState } from "react";

// Dev-only panel for testing the daily puzzle picker against different
// difficulties / seeds. Shows when `?dev=1` is in the URL; entirely
// hidden in normal production use. Not meant to be styled prettily.

type DevPanelProps = {
  currentOverride: { start: string; target: string; optimalMoves: number } | null;
  onReroll: (difficulty: number | undefined) => void;
  onClearOverride: () => void;
};

export const DevPanel = ({
  currentOverride,
  onReroll,
  onClearOverride,
}: DevPanelProps) => {
  // Default to no constraint — picker chooses any difficulty in [4, 7].
  const [difficulty, setDifficulty] = useState<number | "">("");

  const handleReroll = () => {
    const d = typeof difficulty === "number" ? difficulty : undefined;
    onReroll(d);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "50%",
        right: 12,
        transform: "translateY(-50%)",
        zIndex: 1000,
        padding: 12,
        background: "#fdf4d8",
        border: "1px solid #b88",
        borderRadius: 6,
        fontFamily: "ui-monospace, Menlo, monospace",
        fontSize: 12,
        color: "#1f2533",
        boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        minWidth: 220,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Dev panel</div>
      {currentOverride ? (
        <div style={{ marginBottom: 8, color: "#9b3b2c" }}>
          Override active: <b>{currentOverride.start}</b> →{" "}
          <b>{currentOverride.target}</b>{" "}
          <span style={{ color: "#5d6273" }}>
            ({currentOverride.optimalMoves} moves optimal)
          </span>
        </div>
      ) : (
        <div style={{ marginBottom: 8, color: "#5d6273" }}>
          No override — showing real daily.
        </div>
      )}
      <div style={{ marginBottom: 6 }}>
        <label>
          Difficulty:{" "}
          <input
            type="number"
            min={4}
            max={7}
            value={difficulty}
            placeholder="any"
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") setDifficulty("");
              else setDifficulty(Math.max(4, Math.min(7, Number(v))));
            }}
            style={{ width: 60 }}
          />{" "}
          <span style={{ color: "#5d6273" }}>(blank = any 4-7)</span>
        </label>
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button type="button" onClick={handleReroll}>
          New random daily
        </button>
        {currentOverride && (
          <button type="button" onClick={onClearOverride}>
            Clear override
          </button>
        )}
      </div>
    </div>
  );
};
