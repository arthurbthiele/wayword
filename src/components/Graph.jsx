import GraphVis from "react-graph-vis";
import React, {
  useState,
  useContext,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { GraphContext } from "./GraphProvider";
import { displayWord } from "../utilities/displayWord";

// Node colours. DEFAULT mirrors options.nodes.color so we can emit it
// explicitly per node when needed (DataSet partial-merge means we can't
// rely on omission to reset).
const DEFAULT_NODE_COLOR = { background: "#efe8db", border: "#d9d0bd" };

// Soft tint applied to the start word AND any terminal — they're the
// fixed structural nodes of the puzzle (which is which is conveyed by
// the status strip, not by colour). Pale enough to sit alongside the
// default cream nodes without competing with the terracotta selected-
// highlight.
const FIXED_NODE_COLOR = { background: "#cfdcc4", border: "#a0b896" };

// Highlighter-pen yellow for substring-match results. Distinct from
// terracotta selection and sage fixed-nodes; sits comfortably in the
// warm palette.
const MATCH_NODE_COLOR = { background: "#f5e69a", border: "#d6c562" };

// Don't highlight until the user has typed something specific enough to be
// useful. 1 char would light up most of the map while typing the next word.
const MIN_QUERY_LENGTH = 2;

export const Graph = ({ startWord, terminalWords }) => {
  const { selectedWord, setSelectedWord, graph, matchQuery } =
    useContext(GraphContext);

  // vis-network rejects duplicate node ids. Older saved graphs may have
  // duplicate entries from the closed-loop feature; dedupe defensively.
  // Also decorate the start word + any terminals with their distinguishing
  // colour. vis-network keeps the default highlight colour when only
  // `background` and `border` are specified, so the terracotta selection
  // cue continues to work for these nodes too.
  const safeGraph = useMemo(() => {
    const terminalSet = new Set(terminalWords ?? []);
    const findActive = matchQuery.length >= MIN_QUERY_LENGTH;
    const seen = new Set();
    const nodes = [];
    for (const node of graph.nodes) {
      if (seen.has(node.id)) continue;
      seen.add(node.id);
      const label = displayWord(node.id);
      const isMatch = findActive && node.id.includes(matchQuery);
      const isFixed = node.id === startWord || terminalSet.has(node.id);
      // Match takes precedence over fixed — when finding, the user wants to
      // see the substring hit, not the start/terminal tint. Always emit a
      // colour so vis-network's DataSet merge resets cleanly when a node
      // moves between states.
      const color = isMatch
        ? MATCH_NODE_COLOR
        : isFixed
          ? FIXED_NODE_COLOR
          : DEFAULT_NODE_COLOR;
      nodes.push({ ...node, label, color });
    }
    return { nodes, edges: graph.edges };
  }, [graph, startWord, terminalWords, matchQuery]);

  const [network, setNetwork] = useState();
  const containerRef = useRef(null);
  const initialFitDoneRef = useRef(false);

  // Centre the graph at a comfortable scale. Used for both the one-shot
  // initial fit and the double-tap recenter.
  const recenterGraph = useCallback(
    (animate) => {
      if (!network || !containerRef.current) return;
      const nodeIds = safeGraph.nodes.map((n) => n.id);
      if (nodeIds.length === 0) return;

      const animation = animate ? { duration: 300 } : false;

      // 1-2 nodes: bounding box is small / degenerate. We can't use focus()
      // here on initial mount — the node may not yet be positioned by
      // vis-network when this runs, leaving the camera off-screen. fit()
      // is robust to that, and a 1.2 maxZoomLevel keeps the word at a
      // readable size rather than filling the canvas.
      if (nodeIds.length <= 2) {
        network.fit({ minZoomLevel: 1.0, maxZoomLevel: 1.2, animation });
        return;
      }

      // Compute a tight fit manually. vis-network's fit() leaves more margin
      // than we want.
      const positions = network.getPositions(nodeIds);
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const id of nodeIds) {
        const p = positions[id];
        if (!p) continue;
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }

      // Padding accounts for node pill width + label overhang (positions are
      // node centres in graph coords).
      const PADDING = 70;
      const rangeW = (maxX - minX) + PADDING * 2;
      const rangeH = (maxY - minY) + PADDING * 2;
      const { clientWidth, clientHeight } = containerRef.current;
      const scale = Math.min(clientWidth / rangeW, clientHeight / rangeH);

      network.moveTo({
        position: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
        scale,
        animation,
      });
    },
    [network, safeGraph, selectedWord]
  );

  // Keep vis-network's canvas in sync with its container. Also drives the
  // initial recenter, which has to happen against the final canvas size —
  // if we recenter before ResizeObserver settles, the camera ends up
  // computed against a stale canvas size and the graph drifts off-screen.
  useEffect(() => {
    if (!network || !containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) continue;
        network.setSize(`${Math.round(width)}px`, `${Math.round(height)}px`);
        network.redraw();
        if (!initialFitDoneRef.current) {
          recenterGraph(false);
          initialFitDoneRef.current = true;
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [network, recenterGraph]);


  // Sync vis-network's selection with React state. Done in a useEffect rather
  // than on every afterDrawing tick — repeatedly calling fit() during draw
  // was fighting the user's pinch-to-zoom.
  //
  // Defer by one frame so vis-network has processed the most recent `graph`
  // prop into its internal node store before we try to select. Without this,
  // initial mount on a hydrated graph (e.g. from localStorage) can throw
  // `Node with id "X" not found` — setSelection runs after the network is
  // constructed but before its node store is populated by react-graph-vis.
  useEffect(() => {
    if (!network || !selectedWord) return;
    const handle = requestAnimationFrame(() => {
      try {
        network.setSelection({ nodes: [selectedWord] });
      } catch {
        // Node not in network yet — the next selection change will re-apply.
      }
    });
    return () => cancelAnimationFrame(handle);
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
    doubleClick: () => recenterGraph(true),
  };

  return (
    <div
      ref={containerRef}
      style={{ height: "100%", width: "100%", position: "relative" }}
    >
      <GraphVis
        graph={safeGraph}
        options={options}
        events={events}
        getNetwork={setNetwork}
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
    // Bolden connected edges when a node is selected. Player feedback:
    // the colour-only highlight wasn't pronounced enough to see at a
    // glance which words connect to the one you just tapped.
    selectionWidth: 2,
    smooth: { type: "continuous" },
    arrows: { to: false },
  },
  interaction: {
    hover: true,
    zoomView: true,
  },
};
