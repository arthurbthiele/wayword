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

const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 15;

type StatusStripFreePlayProps = {
  target: string | null;
  setTarget: Dispatch<SetStateAction<string | null>>;
};

export const StatusStripFreePlay = ({
  target,
  setTarget,
}: StatusStripFreePlayProps) => {
  const [difficulty, setDifficulty] = useLocalStorage<number>(
    "freeplay:difficulty",
    1
  );
  const [score, setScore] = useLocalStorage<number>("freeplay:score", 0);
  const [lastScored, setLastScored] = useLocalStorage<string | null>(
    "freeplay:lastScoredTarget",
    null
  );
  const { graph, depths } = useContext(GraphContext);
  const depthsRef = useRef(depths);
  depthsRef.current = depths;

  const pickNewTarget = (level: number) => {
    const candidates = Object.keys(depthsRef.current).filter(
      (word) =>
        depthsRef.current[word] === level && legitimateWords.has(word)
    );
    if (candidates.length === 0) {
      setTarget(null);
      return;
    }
    setTarget(candidates[Math.floor(Math.random() * candidates.length)]);
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

  // Credit when target reached; pick next.
  useEffect(() => {
    if (!target) return;
    const reached = graph.nodes.some(
      (node: { id: string }) => node.id === target
    );
    if (reached && lastScored !== target) {
      setLastScored(target);
      setScore((previousScore) => previousScore + difficulty ** 2);
      pickNewTarget(difficulty);
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
