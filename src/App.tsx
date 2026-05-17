import React, { useMemo, useState } from "react";
import { GraphProvider } from "./components/GraphProvider";
import { Header, type GameMode } from "./components/Header";
import { StatusStripDaily } from "./components/StatusStripDaily";
import { StatusStripFreePlay } from "./components/StatusStripFreePlay";
import { Graph } from "./components/Graph";
import { InputBar } from "./components/InputBar";
import { VictoryPanelDaily } from "./components/VictoryPanelDaily";
import {
  VictoryBannerFreePlay,
  type FreePlayHit,
} from "./components/VictoryBannerFreePlay";
import { HelpModal } from "./components/HelpModal";
import { StatsModal } from "./components/StatsModal";
import {
  useLocalStorage,
  migrateDailyToV2,
  migrateLegacyFreePlayKeys,
} from "./utilities/useLocalStorage";
import { getDailyPair, getLocalDateString } from "./utilities/dailyTarget";
import {
  computeStreak,
  type DailyHistory,
} from "./utilities/dailyStats";

migrateLegacyFreePlayKeys();
migrateDailyToV2();

const freeplayInitialGraph = {
  nodes: [{ id: "a", label: "a" }],
  edges: [] as { from: string; to: string }[],
  parents: {} as Record<string, string>,
};

const App = () => {
  const [mode, setMode] = useLocalStorage<GameMode>("mode", "daily");
  const [helpOpen, setHelpOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  // Stored under `stats:` rather than `daily:` so the per-mode Reset
  // button (which clears its mode's prefix) doesn't wipe the long-term
  // streak/history record.
  const [dailyHistory, setDailyHistory] = useLocalStorage<DailyHistory>(
    "stats:dailyHistory",
    {}
  );
  const streak = useMemo(
    () => computeStreak(dailyHistory),
    [dailyHistory]
  );
  const today = getLocalDateString();
  const dailyPair = useMemo(() => getDailyPair(today), [today]);
  const dailyInitialGraph = useMemo(
    () => ({
      nodes: [{ id: dailyPair.start, label: dailyPair.start }],
      edges: [] as { from: string; to: string }[],
      parents: {} as Record<string, string>,
    }),
    [dailyPair.start]
  );
  const [freePlayTarget, setFreePlayTarget] = useLocalStorage<string | null>(
    "freeplay:target",
    null
  );
  const [freePlayQualifyingPath, setFreePlayQualifyingPath] = useLocalStorage<
    string[] | null
  >("freeplay:qualifyingPath", null);
  const [freePlayHit, setFreePlayHit] = useState<FreePlayHit | null>(null);

  return (
    <div className="wj-app">
      <Header
        mode={mode}
        setMode={setMode}
        onOpenHelp={() => setHelpOpen(true)}
        onOpenStats={() => setStatsOpen(true)}
        streak={mode === "daily" ? streak : undefined}
      />
      {mode === "daily" ? (
        <GraphProvider
          key="daily"
          keyPrefix={`daily:v2:${today}`}
          initialGraph={dailyInitialGraph}
          initialSelectedWord={dailyPair.start}
        >
          <StatusStripDaily
            start={dailyPair.start}
            target={dailyPair.target}
          />
          <main className="wj-graph">
            <div className="wj-graph__inner">
              <Graph />
            </div>
          </main>
          <VictoryPanelDaily
            start={dailyPair.start}
            target={dailyPair.target}
            history={dailyHistory}
            setHistory={setDailyHistory}
          />
          <InputBar targetReminder={dailyPair.target} />
        </GraphProvider>
      ) : (
        <GraphProvider
          key="freeplay"
          keyPrefix="freeplay"
          initialGraph={freeplayInitialGraph}
          initialSelectedWord="a"
        >
          <StatusStripFreePlay
            target={freePlayTarget}
            setTarget={setFreePlayTarget}
            qualifyingPath={freePlayQualifyingPath}
            setQualifyingPath={setFreePlayQualifyingPath}
            onTargetHit={setFreePlayHit}
          />
          <main className="wj-graph">
            <div className="wj-graph__inner">
              <Graph />
            </div>
          </main>
          <VictoryBannerFreePlay
            hit={freePlayHit}
            onClose={() => setFreePlayHit(null)}
          />
          <InputBar targetReminder={freePlayTarget} />
        </GraphProvider>
      )}
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <StatsModal
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        history={dailyHistory}
      />
    </div>
  );
};

export default App;
