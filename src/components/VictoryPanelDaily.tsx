import React, { useContext, useEffect, useState } from "react";
import { Button } from "./ui/Button";
import { GraphContext } from "./GraphProvider";
import { useLocalStorage } from "../utilities/useLocalStorage";
import { getLocalDateString } from "../utilities/dailyTarget";
import {
  findShortestPathInGraph,
  findShortestPathInDictionary,
  findUserPath,
} from "../utilities/findPath";
import { legitimateWords } from "../dictionaryData/legitimate";

type VictoryPanelDailyProps = {
  start: string;
  target: string;
};

export const VictoryPanelDaily = ({
  start,
  target,
}: VictoryPanelDailyProps) => {
  const today = getLocalDateString();
  const { graph } = useContext(GraphContext);

  const [solvedDate, setSolvedDate] = useLocalStorage<string | null>(
    "daily:solvedDate",
    null
  );
  const [solvedPath, setSolvedPath] = useLocalStorage<string[] | null>(
    "daily:solvedPath",
    null
  );
  const [optimalPath, setOptimalPath] = useLocalStorage<string[] | null>(
    "daily:optimalPath",
    null
  );
  const [dismissedDate, setDismissedDate] = useLocalStorage<string | null>(
    "daily:victoryDismissedDate",
    null
  );
  const [copied, setCopied] = useState(false);

  const solvedToday = solvedDate === today;
  const dismissed = dismissedDate === today;
  const userMoves = solvedPath ? solvedPath.length - 1 : 0;
  const optimalMoves = optimalPath ? optimalPath.length - 1 : null;
  const matchedOptimal =
    optimalMoves !== null && userMoves === optimalMoves;
  const beatOptimal = optimalMoves !== null && userMoves < optimalMoves;

  // When the user adds today's target to their graph, lock the solve in.
  useEffect(() => {
    if (solvedToday) return;
    const reached = graph.nodes.some(
      (node: { id: string }) => node.id === target
    );
    if (!reached) return;
    setSolvedDate(today);
    // Prefer the chronological path the user took (via parents); fall back to
    // shortest-path-through-graph for legacy graphs without parent tracking.
    const userPath =
      findUserPath(graph.parents, start, target) ??
      findShortestPathInGraph(graph.nodes, graph.edges, start, target);
    setSolvedPath(userPath);
    setOptimalPath(
      findShortestPathInDictionary(start, target, legitimateWords)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph.nodes, graph.edges, start, target, today, solvedToday]);

  if (!solvedToday || !solvedPath || dismissed) return null;

  const onCopy = async () => {
    const suffix = matchedOptimal
      ? " — common-word optimal!"
      : beatOptimal
        ? ` — beat common-word optimal of ${optimalMoves}!`
        : optimalMoves !== null
          ? ` (common-word optimal: ${optimalMoves})`
          : "";
    const text = `Word Journey ${today}: ${start.toUpperCase()} → ${target.toUpperCase()} in ${userMoves} moves${suffix}\n${solvedPath.join(" → ")}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy to clipboard:", text);
    }
  };

  const renderPath = (path: string[], extraClass: string = "") => (
    <div className={`wj-victory__path ${extraClass}`.trim()}>
      {path.map((word, index) => (
        <React.Fragment key={`${index}-${word}`}>
          {index > 0 && <span className="arrow">→</span>}
          <span>{word}</span>
        </React.Fragment>
      ))}
    </div>
  );

  const titleText = (() => {
    const word = `Solved ${target} in ${userMoves} ${userMoves === 1 ? "move" : "moves"}`;
    if (matchedOptimal) return `${word} — optimal!`;
    if (beatOptimal) return `${word} — you found a shortcut!`;
    return word;
  })();

  const subtitleText = (() => {
    if (matchedOptimal || optimalMoves === null) return null;
    if (beatOptimal) {
      return `You routed through less common words to beat the common-word optimal of ${optimalMoves}.`;
    }
    return `Common-word optimal was ${optimalMoves} ${optimalMoves === 1 ? "move" : "moves"}.`;
  })();

  const commonWordExplainer = `Shortest path from '${start}' to '${target}' using only common everyday words. You can sometimes find a shorter route by routing through less common ones.`;

  return (
    <div className="wj-victory">
      <button
        type="button"
        className="wj-victory__close"
        onClick={() => setDismissedDate(today)}
        aria-label="Dismiss"
      >
        ×
      </button>
      <div className="wj-victory__headline">
        <div>
          <div className="wj-victory__title">{titleText}</div>
          {subtitleText && (
            <div className="wj-victory__subtitle">{subtitleText}</div>
          )}
        </div>
        <div className="wj-victory__actions">
          <Button variant="primary" size="small" onClick={onCopy}>
            {copied ? "Copied!" : "Copy result"}
          </Button>
        </div>
      </div>

      <div>
        <span className="wj-victory__path-label">Your path</span>
        {renderPath(solvedPath)}
      </div>

      {optimalPath && !matchedOptimal && (
        <div>
          <span
            className="wj-victory__path-label"
            title={commonWordExplainer}
          >
            Common-word optimal <span aria-hidden="true">ⓘ</span>
          </span>
          {renderPath(optimalPath, "wj-victory__path--optimal")}
        </div>
      )}
    </div>
  );
};
