import React, { useMemo } from "react";
import { computeDepths } from "../utilities/wordDepths";
import { useLocalStorage } from "../utilities/useLocalStorage";

export const GraphContext = React.createContext();

// First-time visitors see a small example path so the mechanic is obvious
// without having to read instructions. Returning visitors keep their saved graph.
const initialGraph = {
  nodes: [
    { id: "a", label: "a" },
    { id: "at", label: "at" },
    { id: "art", label: "art" },
  ],
  edges: [
    { from: "a", to: "at" },
    { from: "at", to: "art" },
  ],
};

export const GraphProvider = ({ children }) => {
  const [selectedWord, setSelectedWord] = useLocalStorage(
    "selectedWord",
    "art"
  );
  const [graph, setGraph] = useLocalStorage("graph", initialGraph);

  const depths = useMemo(() => computeDepths(graph.nodes), [graph.nodes]);

  return (
    <GraphContext.Provider
      value={{ selectedWord, setSelectedWord, graph, setGraph, depths }}
    >
      {children}
    </GraphContext.Provider>
  );
};
