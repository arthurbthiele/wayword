import React, { useState, useContext, useEffect, useRef } from "react";
import { Button } from "@material-ui/core";
import { GraphContext } from "./GraphProvider";
import { Text } from "./Text";
import { fonts } from "../assets";

const minDifficulty = 1;
const maxDifficulty = 15;

export const TargetWord = () => {
  const [target, setTarget] = useState(null);
  const [difficultyLevel, setDifficultyLevel] = useState(3);
  const [score, setScore] = useState(0);
  const { graph, depths } = useContext(GraphContext);
  const lastScoredTargetRef = useRef(null);

  const pickNewTarget = (level) => {
    const wordsOfThisDepth = Object.keys(depths).filter(
      (word) => depths[word] === level
    );
    if (wordsOfThisDepth.length > 0) {
      const choiceIndex = Math.floor(Math.random() * wordsOfThisDepth.length);
      setTarget(wordsOfThisDepth[choiceIndex]);
    } else {
      setTarget("There are no words of this depth");
    }
  };

  // Pick a fresh target on mount, and whenever difficulty changes.
  useEffect(() => {
    pickNewTarget(difficultyLevel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficultyLevel]);

  // When the user adds the target word to their graph, award points and pick a new one.
  useEffect(() => {
    if (!target) return;
    const reachedTarget = graph.nodes.some((node) => node.id === target);
    if (reachedTarget && lastScoredTargetRef.current !== target) {
      lastScoredTargetRef.current = target;
      setScore((previousScore) => previousScore + difficultyLevel ** 2);
      pickNewTarget(difficultyLevel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph.nodes, target, difficultyLevel]);

  const onPlus = () => {
    if (difficultyLevel < maxDifficulty) {
      setDifficultyLevel(difficultyLevel + 1);
    }
  };
  const onMinus = () => {
    if (difficultyLevel > minDifficulty) {
      setDifficultyLevel(difficultyLevel - 1);
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        right: 16,
        top: 16,
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        border: "1px solid rgba(0, 0, 0, 0.3)",
        borderRadius: 10,
        padding: 10,
      }}
    >
      <div
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
          display: "inline-flex",
        }}
      >
        <Button
          onClick={onMinus}
          variant="outlined"
          color="primary"
          style={{ margin: 8 }}
          size="small"
        >
          -
        </Button>

        <Text style={{ ...fonts.primary.medium, margin: 8 }}>
          Current difficulty: {difficultyLevel}
        </Text>

        <Button
          onClick={onPlus}
          variant="outlined"
          color="primary"
          style={{ margin: 8 }}
          size="small"
        >
          +
        </Button>
      </div>
      <Text style={{ textAlign: "center" }}>
        Try finding the word:
        <Text
          style={{
            ...fonts.primary.display,
            textTransform: "uppercase",
            marginTop: 4,
          }}
        >
          {target}
        </Text>
        <Text>Your score is: {score}</Text>
      </Text>
    </div>
  );
};
