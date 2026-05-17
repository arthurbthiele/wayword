import React, {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useRef,
} from "react";
import { GraphContext } from "./GraphProvider";
import { Button } from "./ui/Button";
import { useLocalStorage } from "../utilities/useLocalStorage";
import { legitimateWords } from "../dictionaryData/legitimate";
import { logTargetPaths } from "../utilities/logTargetPaths";
import {
  findRouteFromFrontier,
  findShortestPathFromAnyToTarget,
} from "../utilities/findPath";
import type { FreePlayHit } from "./VictoryBannerFreePlay";

const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 15;

type StatusStripFreePlayProps = {
  target: string | null;
  setTarget: Dispatch<SetStateAction<string | null>>;
  pickGraphNodes: string[];
  setPickGraphNodes: Dispatch<SetStateAction<string[]>>;
  onTargetHit: (hit: FreePlayHit) => void;
};

export const StatusStripFreePlay = ({
  target,
  setTarget,
  pickGraphNodes,
  setPickGraphNodes,
  onTargetHit,
}: StatusStripFreePlayProps) => {
  const [difficulty, setDifficulty] = useLocalStorage<number>(
    "freeplay:difficulty",
    3
  );
  const [score, setScore] = useLocalStorage<number>("freeplay:score", 0);
  const [lastScored, setLastScored] = useLocalStorage<string | null>(
    "freeplay:lastScoredTarget",
    null
  );
  const { graph, depths } = useContext(GraphContext);
  const depthsRef = useRef(depths);
  depthsRef.current = depths;

  const isTrivialPlural = (word: string) =>
    word.endsWith("s") && legitimateWords.has(word.slice(0, -1));

  const pickNewTarget = (level: number): boolean => {
    const candidates = Object.keys(depthsRef.current).filter(
      (word) =>
        depthsRef.current[word] === level &&
        legitimateWords.has(word) &&
        !isTrivialPlural(word)
    );
    if (candidates.length === 0) {
      setTarget(null);
      setPickGraphNodes([]);
      return false;
    }
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    // Snapshot the graph at the moment the target was picked, so when the
    // user reaches it we can walk back their additions and show the chain
    // they typed since the target appeared.
    setTarget(chosen);
    setPickGraphNodes(graph.nodes.map((node: { id: string }) => node.id));
    return true;
  };

  // Initial target on first ever load.
  useEffect(() => {
    if (target === null) pickNewTarget(difficulty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Log paths to the console whenever the target changes.
  useEffect(() => {
    if (target) logTargetPaths("free-play", target);
  }, [target]);

  // Credit when target reached; fire the victory banner and pick next.
  useEffect(() => {
    if (!target) return;
    const reached = graph.nodes.some(
      (node: { id: string }) => node.id === target
    );
    if (reached && lastScored !== target) {
      const routeFromPick = findRouteFromFrontier(
        graph.parents,
        new Set(pickGraphNodes),
        target
      );
      // Same shape as daily's "common-word optimal": shortest legitimate-only
      // path from any of the pick-time graph nodes to the target.
      const optimalPath = findShortestPathFromAnyToTarget(
        pickGraphNodes,
        target,
        legitimateWords
      );
      setLastScored(target);
      setScore((previousScore) => previousScore + difficulty ** 2);
      const foundNext = pickNewTarget(difficulty);
      const milestone = foundNext
        ? undefined
        : `You've reached every legitimate word at difficulty ${difficulty}. Try a different difficulty!`;
      onTargetHit({
        target,
        userPath: routeFromPick ?? [target],
        optimalPath,
        milestone,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph.nodes, target, lastScored, difficulty]);

  const onPlus = () => {
    if (difficulty < MAX_DIFFICULTY) {
      setDifficulty(difficulty + 1);
      pickNewTarget(difficulty + 1);
    }
  };
  const onMinus = () => {
    if (difficulty > MIN_DIFFICULTY) {
      setDifficulty(difficulty - 1);
      pickNewTarget(difficulty - 1);
    }
  };

  return (
    <div className="wj-status">
      <div className="wj-status__target">
        <span className="wj-status__label">Reach</span>
        <span className="wj-status__word">{target ?? "—"}</span>
      </div>
      <div className="wj-status__meta">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>Difficulty</span>
          <Button
            variant="outlined"
            size="small"
            onClick={onMinus}
            disabled={difficulty <= MIN_DIFFICULTY}
            aria-label="Decrease difficulty"
          >
            −
          </Button>
          <strong>{difficulty}</strong>
          <Button
            variant="outlined"
            size="small"
            onClick={onPlus}
            disabled={difficulty >= MAX_DIFFICULTY}
            aria-label="Increase difficulty"
          >
            +
          </Button>
        </div>
        <span>
          Score <strong>{score}</strong>
        </span>
      </div>
    </div>
  );
};
