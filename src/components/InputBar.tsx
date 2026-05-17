import React, { useContext, useRef, useState } from "react";
import { wordGraph } from "../dictionaryData/wordGraph";
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
  const isDictionaryWord = trimmed.length > 0 && trimmed in wordGraph;
  const isConnected =
    isDictionaryWord && wordsAreConnected(trimmed, selectedWord);
  const canSubmit = trimmed.length > 0 && isDictionaryWord && isConnected;

  const hint = (() => {
    if (trimmed.length === 0) return null;
    if (!selectedWord) {
      return (
        <span className="wj-inputbar__hint wj-inputbar__hint--neutral">
          Click a word in your graph to pick where to add from
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
    const newNode = { id: trimmed, label: trimmed };
    const newEdge = { from: selectedWord, to: trimmed };
    setGraph({
      nodes: [...graph.nodes, newNode],
      edges: [...graph.edges, newEdge],
    });
    setSelectedWord(trimmed);
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
