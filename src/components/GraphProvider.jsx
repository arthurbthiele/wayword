import React, { useMemo } from "react";
import { computeDepths } from "../utilities/wordDepths";
import { useLocalStorage } from "../utilities/useLocalStorage";

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

  const depths = useMemo(() => computeDepths(graph.nodes), [graph.nodes]);

  return (
    <GraphContext.Provider
      value={{ selectedWord, setSelectedWord, graph, setGraph, depths }}
    >
      {children}
    </GraphContext.Provider>
  );
};
