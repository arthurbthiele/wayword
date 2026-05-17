import GraphVis from "react-graph-vis";
import React, { useState, useContext, useRef, useEffect } from "react";
import { GraphContext } from "./GraphProvider";

export const Graph = () => {
  const { selectedWord, setSelectedWord, graph } = useContext(GraphContext);

  const [network, setNetwork] = useState();
  const containerRef = useRef(null);
  const initialFitDoneRef = useRef(false);

  // Keep vis-network's canvas in sync with its container.
  useEffect(() => {
    if (!network || !containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) continue;
        network.setSize(`${Math.round(width)}px`, `${Math.round(height)}px`);
        network.redraw();
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [network]);

  // Fit once when the network first appears, with minZoomLevel so very small
  // graphs (like just 'a') don't render microscopically.
  useEffect(() => {
    if (!network || initialFitDoneRef.current) return;
    network.fit({
      minZoomLevel: 1.0,
      maxZoomLevel: 2,
      animation: false,
    });
    initialFitDoneRef.current = true;
  }, [network]);

  // Sync vis-network's selection with React state. Done in a useEffect rather
  // than on every afterDrawing tick — repeatedly calling fit() during draw
  // was fighting the user's pinch-to-zoom.
  useEffect(() => {
    if (!network || !selectedWord) return;
    network.setSelection({ nodes: [selectedWord] });
  }, [network, selectedWord]);

  // When an input takes focus (i.e. the mobile keyboard is about to appear
  // and the page will reflow / scroll), recenter the graph on the currently
  // selected node so it stays visible regardless of what the browser does
  // to the layout.
  useEffect(() => {
    if (!network || !selectedWord) return;
    const onFocusIn = (event) => {
      if (!(event.target instanceof HTMLInputElement)) return;
      requestAnimationFrame(() => {
        network.focus(selectedWord, {
          scale: network.getScale(),
          animation: { duration: 250 },
        });
      });
    };
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, [network, selectedWord]);

  const events = {
    select: (event) => {
      // Ignore clicks on empty space — keep the current selection rather than
      // dropping it; otherwise the input bar's hint can't reason about it.
      if (event.nodes.length === 0) return;
      setSelectedWord(event.nodes[0]);
    },
    doubleClick: () => {
      network?.fit({ animation: { duration: 300 } });
    },
  };

  return (
    <div
      ref={containerRef}
      style={{ height: "100%", width: "100%", position: "relative" }}
    >
      <GraphVis
        graph={graph}
        options={options}
        events={events}
        getNetwork={setNetwork}
        id={graph.edges.length}
      />
    </div>
  );
};

const options = {
  nodes: {
    shape: "box",
    shapeProperties: { borderRadius: 999 },
    color: {
      background: "#efe8db",
      border: "#d9d0bd",
      highlight: { background: "#c25a2a", border: "#c25a2a" },
    },
    font: {
      face: "Fraunces, Georgia, serif",
      size: 18,
      color: "#1f2533",
      strokeWidth: 0,
    },
    margin: { top: 10, right: 14, bottom: 10, left: 14 },
    chosen: {
      label: function (values) {
        values.color = "#ffffff";
        values.face = "Fraunces, Georgia, serif";
      },
    },
    borderWidth: 1,
    borderWidthSelected: 2,
  },
  edges: {
    color: { color: "#c1b8a4", highlight: "#5d6273", hover: "#5d6273" },
    width: 1.5,
    smooth: { type: "continuous" },
    arrows: { to: false },
  },
  interaction: {
    hover: true,
    zoomView: true,
  },
};
