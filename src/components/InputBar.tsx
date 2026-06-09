import React, { useContext, useEffect, useRef, useState } from "react";
import { getWordGraph } from "../dictionaryData/wordGraphRef";
import { getDisconnectedValidWords } from "../dictionaryData/disconnectedValidWordsRef";
import { wordsAreConnected } from "../utilities/wordAreConnected";
import { GraphContext } from "./GraphProvider";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { DefinitionModal } from "./DefinitionModal";
import { displayWord } from "../utilities/displayWord";

type InputBarProps = {
  targetReminder?: string | null;
  // Defaults to true (the historical behaviour). App passes `false` when the
  // InputBar is re-mounting after the user dismissed the victory panel — so
  // the soft keyboard doesn't pop up over the graph the user wants to inspect.
  autoFocus?: boolean;
  // When true, mirror the typed string into the graph's matchQuery so the
  // canvas can fade non-matching nodes. Used in free play, where the graph
  // can grow large enough that "find words containing 'eed'" is useful.
  substringHighlight?: boolean;
};

export const InputBar = ({
  targetReminder,
  autoFocus = true,
  substringHighlight = false,
}: InputBarProps) => {
  const { selectedWord, setSelectedWord, graph, setGraph, setMatchQuery } =
    useContext(GraphContext);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [lookupWord, setLookupWord] = useState<string | null>(null);

  // Focus the input whenever the selected word changes — i.e. when the
  // user clicks a node in the graph (or types-to-jump to an existing word).
  // Skip the very first render so the initial-mount focus is driven by the
  // `autoFocus` prop and we don't override it (e.g. after dismissing the
  // victory panel, where we deliberately don't auto-focus).
  // Requested by @normalhorse on Tumblr.
  //
  // Desktop-only on purpose: on mobile (coarse pointer), iOS Safari blurs
  // the input on any tap outside it and won't reopen the keyboard from a
  // programmatic focus() that's run outside the original gesture. Refocusing
  // there would leave the user with a "cursor back in input, no keyboard"
  // state that reads as broken. Let iOS's behaviour win on mobile.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (window.matchMedia?.("(pointer: coarse)").matches) return;
    inputRef.current?.focus();
  }, [selectedWord]);

  const trimmed = value.trim().toLowerCase();

  // Mirror the typed string into the graph's matchQuery while this InputBar
  // is mounted. The Graph component reads matchQuery to fade non-matching
  // nodes. Cleared on unmount so a stale query doesn't leak across mode
  // switches or victory panels.
  useEffect(() => {
    if (!substringHighlight) return;
    setMatchQuery(trimmed);
  }, [substringHighlight, trimmed, setMatchQuery]);
  useEffect(() => {
    if (!substringHighlight) return;
    return () => setMatchQuery("");
  }, [substringHighlight, setMatchQuery]);
  const wordInGraph =
    trimmed.length > 0 &&
    graph.nodes.some((node: { id: string }) => node.id === trimmed);
  const isDictionaryWord = trimmed.length > 0 && trimmed in getWordGraph();
  const isConnected =
    (isDictionaryWord || wordInGraph) &&
    wordsAreConnected(trimmed, selectedWord);
  // Typing a word already in the graph always works as a jump (regardless
  // of adjacency to the currently-selected word). New words still need to
  // be one edit from the selected word.
  const canSubmit = wordInGraph || (isDictionaryWord && isConnected);

  const hint = (() => {
    if (trimmed.length === 0) return null;
    const trimmedDisplay = displayWord(trimmed);
    const selectedDisplay = displayWord(selectedWord);
    if (!selectedWord) {
      return (
        <span className="wj-inputbar__hint wj-inputbar__hint--neutral">
          Click a word in your graph to pick where to add from
        </span>
      );
    }
    if (wordInGraph) {
      if (trimmed === selectedWord) {
        return (
          <span className="wj-inputbar__hint wj-inputbar__hint--neutral">
            '{trimmedDisplay}' is already selected
          </span>
        );
      }
      return (
        <span className="wj-inputbar__hint wj-inputbar__hint--good">
          ↻ Jump to '{trimmedDisplay}' in your graph
        </span>
      );
    }
    if (!isDictionaryWord) {
      // Disconnected-valid: real English, just not in our playable graph.
      // Treat it like the "in-dict but not L1" case — the connected-
      // component build guarantees these words are never L1-adjacent to
      // any wordGraph word, so the "not one edit from [selected]" phrasing
      // is true by construction (the rare orphan→disconnected-valid case
      // is the only exception and is benign).
      if (getDisconnectedValidWords().has(trimmed)) {
        return (
          <span className="wj-inputbar__hint wj-inputbar__hint--neutral">
            '{trimmedDisplay}' is a word, but not one edit from '{selectedDisplay}'
          </span>
        );
      }
      return (
        <span className="wj-inputbar__hint wj-inputbar__hint--bad">
          ✗ '{trimmedDisplay}' is not a word
        </span>
      );
    }
    if (!isConnected) {
      return (
        <span className="wj-inputbar__hint wj-inputbar__hint--neutral">
          '{trimmedDisplay}' is a word, but not one edit from '{selectedDisplay}'
        </span>
      );
    }
    return (
      <span className="wj-inputbar__hint wj-inputbar__hint--good">
        ✓ '{trimmedDisplay}' is one edit from '{selectedDisplay}'
      </span>
    );
  })();

  const submit = () => {
    if (!canSubmit) return;
    if (wordInGraph) {
      // Word's already in the graph — jump to it. If it's also adjacent
      // to the currently-selected word and we don't yet have an edge
      // between them, add the edge (closed-loop feature). Edges are
      // treated as undirected for dedup.
      if (isConnected && trimmed !== selectedWord) {
        const edgeExists = graph.edges.some(
          (e: { from: string; to: string }) =>
            (e.from === selectedWord && e.to === trimmed) ||
            (e.from === trimmed && e.to === selectedWord)
        );
        if (!edgeExists) {
          setGraph({
            ...graph,
            edges: [...graph.edges, { from: selectedWord, to: trimmed }],
          });
        }
      }
      setSelectedWord(trimmed);
    } else {
      // New word — add node + edge.
      setGraph({
        nodes: [...graph.nodes, { id: trimmed, label: trimmed }],
        edges: [...graph.edges, { from: selectedWord, to: trimmed }],
      });
      setSelectedWord(trimmed);
    }
    setValue("");
    inputRef.current?.focus();
  };

  return (
    <div className="wj-inputbar">
      <div className="wj-inputbar__selected">
        Selected <b>{displayWord(selectedWord)}</b>
        {selectedWord && (
          <button
            type="button"
            className="wj-inputbar__lookup"
            onClick={() => setLookupWord(selectedWord)}
            aria-label={`Look up '${displayWord(selectedWord)}'`}
            title="Look up"
          >
            ⓘ
          </button>
        )}{" "}
        →
        {targetReminder && (
          <>
            {" reach "}
            <b className="wj-inputbar__target">{displayWord(targetReminder)}</b>
          </>
        )}
      </div>
      <DefinitionModal
        word={lookupWord}
        onClose={() => setLookupWord(null)}
      />
      <div className="wj-inputbar__field">
        <Input
          ref={inputRef}
          autoFocus={autoFocus}
          placeholder={`Type a word one edit from '${displayWord(selectedWord)}'…`}
          value={value}
          onChange={(event) => setValue(event.target.value.toLowerCase())}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          onFocus={(event) => event.target.select()}
        />
      </div>
      {hint}
      <Button
        variant="primary"
        onClick={submit}
        disabled={!canSubmit}
        aria-label="Add word"
      >
        Add
      </Button>
    </div>
  );
};
