import React, { useState, useRef } from "react";
import { wordGraph } from "../dictionaryData/wordGraph";
import { wordsAreConnected } from "../utilities/wordAreConnected";
import { TextField, Button } from "@material-ui/core";
import { GraphContext } from "./GraphProvider";
import { colors } from "../assets";
import { Text } from "./Text";

export const WordInput = () => {
  const { selectedWord, setSelectedWord, graph, setGraph } =
    React.useContext(GraphContext);

  const [value, setValue] = useState("");
  const ref = useRef();
  const wordIsValid = value in wordGraph;
  const message = value
    ? wordIsValid
      ? "This word is in the dictionary"
      : "This word is not in the dictionary"
    : "";
  const onClick = () => {
    const newNode = { id: value, label: value };
    const newEdge = { from: selectedWord, to: value };
    if (selectedWord && wordIsValid && wordsAreConnected(value, selectedWord)) {
      setGraph({
        nodes: [...graph.nodes, newNode],
        edges: [...graph.edges, newEdge],
      });
      setSelectedWord(newNode.id);
    }
    ref.current.blur();
    ref.current.focus();
  };

  return (
    <div
      style={{
        position: "absolute",
        left: 16,
        top: 16,
        border: "1px solid rgba(0, 0, 0, 0.3)",
        backgroundColor: "rgba(255, 255, 255, 0.9)",

        borderRadius: 10,
        padding: 10,
      }}
    >
      <TextField
        margin="normal"
        type="string"
        placeholder="Please enter a word..."
        fullWidth
        onChange={(event) => {
          setValue(event.target.value.toLowerCase());
        }}
        onKeyPress={(ev) => {
          if (ev.key === "Enter") {
            onClick();
            ev.preventDefault();
          }
        }}
        onFocus={(event) => {
          event.target.select();
        }}
        inputRef={ref}
      />
      <Text
        style={{
          color: wordIsValid ? colors.green : colors.red,
          marginBottom: 8,
        }}
      >
        {message}
      </Text>

      <Button onClick={onClick} variant="outlined" margin="normal" fullWidth>
        Input node and edge
      </Button>
    </div>
  );
};
