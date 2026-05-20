import React, { useContext, useEffect } from "react";
import { GraphContext } from "./GraphProvider";
import { logTargetPaths } from "../utilities/logTargetPaths";
import { getDayNumber } from "../utilities/dailyTarget";
import { Button } from "./ui/Button";

type StatusStripDailyProps = {
  start: string;
  target: string;
  // When defined, render a "Show result" button in the meta slot — App
  // passes this only when the puzzle is solved and the victory panel was
  // dismissed, so the user has a discoverable way back to the share UI.
  onShowResult?: () => void;
};

export const StatusStripDaily = ({
  start,
  target,
  onShowResult,
}: StatusStripDailyProps) => {
  const { graph } = useContext(GraphContext);

  useEffect(() => {
    logTargetPaths("daily", target, start);
  }, [target, start]);

  const moveCount = Math.max(0, graph.nodes.length - 1);
  const solved = graph.nodes.some(
    (node: { id: string }) => node.id === target
  );
  const dayNumber = getDayNumber();

  return (
    <div className="wj-status">
      <div className="wj-status__target">
        <span className="wj-status__label">#{dayNumber}</span>
        <span className="wj-status__word">{start}</span>
        <span className="wj-status__arrow">→</span>
        <span className="wj-status__word">{target}</span>
      </div>
      <div className="wj-status__meta">
        {onShowResult ? (
          <Button variant="primary" size="small" onClick={onShowResult}>
            Show result
          </Button>
        ) : (
          !solved && (
            <span>
              <strong>{moveCount}</strong>{" "}
              {moveCount === 1 ? "move" : "moves"} so far
            </span>
          )
        )}
      </div>
    </div>
  );
};
