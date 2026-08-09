import React from "react";
import { Modal } from "./ui/Modal";

type WhyNotPlayableModalProps = {
  open: boolean;
  onClose: () => void;
};

export const WhyNotPlayableModal = ({
  open,
  onClose,
}: WhyNotPlayableModalProps) => (
  <Modal open={open} onClose={onClose} ariaLabel="Why isn't every real word playable?">
    <div className="wj-help">
      <h2>Why isn't every real word playable?</h2>

      <p>
        Long story short, because a word-ladder game gets worse if you allow
        everything that anyone has ever called a word.
      </p>

      <p>
        In early playtesting for Wayword, I started with a much bigger
        dictionary (~200k valid words). While it meant basically no-one ran
        into the
        issue of 'wait, why isn't the game recognising my word?', it had other
        downsides. The winning strategy for tricky puzzles became typing
        random letters to see what connected, and the shortest paths would run
        through things like <em>mho</em> (an obsolete unit of electrical
        conductance), <em>eth</em> (an old English letter), and <em>cit</em>{" "}
        (a 1600s-era derogatory word for a city dweller).
      </p>

      <p>
        That could still be a game - a fun one, even! - but it's not the game I
        wanted to make. Including so many words - especially short ones - that
        most people wouldn't recognise as words, warps the game a lot by
        connecting large clusters of words in ways that aren't findable for
        even very-well-read players. The game I wanted to make is about finding
        creative paths within reasonably-common words, and the current
        dictionary design works well for that.
      </p>

      <p>
        Like Wordle and other similar games, the current version of Wayword
        uses a small list of target words (and guarantees a common-word path
        between the targets), and a larger list of words the players are
        allowed to input - but importantly, I try to keep that larger list
        small enough that there's a minimum standard of recognisability for
        each word.
      </p>

      <p>
        If you've found a word you think should be included but isn't, please
        let me know in the{" "}
        <a
          href="https://forms.gle/KmDLHJ3Mas3kzcjz7"
          target="_blank"
          rel="noopener noreferrer"
        >
          feedback form
        </a>
        . And if you have broader suggestions for how the game itself could
        work better, let me know at{" "}
        <a href="mailto:feedback@wayword.fun">feedback@wayword.fun</a> - as long
        as the suggestion isn't 'have a much larger dictionary' - we've tried
        that, doesn't work super well.
      </p>
    </div>
  </Modal>
);
