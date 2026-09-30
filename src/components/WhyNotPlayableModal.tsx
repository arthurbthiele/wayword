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
        Like Wordle and other similar games, Wayword uses a small list of
        target words (and guarantees a common-word path between the targets),
        and a much larger list of words players are allowed to input. I try to
        keep that larger list generous but not bottomless: if a well-read
        player might reasonably know a word, it's probably in - if it's
        obsolete, or only really exists in Scrabble dictionaries, it's
        probably not.
      </p>

      <p>
        That list has grown a lot thanks to player suggestions - as of
        September 2026, every word suggested through the feedback form that
        clears that bar has been added. So if you've found a word you think
        should be included but isn't, please let me know in the{" "}
        <a
          href="https://forms.gle/KmDLHJ3Mas3kzcjz7"
          target="_blank"
          rel="noopener noreferrer"
        >
          feedback form
        </a>{" "}
        - it'll very likely make it in. And if you have broader suggestions for
        how the game itself could work better, I'd love to hear them at{" "}
        <a href="mailto:feedback@wayword.fun">feedback@wayword.fun</a>.
      </p>
    </div>
  </Modal>
);
