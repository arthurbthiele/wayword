import React, { useState, useMemo } from "react";
import { computeDepths } from "../utilities/wordDepths";

export const GraphContext = React.createContext();

export const GraphProvider = ({ children }) => {
  const [selectedWord, setSelectedWord] = useState("a");
  const [graph, setGraph] = useState({
    nodes: [{ id: "a", label: "a" }],
    edges: [],
  });

  const depths = useMemo(() => computeDepths(graph.nodes), [graph.nodes]);

  return (
    <GraphContext.Provider
      value={{ selectedWord, setSelectedWord, graph, setGraph, depths }}
    >
      {children}
    </GraphContext.Provider>
  );
};
