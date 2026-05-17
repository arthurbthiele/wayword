import React, { useContext, useEffect } from "react";
import { GraphContext } from "./GraphProvider";
import { logTargetPaths } from "../utilities/logTargetPaths";

type StatusStripDailyProps = {
  start: string;
  target: string;
};

export const StatusStripDaily = ({ start, target }: StatusStripDailyProps) => {
  const { graph } = useContext(GraphContext);

  useEffect(() => {
    logTargetPaths("daily", target, start);
  }, [target, start]);

  const moveCount = Math.max(0, graph.nodes.length - 1);
  const solved = graph.nodes.some(
    (node: { id: string }) => node.id === target
  );

  return (
    <div className="wj-status">
      <div className="wj-status__target">
        <span className="wj-status__label">Today</span>
        <span className="wj-status__word">{start}</span>
        <span className="wj-status__arrow">→</span>
        <span className="wj-status__word">{target}</span>
      </div>
      <div className="wj-status__meta">
        {!solved && (
          <span>
            <strong>{moveCount}</strong>{" "}
            {moveCount === 1 ? "move" : "moves"} so far
          </span>
        )}
      </div>
    </div>
  );
};
