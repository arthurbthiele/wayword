import React, { useEffect, useState } from "react";

type Step = {
  chain: string[];
  caption: string;
};

const steps: Step[] = [
  { chain: ["a"], caption: "Start with 'a' — the only node so far." },
  {
    chain: ["a", "at"],
    caption: "Add a letter to get 'at'.",
  },
  {
    chain: ["a", "at", "cat"],
    caption: "Add another to get 'cat'.",
  },
  {
    chain: ["a", "at", "cat", "bat"],
    caption: "Or change a letter — 'cat' → 'bat'.",
  },
];

const STEP_DURATION_MS = 3200;

export const AnimatedExplainer = () => {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setStepIndex((current) => (current + 1) % steps.length);
    }, STEP_DURATION_MS);
    return () => window.clearInterval(interval);
  }, []);

  const { chain, caption } = steps[stepIndex];
  const activeIndex = chain.length - 1;

  return (
    <div className="wj-explainer">
      <div className="wj-explainer__chain" key={stepIndex}>
        {chain.map((word, index) => {
          const node = (
            <span
              className={`wj-explainer__node ${index === activeIndex ? "wj-explainer__node--active" : ""}`}
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              {word}
            </span>
          );
          if (index === 0) {
            return <React.Fragment key={`${index}-${word}`}>{node}</React.Fragment>;
          }
          // Group each arrow with its following node so flex-wrap never
          // splits them across lines (orphaned dangling arrow looks bad).
          return (
            <span className="wj-explainer__step" key={`${index}-${word}`}>
              <span
                className="wj-explainer__edge"
                style={{ animationDelay: `${index * 0.08}s` }}
              />
              {node}
            </span>
          );
        })}
      </div>
      <div className="wj-explainer__caption">{caption}</div>
    </div>
  );
};
