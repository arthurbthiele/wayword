import React from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";

export type FreePlayHit = {
  target: string;
  path: string[];
};

type VictoryModalFreePlayProps = {
  hit: FreePlayHit | null;
  onClose: () => void;
};

export const VictoryModalFreePlay = ({
  hit,
  onClose,
}: VictoryModalFreePlayProps) => {
  if (!hit) return null;

  const moves = Math.max(0, hit.path.length - 1);

  return (
    <Modal
      open={true}
      onClose={onClose}
      ariaLabel="Target reached"
    >
      <div className="wj-victory-modal">
        <div className="wj-victory-modal__eyebrow">Target reached</div>
        <h2 className="wj-victory-modal__title">{hit.target}</h2>
        <div className="wj-victory-modal__moves">
          in {moves} {moves === 1 ? "move" : "moves"} from 'a'
        </div>

        {hit.path.length > 0 && (
          <div className="wj-victory-modal__path">
            {hit.path.map((word, index) => (
              <React.Fragment key={`${index}-${word}`}>
                {index > 0 && (
                  <span className="wj-victory-modal__arrow">→</span>
                )}
                <span>{word}</span>
              </React.Fragment>
            ))}
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
