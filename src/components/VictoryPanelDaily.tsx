import React, {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useState,
} from "react";
import confetti from "canvas-confetti";
import { Button } from "./ui/Button";
import { GraphContext } from "./GraphProvider";
import { useLocalStorage } from "../utilities/useLocalStorage";
import { getDayNumber, getUtcDateString } from "../utilities/dailyTarget";
import {
  findShortestPathInGraph,
  findShortestPathInDictionary,
  findUserPath,
} from "../utilities/findPath";
import { legitimateWords } from "../dictionaryData/legitimate";
import type { DailyHistory } from "../utilities/dailyStats";

const SHARE_URL = "https://wayword.fun/";
// Themed confetti colours — terracotta accent + cream paper + navy ink.
const CONFETTI_COLOURS = [
  "#c25a2a",
  "#efd6c6",
  "#d9d0bd",
  "#1f2533",
  "#f7f1e8",
];

const fireConfetti = (extraOomph: boolean) => {
  const base = {
    particleCount: extraOomph ? 140 : 90,
    spread: extraOomph ? 90 : 70,
    startVelocity: extraOomph ? 50 : 42,
    colors: CONFETTI_COLOURS,
    scalar: 0.9,
    ticks: 220,
  };
  confetti({ ...base, origin: { x: 0.2, y: 0.7 }, angle: 70 });
  confetti({ ...base, origin: { x: 0.8, y: 0.7 }, angle: 110 });
};

type VictoryPanelDailyProps = {
  start: string;
  target: string;
  history: DailyHistory;
  setHistory: Dispatch<SetStateAction<DailyHistory>>;
  onSwitchToFreePlay: () => void;
};

export const VictoryPanelDaily = ({
  start,
  target,
  history,
  setHistory,
  onSwitchToFreePlay,
}: VictoryPanelDailyProps) => {
  const today = getUtcDateString();
  const { graph } = useContext(GraphContext);

  const [solvedDate, setSolvedDate] = useLocalStorage<string | null>(
    "daily:solvedDate",
    null
  );
  const [solvedPath, setSolvedPath] = useLocalStorage<string[] | null>(
    "daily:solvedPath",
    null
  );
  const [optimalPath, setOptimalPath] = useLocalStorage<string[] | null>(
    "daily:optimalPath",
    null
  );
  const [dismissedDate, setDismissedDate] = useLocalStorage<string | null>(
    "daily:victoryDismissedDate",
    null
  );
  const [copied, setCopied] = useState(false);

  const solvedToday = solvedDate === today;
  const dismissed = dismissedDate === today;
  const userMoves = solvedPath ? solvedPath.length - 1 : 0;
  const optimalMoves = optimalPath ? optimalPath.length - 1 : null;
  const matchedOptimal =
    optimalMoves !== null && userMoves === optimalMoves;
  const beatOptimal = optimalMoves !== null && userMoves < optimalMoves;

  // When the user adds today's target to their graph, lock the solve in.
  useEffect(() => {
    if (solvedToday) return;
    const reached = graph.nodes.some(
      (node: { id: string }) => node.id === target
    );
    if (!reached) return;

    // Prefer the chronological path the user took (via parents); fall back
    // to shortest-path-through-graph for legacy graphs without parent
    // tracking.
    const userPath =
      findUserPath(graph.parents, start, target) ??
      findShortestPathInGraph(graph.nodes, graph.edges, start, target);
    const optimal = findShortestPathInDictionary(
      start,
      target,
      legitimateWords
    );

    // Celebratory burst on the moment of solve. Bigger burst if the user
    // matched or beat the common-word optimal.
    const userMovesNow = userPath ? userPath.length - 1 : 0;
    const optimalMovesNow = optimal ? optimal.length - 1 : null;
    fireConfetti(
      optimalMovesNow !== null && userMovesNow <= optimalMovesNow
    );

    setSolvedDate(today);
    setSolvedPath(userPath);
    setOptimalPath(optimal);

    // Record this solve in the history map (used by the stats modal and the
    // streak indicator in the header). Idempotent — if today's already in,
    // keep the original entry.
    if (!(today in history)) {
      setHistory({
        ...history,
        [today]: {
          start,
          target,
          userMoves: userMovesNow,
          optimalMoves: optimalMovesNow,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph.nodes, graph.edges, start, target, today, solvedToday]);

  if (!solvedToday || !solvedPath || dismissed) return null;

  // Native share on desktop opens a clunky OS share sheet (AirDrop / Notes /
  // Reminders); on mobile it's the right primary action. Gate on coarse
  // pointer so phones/tablets get share, laptops/desktops get clipboard.
  const isCoarsePointer =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
  const useNativeShare =
    isCoarsePointer &&
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function";

  const onShare = async () => {
    const suffix = matchedOptimal
      ? " — common-word optimal!"
      : beatOptimal
        ? ` — beat common-word optimal of ${optimalMoves}!`
        : optimalMoves !== null
          ? ` (common-word optimal: ${optimalMoves})`
          : "";
    // Render the solve as an emoji block so the share text doesn't spoil
    // the actual word chain. 📍 / 🎯 mark start and target; middle path
    // words are 🟢 normally, 🟠 if that word had at least one "useless"
    // edge (one to a node off the final solve path).
    const pathSet = new Set(solvedPath);
    const hasDetour: Record<string, boolean> = {};
    for (const edge of graph.edges ?? []) {
      if (pathSet.has(edge.from) && !pathSet.has(edge.to))
        hasDetour[edge.from] = true;
      if (pathSet.has(edge.to) && !pathSet.has(edge.from))
        hasDetour[edge.to] = true;
    }
    const block = solvedPath
      .map((word, index) => {
        if (index === 0) return "📍";
        if (index === solvedPath.length - 1) return "🎯";
        return hasDetour[word] ? "🟠" : "🟢";
      })
      .join(" → ");
    const text = `Wayword #${getDayNumber(today)}: ${start.toUpperCase()} → ${target.toUpperCase()} in ${userMoves} moves${suffix}\n${block}\n\n${SHARE_URL}`;

    if (useNativeShare) {
      try {
        await navigator.share({ title: "Wayword", text });
        return;
      } catch {
        // User cancelled or share blocked — fall through to clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy to clipboard:", text);
    }
  };

  const renderPath = (path: string[], extraClass: string = "") => (
    <div className={`wj-victory__path ${extraClass}`.trim()}>
      {path.map((word, index) => (
        <React.Fragment key={`${index}-${word}`}>
          {index > 0 && <span className="arrow">→</span>}
          <span>{word}</span>
        </React.Fragment>
      ))}
    </div>
  );

  const titleText = (() => {
    const word = `Solved ${target} in ${userMoves} ${userMoves === 1 ? "move" : "moves"}`;
    if (matchedOptimal) return `${word} — optimal!`;
    if (beatOptimal) return `${word} — you found a shortcut!`;
    return word;
  })();

  const subtitleText = (() => {
    if (matchedOptimal || optimalMoves === null) return null;
    if (beatOptimal) {
      return `You routed through less common words to beat the common-word optimal of ${optimalMoves}.`;
    }
    return `Common-word optimal was ${optimalMoves} ${optimalMoves === 1 ? "move" : "moves"}.`;
  })();

  const commonWordExplainer = `Shortest path from '${start}' to '${target}' using only common everyday words. You can sometimes find a shorter route by routing through less common ones.`;

  return (
    <div className="wj-victory">
      <button
        type="button"
        className="wj-victory__close"
        onClick={() => setDismissedDate(today)}
        aria-label="Dismiss"
      >
        ×
      </button>
      <div className="wj-victory__headline">
        <div>
          <div className="wj-victory__title">{titleText}</div>
          {subtitleText && (
            <div className="wj-victory__subtitle">{subtitleText}</div>
          )}
        </div>
        <div className="wj-victory__actions">
          <Button variant="primary" size="small" onClick={onShare}>
            {copied ? "Copied!" : useNativeShare ? "Share" : "Copy result"}
          </Button>
        </div>
      </div>

      <div>
        <span className="wj-victory__path-label">Your path</span>
        {renderPath(solvedPath)}
      </div>

      {optimalPath && !matchedOptimal && (
        <div>
          <span
            className="wj-victory__path-label"
            title={commonWordExplainer}
          >
            Common-word optimal <span aria-hidden="true">ⓘ</span>
          </span>
          {renderPath(optimalPath, "wj-victory__path--optimal")}
        </div>
      )}

      <div className="wj-victory__continue">
        Done for today?{" "}
        <button
          type="button"
          className="wj-victory__link"
          onClick={onSwitchToFreePlay}
        >
          Keep playing in free play →
        </button>
      </div>
    </div>
  );
};
