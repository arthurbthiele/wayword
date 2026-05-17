import React from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";

export type FreePlayHit = {
  target: string;
  /**
   * The chronological path the user actually took, reconstructed from each
   * word's parent (the word that was selected when they typed it). May fall
   * back to just [target] on legacy graphs that pre-date parent tracking.
   */
  userPath: string[];
  /**
   * The "qualifying" chain — the shortest path through the full dictionary
   * from any of the user's graph nodes (at pick time) to the target. This is
   * the puzzle the difficulty-N pick implicitly set.
   */
  qualifyingPath: string[] | null;
};

type VictoryModalFreePlayProps = {
  hit: FreePlayHit | null;
  onClose: () => void;
};

const renderPath = (path: string[], extraClass: string = "") => (
  <div className={`wj-victory-modal__path ${extraClass}`.trim()}>
    {path.map((word, index) => (
      <React.Fragment key={`${index}-${word}`}>
        {index > 0 && <span className="wj-victory-modal__arrow">→</span>}
        <span>{word}</span>
      </React.Fragment>
    ))}
  </div>
);

export const VictoryModalFreePlay = ({
  hit,
  onClose,
}: VictoryModalFreePlayProps) => {
  if (!hit) return null;

  const userMoves = Math.max(0, hit.userPath.length - 1);
  const qualifyingMoves = hit.qualifyingPath
    ? Math.max(0, hit.qualifyingPath.length - 1)
    : null;

  return (
    <Modal open={true} onClose={onClose} ariaLabel="Target reached">
      <div className="wj-victory-modal">
        <div className="wj-victory-modal__eyebrow">Target reached</div>
        <h2 className="wj-victory-modal__title">{hit.target}</h2>
        <div className="wj-victory-modal__moves">
          {userMoves} {userMoves === 1 ? "move" : "moves"} from 'a' along your
          path
        </div>

        {hit.userPath.length > 1 && (
          <div className="wj-victory-modal__section">
            <span className="wj-victory-modal__label">Your path</span>
            {renderPath(hit.userPath)}
          </div>
        )}

        {hit.qualifyingPath && hit.qualifyingPath.length > 1 && (
          <div className="wj-victory-modal__section">
            <span
              className="wj-victory-modal__label"
              title="Shortest chain from your graph to the target when it was picked. The difficulty was based on this length."
            >
              Qualifying chain ({qualifyingMoves}{" "}
              {qualifyingMoves === 1 ? "move" : "moves"}){" "}
              <span aria-hidden="true">ⓘ</span>
            </span>
            {renderPath(
              hit.qualifyingPath,
              "wj-victory-modal__path--qualifying"
            )}
          </div>
        )}

        <div className="wj-victory-modal__actions">
          <Button variant="primary" onClick={onClose}>
            Keep playing
          </Button>
        </div>
      </div>
    </Modal>
  );
};
