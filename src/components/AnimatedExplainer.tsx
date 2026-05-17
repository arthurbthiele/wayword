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
    chain: ["a", "at", "art"],
    caption: "Add another to get 'art'.",
  },
  {
    chain: ["a", "at", "art", "cart"],
    caption: "Add a 'c' to get 'cart'.",
  },
  {
    chain: ["a", "at", "art", "cart", "card"],
    caption: "Or change a letter — 'cart' → 'card'.",
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
        {chain.map((word, index) => (
          <React.Fragment key={`${index}-${word}`}>
            {index > 0 && (
              <span
                className="wj-explainer__edge"
                style={{ animationDelay: `${index * 0.08}s` }}
              />
            )}
            <span
              className={`wj-explainer__node ${index === activeIndex ? "wj-explainer__node--active" : ""}`}
              style={{ animationDelay: `${index * 0.08}s` }}
            >
              {word}
            </span>
          </React.Fragment>
        ))}
      </div>
      <div className="wj-explainer__caption">{caption}</div>
    </div>
  );
};
