import React from "react";
import { Modal } from "./ui/Modal";
import { AnimatedExplainer } from "./AnimatedExplainer";

type HelpModalProps = {
  open: boolean;
  onClose: () => void;
};

export const HelpModal = ({ open, onClose }: HelpModalProps) => (
  <Modal open={open} onClose={onClose} ariaLabel="How to play">
    <div className="wj-help">
      <h2>How to play</h2>
      <p>
        Build a chain of words from a starting word to a target. Each new
        word must be one letter different from a word already in your graph
        — by <b>adding</b>, <b>removing</b>, or <b>changing</b> a single
        letter.
      </p>

      <AnimatedExplainer />

      <h3>Daily</h3>
      <p>
        A fresh start word and target word every day. Get from one to the
        other in as few moves as you can — when you solve it, you'll see
        your path and the common-word optimal.
      </p>

      <h3>Free play</h3>
      <p>
        Open-ended exploration starting from 'a'. A new target appears at
        your chosen difficulty; reach it to score points (the harder the
        difficulty, the more points) and a new target is picked.
      </p>

      <h3>Tips</h3>
      <ul>
        <li>Click any word in your graph to select it — your next word will branch from there.</li>
        <li>Scroll to zoom; double-click to recentre.</li>
        <li>Your progress is saved in your browser. Use Reset to start over.</li>
      </ul>

      <p style={{ marginTop: 24, fontSize: 13, color: "var(--color-ink-muted)" }}>
        Feedback or word suggestions? <a href="https://forms.gle/KmDLHJ3Mas3kzcjz7">Use this form</a> or
        email arthurbthiele@gmail.com.
      </p>
    </div>
  </Modal>
);
