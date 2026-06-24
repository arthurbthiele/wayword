import React, { useContext, useEffect, useState } from "react";
import { GraphContext } from "./GraphProvider";
import { logTargetPaths } from "../utilities/logTargetPaths";
import { getDayNumber } from "../utilities/dailyTarget";
import { computeHint } from "../utilities/computeHint";
import { displayWord } from "../utilities/displayWord";
import { Button } from "./ui/Button";

type StatusStripDailyProps = {
  // Date the puzzle "belongs to" — used for the displayed day number so
  // a late-night solver sees the started-day's number, not the new one.
  puzzleDate: string;
  start: string;
  target: string;
  hintsUsed: number;
  onHintUsed: () => void;
  // When defined, render a "Show result" button in the meta slot — App
  // passes this only when the puzzle is solved and the victory panel was
  // dismissed, so the user has a discoverable way back to the share UI.
  onShowResult?: () => void;
};

export const StatusStripDaily = ({
  puzzleDate,
  start,
  target,
  hintsUsed,
  onHintUsed,
  onShowResult,
}: StatusStripDailyProps) => {
  const { graph, selectedWord } = useContext(GraphContext);

  useEffect(() => {
    logTargetPaths("daily", target, start);
  }, [target, start]);

  // Hint text is shown until the user adds another word (i.e. nodes.length
  // changes), at which point we clear it and they can ask for another.
  const [revealedHint, setRevealedHint] = useState<{
    word: string;
    message: string;
  } | null>(null);
  const nodeCount = graph.nodes.length;
  useEffect(() => {
    setRevealedHint(null);
  }, [nodeCount]);

  const moveCount = Math.max(0, nodeCount - 1);
  const solved = graph.nodes.some(
    (node: { id: string }) => node.id === target
  );
  const dayNumber = getDayNumber(puzzleDate);

  const askForHint = () => {
    const nodeIds = graph.nodes.map((n: { id: string }) => n.id);
    const hint = computeHint(start, target, selectedWord, nodeIds);
    if (!hint) return;
    // Only count this as a "new" hint use if we're revealing a different
    // word than what's already on screen. Repeatedly clicking the button
    // without changing context shouldn't inflate the count.
    if (hint.word !== revealedHint?.word) onHintUsed();
    setRevealedHint(hint);
  };

  return (
    <div className="wj-status">
      <div className="wj-status__target">
        <span className="wj-status__label">#{dayNumber}</span>
        <span className="wj-status__word">{displayWord(start)}</span>
        <span className="wj-status__arrow">→</span>
        <span className="wj-status__word">{displayWord(target)}</span>
      </div>
      <div className="wj-status__meta">
        {onShowResult ? (
          <Button variant="primary" size="small" onClick={onShowResult}>
            Show result
          </Button>
        ) : (
          !solved && (
            <>
              {revealedHint ? (
                <span className="wj-status__hint">{revealedHint.message}</span>
              ) : (
                <span>
                  <strong>{moveCount}</strong>{" "}
                  {moveCount === 1 ? "move" : "moves"} so far
                  {hintsUsed > 0 && (
                    <span className="wj-status__hint-count">
                      {" · "}
                      {hintsUsed} {hintsUsed === 1 ? "hint" : "hints"}
                    </span>
                  )}
                </span>
              )}
              <Button
                variant="ghost"
                size="small"
                onClick={askForHint}
                aria-label="Hint"
              >
                Hint
              </Button>
            </>
          )
        )}
      </div>
    </div>
  );
};
