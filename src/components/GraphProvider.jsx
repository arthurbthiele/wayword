import React, { useEffect, useMemo, useState } from "react";
import { computeDepths } from "../utilities/wordDepths";
import { useLocalStorage } from "../utilities/useLocalStorage";
import { legitimateWords } from "../dictionaryData/legitimate";

export const GraphContext = React.createContext();

export const GraphProvider = ({
  children,
  keyPrefix,
  initialGraph,
  initialSelectedWord,
}) => {
  const [selectedWord, setSelectedWord] = useLocalStorage(
    `${keyPrefix}:selectedWord`,
    initialSelectedWord
  );
  const [graph, setGraph] = useLocalStorage(
    `${keyPrefix}:graph`,
    initialGraph
  );

  // Substring-find query, mirrored from the InputBar in modes that opt in.
  // Non-persistent on purpose — a stray query shouldn't survive a reload.
  const [matchQuery, setMatchQuery] = useState("");

  // One-time self-heal for saved state from older versions that allowed
  // duplicate node ids (the closed-loop feature appended a node even when
  // an entry with the same id already existed). vis-network crashes on
  // duplicate ids, so we dedupe here on mount.
  useEffect(() => {
    const seen = new Set();
    const dedupedNodes = [];
    let hadDuplicates = false;
    for (const node of graph.nodes) {
      if (seen.has(node.id)) {
        hadDuplicates = true;
        continue;
      }
      seen.add(node.id);
      dedupedNodes.push(node);
    }
    if (hadDuplicates) {
      setGraph({ ...graph, nodes: dedupedNodes });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Depths are used by the free-play target picker to choose a word at the
  // requested difficulty. Restrict the BFS to legitimate words so difficulty
  // means "N moves through legitimate words from your graph" — consistent
  // with how the qualifying chain is rendered.
  const depths = useMemo(
    () => computeDepths(graph.nodes, legitimateWords),
    [graph.nodes]
  );

  return (
    <GraphContext.Provider
      value={{
        selectedWord,
        setSelectedWord,
        graph,
        setGraph,
        depths,
        matchQuery,
        setMatchQuery,
      }}
    >
      {children}
    </GraphContext.Provider>
  );
};
