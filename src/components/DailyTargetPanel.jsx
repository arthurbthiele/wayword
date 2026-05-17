import React, { useContext, useEffect, useState } from "react";
import { Button } from "@material-ui/core";
import { GraphContext } from "./GraphProvider";
import { Text } from "./Text";
import { fonts } from "../assets";
import {
  useLocalStorage,
  clearLocalStorage,
} from "../utilities/useLocalStorage";
import { getLocalDateString, getTargetForDate } from "../utilities/dailyTarget";
import {
  findShortestPathInGraph,
  findShortestPathInDictionary,
} from "../utilities/findPath";

export const DailyTargetPanel = () => {
  const today = getLocalDateString();
  const target = getTargetForDate(today);
  const { graph } = useContext(GraphContext);

  const [solvedDate, setSolvedDate] = useLocalStorage("daily:solvedDate", null);
  const [solvedPath, setSolvedPath] = useLocalStorage("daily:solvedPath", null);
  const [optimalPath, setOptimalPath] = useLocalStorage(
    "daily:optimalPath",
    null
  );
  const [copied, setCopied] = useState(false);

  const solvedToday = solvedDate === today;
  const userMoves = solvedPath ? solvedPath.length - 1 : 0;
  const optimalMoves = optimalPath ? optimalPath.length - 1 : null;
  const matchedOptimal =
    optimalMoves !== null && userMoves === optimalMoves;

  // When the user reaches today's target, record the solve.
  useEffect(() => {
    if (solvedToday) return;
    const reached = graph.nodes.some((node) => node.id === target);
    if (!reached) return;

    setSolvedDate(today);
    setSolvedPath(
      findShortestPathInGraph(graph.nodes, graph.edges, "a", target)
    );
    setOptimalPath(findShortestPathInDictionary("a", target));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph.nodes, graph.edges, target, today, solvedToday]);

  const onReset = () => {
    if (
      window.confirm(
        "Reset your daily challenge progress? You will lose today's path. Your free-play state is not affected."
      )
    ) {
      clearLocalStorage("daily:");
      window.location.reload();
    }
  };

  const onCopy = async () => {
    if (!solvedPath) return;
    const suffix = matchedOptimal
      ? " — optimal!"
      : optimalMoves !== null
        ? ` (optimal: ${optimalMoves})`
        : "";
    const text = `Word Journey ${today}: ${target.toUpperCase()} in ${userMoves} moves${suffix}\n${solvedPath.join(" → ")}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy to clipboard:", text);
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        right: 16,
        top: 16,
        width: 320,
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        border: "1px solid rgba(0, 0, 0, 0.3)",
        borderRadius: 10,
        padding: 10,
      }}
    >
      <Text style={{ textAlign: "center" }}>
        <Text style={{ ...fonts.primary.medium }}>
          Daily challenge — {today}
        </Text>
        <Text style={{ marginTop: 4 }}>Reach this word starting from 'a':</Text>
        <Text
          style={{
            ...fonts.primary.display,
            textTransform: "uppercase",
            marginTop: 4,
          }}
        >
          {target}
        </Text>
      </Text>

      {solvedToday && solvedPath && (
        <div style={{ marginTop: 12, textAlign: "center" }}>
          <Text style={{ ...fonts.primary.medium }}>
            Solved in {userMoves} moves
            {matchedOptimal
              ? " — optimal!"
              : optimalMoves !== null
                ? ` (optimal: ${optimalMoves})`
                : ""}
          </Text>
          <Text
            style={{ marginTop: 6, fontSize: 13, textAlign: "left" }}
          >
            <b>You:</b> {solvedPath.join(" → ")}
          </Text>
          {optimalPath && !matchedOptimal && (
            <Text style={{ marginTop: 4, fontSize: 13, textAlign: "left" }}>
              <b>Optimal:</b> {optimalPath.join(" → ")}
            </Text>
          )}
          <div style={{ marginTop: 10 }}>
            <Button
              onClick={onCopy}
              variant="outlined"
              color="primary"
              size="small"
            >
              {copied ? "Copied!" : "Copy result"}
            </Button>
          </div>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 12 }}>
        <Button
          onClick={onReset}
          variant="outlined"
          color="secondary"
          size="small"
        >
          Reset
        </Button>
      </div>
    </div>
  );
};
