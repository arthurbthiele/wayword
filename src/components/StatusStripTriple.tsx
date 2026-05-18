import React, { useContext, useEffect } from "react";
import { GraphContext } from "./GraphProvider";
import { logTargetPaths } from "../utilities/logTargetPaths";
import { getDayNumber } from "../utilities/dailyTarget";

type StatusStripTripleProps = {
  start: string;
  t1: string;
  t2: string;
};

export const StatusStripTriple = ({
  start,
  t1,
  t2,
}: StatusStripTripleProps) => {
  const { graph } = useContext(GraphContext);

  useEffect(() => {
    // Log the optimal sub-paths to the console for debugging — same pattern
    // as daily / free play, where this helps diagnose puzzle generation.
    logTargetPaths("triple", t1, start);
    logTargetPaths("triple", t2, start);
  }, [start, t1, t2]);

  const reachedT1 = graph.nodes.some(
    (node: { id: string }) => node.id === t1
  );
  const reachedT2 = graph.nodes.some(
    (node: { id: string }) => node.id === t2
  );
  const solved = reachedT1 && reachedT2;
  const moveCount = Math.max(0, graph.nodes.length - 1);
  const dayNumber = getDayNumber();

  const renderTarget = (word: string, reached: boolean) => (
    <span
      className={`wj-status__word wj-status__triple-target${
        reached ? " wj-status__triple-target--reached" : ""
      }`}
    >
      {word}
      {reached && (
        <span className="wj-status__check" aria-hidden="true">
          ✓
        </span>
      )}
    </span>
  );

  return (
    <div className="wj-status wj-status--triple">
      <div className="wj-status__row">
        <div className="wj-status__target">
          <span className="wj-status__label">Triple #{dayNumber}</span>
          <span className="wj-status__word">{start}</span>
          <span className="wj-status__arrow">→</span>
          <span className="wj-status__triple-targets">
            {renderTarget(t1, reachedT1)}
            <span className="wj-status__triple-comma">,</span>
            {renderTarget(t2, reachedT2)}
          </span>
        </div>
        <div className="wj-status__meta">
          {!solved && (
            <span>
              <strong>{moveCount}</strong>{" "}
              {moveCount === 1 ? "word" : "words"} added
            </span>
          )}
        </div>
      </div>
      <div className="wj-status__hint">
        Reach both targets with as few added words as possible.
      </div>
    </div>
  );
};
