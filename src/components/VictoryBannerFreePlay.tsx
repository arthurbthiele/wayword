import React from "react";

export type FreePlayHit = {
  target: string;
  /**
   * The chronological path the user actually took, reconstructed from each
   * word's parent (the word selected when they typed it).
   */
  userPath: string[];
  /**
   * The "qualifying" chain — the shortest path through the full dictionary
   * from any of the user's graph nodes (at pick time) to the target. The
   * puzzle the difficulty-N pick implicitly set.
   */
  qualifyingPath: string[] | null;
};

type VictoryBannerFreePlayProps = {
  hit: FreePlayHit | null;
  onClose: () => void;
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

export const VictoryBannerFreePlay = ({
  hit,
  onClose,
}: VictoryBannerFreePlayProps) => {
  if (!hit) return null;

  const userMoves = Math.max(0, hit.userPath.length - 1);
  const qualifyingMoves = hit.qualifyingPath
    ? Math.max(0, hit.qualifyingPath.length - 1)
    : null;

  const qualifyingExplainer =
    "Shortest chain from your graph to the target through the full dictionary at the moment the target was picked. This is the puzzle the difficulty rolled.";

  return (
    <div className="wj-victory">
      <button
        type="button"
        className="wj-victory__close"
        onClick={onClose}
        aria-label="Dismiss"
      >
        ×
      </button>
      <div className="wj-victory__headline">
        <div>
          <div className="wj-victory__title">
            Reached {hit.target} in {userMoves}{" "}
            {userMoves === 1 ? "move" : "moves"}
          </div>
        </div>
      </div>

      {hit.userPath.length > 1 && (
        <div>
          <span className="wj-victory__path-label">Your path</span>
          {renderPath(hit.userPath)}
        </div>
      )}

      {hit.qualifyingPath && hit.qualifyingPath.length > 1 && (
        <div>
          <span
            className="wj-victory__path-label"
            title={qualifyingExplainer}
          >
            Qualifying chain ({qualifyingMoves}{" "}
            {qualifyingMoves === 1 ? "move" : "moves"}){" "}
            <span aria-hidden="true">ⓘ</span>
          </span>
          {renderPath(hit.qualifyingPath, "wj-victory__path--optimal")}
        </div>
      )}
    </div>
  );
};
