import React from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";

type FreePlayIntroModalProps = {
  open: boolean;
  onClose: () => void;
};

export const FreePlayIntroModal = ({
  open,
  onClose,
}: FreePlayIntroModalProps) => (
  <Modal open={open} onClose={onClose} ariaLabel="Welcome to Free play">
    <div className="wj-help">
      <h2>Welcome to Free play</h2>
      <p>
        Unlike Daily, you're not following a single chain — you're building
        a <b>web</b>. <b>Tap any word</b> in your graph to grow from there.
      </p>
      <p>
        Targets rotate as you reach them; your graph keeps growing across
        targets until you Reset.
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button variant="primary" size="small" onClick={onClose}>
          Got it
        </Button>
      </div>
    </div>
  </Modal>
);
