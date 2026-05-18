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
import { findSteinerTreeInGraph } from "../utilities/tripleTarget";
import type { TripleHistory } from "../utilities/dailyStats";

const SHARE_URL = "https://wayword.fun/triple";
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

type VictoryPanelTripleProps = {
  start: string;
  t1: string;
  t2: string;
  optimalEdges: number;
  history: TripleHistory;
  setHistory: Dispatch<SetStateAction<TripleHistory>>;
  onSwitchToFreePlay: () => void;
};

export const VictoryPanelTriple = ({
  start,
  t1,
  t2,
  optimalEdges,
  history,
  setHistory,
  onSwitchToFreePlay,
}: VictoryPanelTripleProps) => {
  const today = getUtcDateString();
  const { graph } = useContext(GraphContext);

  const [solvedDate, setSolvedDate] = useLocalStorage<string | null>(
    "triple:solvedDate",
    null
  );
  const [userTreeSize, setUserTreeSize] = useLocalStorage<number | null>(
    "triple:userTreeSize",
    null
  );
  const [branchToStart, setBranchToStart] = useLocalStorage<string[] | null>(
    "triple:branchToStart",
    null
  );
  const [branchToT1, setBranchToT1] = useLocalStorage<string[] | null>(
    "triple:branchToT1",
    null
  );
  const [branchToT2, setBranchToT2] = useLocalStorage<string[] | null>(
    "triple:branchToT2",
    null
  );
  const [dismissedDate, setDismissedDate] = useLocalStorage<string | null>(
    "triple:victoryDismissedDate",
    null
  );
  const [copiedKind, setCopiedKind] = useState<"score" | "path" | null>(null);

  const solvedToday = solvedDate === today;
  const dismissed = dismissedDate === today;
  const matchedOptimal =
    userTreeSize !== null && userTreeSize === optimalEdges;
  const beatOptimal = userTreeSize !== null && userTreeSize < optimalEdges;

  // Lock the solve in when the user's graph contains both targets.
  useEffect(() => {
    if (solvedToday) return;
    const reachedT1 = graph.nodes.some(
      (node: { id: string }) => node.id === t1
    );
    const reachedT2 = graph.nodes.some(
      (node: { id: string }) => node.id === t2
    );
    if (!reachedT1 || !reachedT2) return;

    const tree = findSteinerTreeInGraph(
      graph.nodes.map((node: { id: string }) => node.id),
      graph.edges,
      start,
      t1,
      t2
    );
    if (!tree) return;

    fireConfetti(tree.edges <= optimalEdges);
    setSolvedDate(today);
    setUserTreeSize(tree.edges);
    setBranchToStart(tree.branchToStart);
    setBranchToT1(tree.branchToT1);
    setBranchToT2(tree.branchToT2);

    // Record into long-term history (used by the stats modal). Idempotent
    // — if today's already there, keep the original entry.
    if (!(today in history)) {
      setHistory({
        ...history,
        [today]: {
          start,
          t1,
          t2,
          userMoves: tree.edges,
          optimalMoves: optimalEdges,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph.nodes, graph.edges, start, t1, t2, today, solvedToday]);

  if (
    !solvedToday ||
    dismissed ||
    userTreeSize === null ||
    !branchToStart ||
    !branchToT1 ||
    !branchToT2
  ) {
    return null;
  }

  // Reconstruct the two full paths (start → joint → target) for display
  // and for the spoilery share text. The joint is the LAST element of
  // branchToStart (we built it as joint→...→start), and branchToTi is
  // joint→...→tN.
  const trunk = [...branchToStart].reverse(); // start → ... → joint
  const pathToT1 = [...trunk, ...branchToT1.slice(1)]; // start → ... → joint → ... → t1
  const pathToT2 = [...trunk, ...branchToT2.slice(1)]; // start → ... → joint → ... → t2

  const isCoarsePointer =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches;
  const useNativeShare =
    isCoarsePointer &&
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function";

  const buildShareText = (includePath: boolean): string => {
    const suffix = matchedOptimal
      ? " — common-word optimal!"
      : beatOptimal
        ? ` — beat common-word optimal of ${optimalEdges}!`
        : ` (common-word optimal: ${optimalEdges})`;
    const headline = `Wayword Triple #${getDayNumber(today)}: ${start.toUpperCase()} + ${t1.toUpperCase()} + ${t2.toUpperCase()} in ${userTreeSize} words${suffix}`;
    if (!includePath) return `${headline}\n${SHARE_URL}`;
    // Two lines, both starting from start. Shared trunk repeats — a tree
    // is hard to draw in plain text and duplication beats indented ascii.
    return `${headline}\n${pathToT1.join(" → ")}\n${pathToT2.join(" → ")}\n${SHARE_URL}`;
  };

  const onShare = async (kind: "score" | "path") => {
    const text = buildShareText(kind === "path");
    if (useNativeShare) {
      try {
        await navigator.share({ title: "Wayword Triple", text });
        return;
      } catch {
        // Fall through to clipboard.
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKind(kind);
      setTimeout(() => setCopiedKind(null), 2000);
    } catch {
      window.prompt("Copy to clipboard:", text);
    }
  };

  const titleText = (() => {
    const head = `Connected ${start}, ${t1}, ${t2} in ${userTreeSize} ${userTreeSize === 1 ? "word" : "words"}`;
    if (matchedOptimal) return `${head} — optimal!`;
    if (beatOptimal) return `${head} — you found a shortcut!`;
    return head;
  })();

  const subtitleText = (() => {
    if (matchedOptimal) return null;
    if (beatOptimal) {
      return `You routed through less common words to beat the common-word optimal of ${optimalEdges}.`;
    }
    return `Common-word optimal was ${optimalEdges} ${optimalEdges === 1 ? "word" : "words"}.`;
  })();

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
          <Button
            variant="primary"
            size="small"
            onClick={() => onShare("score")}
          >
            {copiedKind === "score" ? "Copied!" : "Share"}
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={() => onShare("path")}
          >
            {copiedKind === "path" ? "Copied!" : "Share with path"}
          </Button>
        </div>
      </div>

      <div>
        <span className="wj-victory__path-label">Your path to {t1}</span>
        {renderPath(pathToT1)}
      </div>
      <div>
        <span className="wj-victory__path-label">Your path to {t2}</span>
        {renderPath(pathToT2)}
      </div>

      <div className="wj-victory__continue">
        <button
          type="button"
          className="wj-victory__link"
          onClick={onSwitchToFreePlay}
        >
          Keep playing in free play, if you like →
        </button>
      </div>
    </div>
  );
};
