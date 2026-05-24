import React, { useEffect, useState } from "react";

// Animated explainer for the help modal. Demonstrates the three edit
// operations *and* the click-to-select branching (which was the most
// commonly-missed mechanic on the Tumblr launch).
//
// Layout: a 400×200 SVG-coordinate space holding nodes at fixed positions.
// Edges are SVG <line>s; nodes and the fake cursor are absolutely-
// positioned HTML elements at percentage coordinates that match the SVG
// space, so the whole thing scales together with the container width.

type Step = {
  nodesPresent: readonly string[];
  selected: string;
  caption: string;
  cursorAt: string | null;
  /** Override default step duration. Used to hold longer on the payoff. */
  durationMs?: number;
};

const POSITIONS: Record<string, { x: number; y: number }> = {
  kid: { x: 60, y: 60 },
  kind: { x: 150, y: 60 },
  wind: { x: 240, y: 60 },
  win: { x: 330, y: 60 },
  find: { x: 150, y: 150 },
};

const ALL_EDGES: [string, string][] = [
  ["kid", "kind"],
  ["kind", "wind"],
  ["wind", "win"],
  ["kind", "find"],
];

const steps: readonly Step[] = [
  {
    nodesPresent: ["kid"],
    selected: "kid",
    caption: "Start with the puzzle's first word",
    cursorAt: null,
  },
  {
    nodesPresent: ["kid", "kind"],
    selected: "kind",
    caption: "Add a letter",
    cursorAt: null,
  },
  {
    nodesPresent: ["kid", "kind", "wind"],
    selected: "wind",
    caption: "Change a letter",
    cursorAt: null,
  },
  {
    nodesPresent: ["kid", "kind", "wind", "win"],
    selected: "win",
    caption: "Or remove a letter",
    cursorAt: null,
  },
  {
    nodesPresent: ["kid", "kind", "wind", "win"],
    selected: "win",
    caption: "Click any word to branch from there…",
    cursorAt: "kind",
  },
  {
    nodesPresent: ["kid", "kind", "wind", "win"],
    selected: "kind",
    caption: "Click any word to branch from there…",
    cursorAt: "kind",
  },
  {
    nodesPresent: ["kid", "kind", "wind", "win", "find"],
    selected: "find",
    caption: "Now your next word branches from 'kind'",
    cursorAt: null,
    // Hold an extra beat on the payoff before the loop restarts.
    durationMs: 4000,
  },
];

const STEP_DURATION_MS = 2400;
const VIEWBOX_W = 400;
const VIEWBOX_H = 200;

const toPercent = (x: number, y: number) => ({
  left: `${(x / VIEWBOX_W) * 100}%`,
  top: `${(y / VIEWBOX_H) * 100}%`,
});

export const AnimatedExplainer = () => {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const duration = steps[stepIndex].durationMs ?? STEP_DURATION_MS;
    const timeout = window.setTimeout(() => {
      setStepIndex((current) => (current + 1) % steps.length);
    }, duration);
    return () => window.clearTimeout(timeout);
  }, [stepIndex]);

  const step = steps[stepIndex];
  const visibleEdges = ALL_EDGES.filter(
    ([from, to]) =>
      step.nodesPresent.includes(from) && step.nodesPresent.includes(to)
  );

  // Cursor parks just off the top-right corner when not active. Always
  // rendered so its position transitions cleanly between steps.
  const cursorPos = step.cursorAt
    ? POSITIONS[step.cursorAt]
    : { x: VIEWBOX_W + 30, y: -20 };
  // Nudge the cursor's tip onto the node's bottom-right edge so it reads
  // as "about to click" rather than perfectly centred over the word.
  const cursorShifted = { x: cursorPos.x + 14, y: cursorPos.y + 12 };

  return (
    <div className="wj-explainer">
      <div className="wj-explainer__canvas">
        <svg
          className="wj-explainer__svg"
          viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          {visibleEdges.map(([from, to]) => {
            const a = POSITIONS[from];
            const b = POSITIONS[to];
            return (
              <line
                key={`${from}-${to}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className="wj-explainer__edge"
              />
            );
          })}
        </svg>
        {step.nodesPresent.map((word) => {
          const pos = POSITIONS[word];
          const isSelected = step.selected === word;
          return (
            <div
              key={word}
              className={`wj-explainer__node${
                isSelected ? " wj-explainer__node--active" : ""
              }`}
              style={toPercent(pos.x, pos.y)}
            >
              {word}
            </div>
          );
        })}
        <div
          className={`wj-explainer__cursor${
            step.cursorAt ? "" : " wj-explainer__cursor--hidden"
          }`}
          style={toPercent(cursorShifted.x, cursorShifted.y)}
          aria-hidden="true"
        >
          👆
        </div>
      </div>
      <div className="wj-explainer__caption">{step.caption}</div>
    </div>
  );
};
