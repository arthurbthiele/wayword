import React, { useContext, useRef, useState } from "react";
import { getWordGraph } from "../dictionaryData/wordGraphRef";
import { wordsAreConnected } from "../utilities/wordAreConnected";
import { GraphContext } from "./GraphProvider";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

type InputBarProps = {
  targetReminder?: string | null;
};

export const InputBar = ({ targetReminder }: InputBarProps) => {
  const { selectedWord, setSelectedWord, graph, setGraph } =
    useContext(GraphContext);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = value.trim().toLowerCase();
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
            '{trimmed}' is already selected
          </span>
        );
      }
      return (
        <span className="wj-inputbar__hint wj-inputbar__hint--good">
          ↻ Jump to '{trimmed}' in your graph
        </span>
      );
    }
    if (!isDictionaryWord) {
      return (
        <span className="wj-inputbar__hint wj-inputbar__hint--bad">
          ✗ '{trimmed}' is not a word
        </span>
      );
    }
    if (!isConnected) {
      return (
        <span className="wj-inputbar__hint wj-inputbar__hint--neutral">
          '{trimmed}' is a word, but not one edit from '{selectedWord}'
        </span>
      );
    }
    return (
      <span className="wj-inputbar__hint wj-inputbar__hint--good">
        ✓ '{trimmed}' is one edit from '{selectedWord}'
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
      // New word — add node, edge, and record its parent for chronological
      // path reconstruction.
      const existingParents = graph.parents ?? {};
      setGraph({
        nodes: [...graph.nodes, { id: trimmed, label: trimmed }],
        edges: [...graph.edges, { from: selectedWord, to: trimmed }],
        parents: { ...existingParents, [trimmed]: selectedWord },
      });
      setSelectedWord(trimmed);
    }
    setValue("");
    inputRef.current?.focus();
  };

  return (
    <div className="wj-inputbar">
      <div className="wj-inputbar__selected">
        Selected <b>{selectedWord}</b> →
        {targetReminder && (
          <>
            {" reach "}
            <b className="wj-inputbar__target">{targetReminder}</b>
          </>
        )}
      </div>
      <div className="wj-inputbar__field">
        <Input
          ref={inputRef}
          autoFocus
          placeholder={`Type a word one edit from '${selectedWord}'…`}
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
