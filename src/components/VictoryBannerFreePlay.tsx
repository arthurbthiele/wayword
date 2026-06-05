import React from "react";

export type FreePlayHit = {
  target: string;
  /**
   * The shortest path through the user's graph from any pick-time node
   * to this target. Reflects the best route the player has available,
   * not necessarily the chronological order they added words.
   */
  userPath: string[];
  /**
   * Shortest legitimate-only path from any pick-time graph node to the
   * target. Same framing as daily's "common-word optimal" — a fair
   * comparison composed of words the player would recognise.
   */
  optimalPath: string[] | null;
  /**
   * Optional celebratory message: set when this hit cleared the last
   * available target at the current difficulty.
   */
  milestone?: string;
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
  const showOptimal =
    hit.optimalPath !== null &&
    hit.optimalPath.length > 1 &&
    // Don't double-show the same chain.
    hit.optimalPath.join("→") !== hit.userPath.join("→");

  const optimalExplainer = `From the closest common word in your graph to '${hit.target}', using only common English words. If yours was shorter, you found a shortcut through rarer words — nice work!`;

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
            {hit.milestone ? " — congrats!" : ""}
          </div>
          {hit.milestone && (
            <div className="wj-victory__subtitle wj-victory__milestone">
              🎉 {hit.milestone}
            </div>
          )}
        </div>
      </div>

      {hit.userPath.length > 1 && (
        <div>
          <span className="wj-victory__path-label">Your path</span>
          {renderPath(hit.userPath)}
        </div>
      )}

      {showOptimal && hit.optimalPath && (
        <div>
          <span className="wj-victory__path-label" title={optimalExplainer}>
            Shortest path from your graph <span aria-hidden="true">ⓘ</span>
          </span>
          {renderPath(hit.optimalPath, "wj-victory__path--optimal")}
        </div>
      )}
    </div>
  );
};
