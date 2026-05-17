import React, { useState } from "react";
import { GraphProvider } from "./components/GraphProvider";
import { Header, type GameMode } from "./components/Header";
import { StatusStripDaily } from "./components/StatusStripDaily";
import { StatusStripFreePlay } from "./components/StatusStripFreePlay";
import { Graph } from "./components/Graph";
import { InputBar } from "./components/InputBar";
import { VictoryPanelDaily } from "./components/VictoryPanelDaily";
import { HelpModal } from "./components/HelpModal";
import {
  useLocalStorage,
  migrateLegacyFreePlayKeys,
} from "./utilities/useLocalStorage";
import {
  getLocalDateString,
  getTargetForDate,
} from "./utilities/dailyTarget";

migrateLegacyFreePlayKeys();

const dailyInitialGraph = {
  nodes: [{ id: "a", label: "a" }],
  edges: [] as { from: string; to: string }[],
};

const freeplayInitialGraph = {
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

const App = () => {
  const [mode, setMode] = useLocalStorage<GameMode>("mode", "daily");
  const [helpOpen, setHelpOpen] = useState(false);
  const today = getLocalDateString();
  const dailyTarget = getTargetForDate(today);
  const [freePlayTarget, setFreePlayTarget] = useLocalStorage<string | null>(
    "freeplay:target",
    null
  );

  return (
    <div className="wj-app">
      <Header
        mode={mode}
        setMode={setMode}
        onOpenHelp={() => setHelpOpen(true)}
      />
      {mode === "daily" ? (
        <GraphProvider
          keyPrefix={`daily:${today}`}
          initialGraph={dailyInitialGraph}
          initialSelectedWord="a"
        >
          <StatusStripDaily />
          <main className="wj-graph">
            <div className="wj-graph__inner">
              <Graph />
            </div>
          </main>
          <VictoryPanelDaily />
          <InputBar targetReminder={dailyTarget} />
        </GraphProvider>
      ) : (
        <GraphProvider
          keyPrefix="freeplay"
          initialGraph={freeplayInitialGraph}
          initialSelectedWord="art"
        >
          <StatusStripFreePlay
            target={freePlayTarget}
            setTarget={setFreePlayTarget}
          />
          <main className="wj-graph">
            <div className="wj-graph__inner">
              <Graph />
            </div>
          </main>
          <InputBar targetReminder={freePlayTarget} />
        </GraphProvider>
      )}
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
};

export default App;
