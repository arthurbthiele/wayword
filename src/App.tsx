import React, { useEffect, useMemo, useState } from "react";
import { GraphProvider } from "./components/GraphProvider";
import { Header, type GameMode } from "./components/Header";
import { StatusStripDaily } from "./components/StatusStripDaily";
import { StatusStripFreePlay } from "./components/StatusStripFreePlay";
import { StatusStripTriple } from "./components/StatusStripTriple";
import { Graph } from "./components/Graph";
import { InputBar } from "./components/InputBar";
import { VictoryPanelDaily } from "./components/VictoryPanelDaily";
import { VictoryPanelTriple } from "./components/VictoryPanelTriple";
import {
  VictoryBannerFreePlay,
  type FreePlayHit,
} from "./components/VictoryBannerFreePlay";
import { HelpModal } from "./components/HelpModal";
import { StatsModal } from "./components/StatsModal";
import { DevPanel } from "./components/DevPanel";
import {
  clearLocalStorage,
  migrateStaleGraphState,
  useLocalStorage,
} from "./utilities/useLocalStorage";
import {
  getDailyPair,
  getRandomDailyPair,
  getLocalDateString,
} from "./utilities/dailyTarget";
import { getDailyTriple } from "./utilities/tripleTarget";
import {
  computeStreak,
  type DailyHistory,
  type TripleHistory,
} from "./utilities/dailyStats";
import { setWordGraph } from "./dictionaryData/wordGraphRef";

const freeplayInitialGraph = {
  nodes: [{ id: "a", label: "a" }],
  edges: [] as { from: string; to: string }[],
  parents: {} as Record<string, string>,
};

const VALID_MODES: GameMode[] = ["daily", "triple", "freeplay"];

const parsePathToMode = (pathname: string): GameMode | null => {
  const segment = pathname.replace(/^\/+|\/+$/g, "").split("/")[0];
  return (VALID_MODES as string[]).includes(segment)
    ? (segment as GameMode)
    : null;
};

const App = () => {
  // The wordGraph data file is ~1.6 MB gzipped on its own; loading it via
  // a dynamic import lets the app shell paint immediately while the
  // dictionary streams in as a separate chunk.
  const [dictReady, setDictReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    import("./dictionaryData/wordGraph").then(({ wordGraph }) => {
      if (cancelled) return;
      setWordGraph(wordGraph);
      setDictReady(true);
      // After the dict is loaded, sanity-check stored graph state: any
      // saved daily/triple graph whose first node doesn't match the
      // picker's start for that date gets cleared. Covers dict-swap
      // mismatches and the rollover-transition edge case for users
      // west of UTC.
      try {
        migrateStaleGraphState(getDailyPair, getDailyTriple);
      } catch {
        // Migration is best-effort; never let it block app load.
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Mode is mirrored to the URL path (/daily, /triple, /freeplay) so
  // each game mode has its own shareable URL and Cloudflare Analytics
  // can split visits by mode. localStorage remembers the most recent
  // mode for the case where the user lands on `/`.
  const [storedMode, setStoredMode] = useLocalStorage<GameMode>(
    "mode",
    "daily"
  );
  const [mode, setModeState] = useState<GameMode>(
    () => parsePathToMode(window.location.pathname) ?? storedMode
  );
  const setMode = (next: GameMode) => {
    setModeState(next);
    setStoredMode(next);
    // Preserve any query string (e.g. ?dev=1) and hash on URL updates.
    const url = `/${next}${window.location.search}${window.location.hash}`;
    if (window.location.pathname !== `/${next}`) {
      window.history.pushState({}, "", url);
    }
  };
  // Sync URL on mount: replaceState (not pushState) so we don't add a
  // history entry just for landing on the right place. Preserve the
  // query string + hash so e.g. `?dev=1` survives the rewrite.
  useEffect(() => {
    if (window.location.pathname !== `/${mode}`) {
      window.history.replaceState(
        {},
        "",
        `/${mode}${window.location.search}${window.location.hash}`
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Back/forward in browser history → switch mode without pushing again.
  useEffect(() => {
    const onPopState = () => {
      const fromUrl = parsePathToMode(window.location.pathname);
      if (fromUrl && fromUrl !== mode) {
        setModeState(fromUrl);
        setStoredMode(fromUrl);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [mode, setStoredMode]);
  const [hasSeenHelp, setHasSeenHelp] = useLocalStorage<boolean>(
    "hasSeenHelp",
    false
  );
  const [helpOpen, setHelpOpen] = useState(!hasSeenHelp);
  const [statsOpen, setStatsOpen] = useState(false);
  // Stored under `stats:` rather than `daily:` so the per-mode Reset
  // button (which clears its mode's prefix) doesn't wipe the long-term
  // streak/history record.
  const [dailyHistory, setDailyHistory] = useLocalStorage<DailyHistory>(
    "stats:dailyHistory",
    {}
  );
  const [tripleHistory, setTripleHistory] = useLocalStorage<TripleHistory>(
    "stats:tripleHistory",
    {}
  );
  const dailyStreak = useMemo(
    () => computeStreak(dailyHistory),
    [dailyHistory]
  );
  const tripleStreak = useMemo(
    () => computeStreak(tripleHistory),
    [tripleHistory]
  );
  const headerStreak =
    mode === "daily"
      ? dailyStreak
      : mode === "triple"
        ? tripleStreak
        : undefined;
  // `today` is held in state (not just computed in render) so we can refresh
  // it when the user comes back to a stale tab — otherwise a tab left open
  // across midnight UTC would keep showing yesterday's puzzle, and worse,
  // re-save yesterday's graph state to today's storage key as soon as
  // something triggers a re-render.
  const [today, setToday] = useState(getLocalDateString);
  useEffect(() => {
    const refresh = () => setToday(getLocalDateString());
    const onVisibility = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  // Dev mode: when `?dev=1` is in the URL, the DevPanel is rendered and the
  // dev-override (if set) replaces the real daily pair. Not deployed —
  // tooling for testing the picker against different difficulties / seeds.
  const devMode =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("dev") === "1";
  const [devDailyOverride, setDevDailyOverride] = useLocalStorage<{
    start: string;
    target: string;
    optimalMoves: number;
  } | null>("dev:dailyOverride", null);

  const dailyPair = useMemo(() => {
    if (!dictReady) return null;
    if (devMode && devDailyOverride) {
      return {
        start: devDailyOverride.start,
        target: devDailyOverride.target,
      };
    }
    return getDailyPair(today);
  }, [today, dictReady, devMode, devDailyOverride]);

  const handleDevReroll = (difficulty: number | undefined) => {
    const pair = getRandomDailyPair(difficulty);
    setDevDailyOverride(pair);
    // Clear daily progress so the new puzzle starts fresh (legitimate words
    // for the previous pair may not connect to the new one).
    clearLocalStorage("daily:");
    setDailySolvedDate(null);
    // Force a hard reload so the GraphProvider remounts with the new pair —
    // its `key` is keyed off `today` which doesn't change here.
    window.location.reload();
  };

  const handleDevClearOverride = () => {
    setDevDailyOverride(null);
    clearLocalStorage("daily:");
    setDailySolvedDate(null);
    window.location.reload();
  };
  const dailyInitialGraph = useMemo(
    () =>
      dailyPair
        ? {
            nodes: [{ id: dailyPair.start, label: dailyPair.start }],
            edges: [] as { from: string; to: string }[],
            parents: {} as Record<string, string>,
          }
        : null,
    [dailyPair?.start]
  );
  const dailyTriple = useMemo(
    () => (dictReady ? getDailyTriple(today) : null),
    [today, dictReady]
  );
  const tripleInitialGraph = useMemo(
    () =>
      dailyTriple
        ? {
            nodes: [{ id: dailyTriple.start, label: dailyTriple.start }],
            edges: [] as { from: string; to: string }[],
            parents: {} as Record<string, string>,
          }
        : null,
    [dailyTriple?.start]
  );
  const [freePlayTarget, setFreePlayTarget] = useLocalStorage<string | null>(
    "freeplay:target",
    null
  );
  const [freePlayPickGraphNodes, setFreePlayPickGraphNodes] = useLocalStorage<
    string[]
  >("freeplay:pickGraphNodes", []);
  const [freePlayHit, setFreePlayHit] = useState<FreePlayHit | null>(null);

  // Victory-panel state lives here (rather than inside each panel) so we can
  // hide the InputBar while the panel is visible — there's nothing to type
  // after solving, and on mobile the disabled input + "Selected X → reach X"
  // tautology eat valuable vertical space.
  //
  // `solvedDate` is lifted (not `today in history`) because Reset clears
  // `daily:*` but intentionally preserves `stats:dailyHistory` — using
  // history as the "solved today" signal would falsely hide the InputBar
  // after a Reset+reload. Dismissed resets on mode switch so a
  // previously-dismissed panel reappears when you come back.
  const [dailySolvedDate, setDailySolvedDate] = useLocalStorage<string | null>(
    "daily:solvedDate",
    null
  );
  const [tripleSolvedDate, setTripleSolvedDate] = useLocalStorage<
    string | null
  >("triple:solvedDate", null);
  const [dailyDismissed, setDailyDismissed] = useState(false);
  const [tripleDismissed, setTripleDismissed] = useState(false);
  useEffect(() => {
    setDailyDismissed(false);
    setTripleDismissed(false);
  }, [mode]);
  const dailySolved = dailySolvedDate === today;
  const tripleSolved = tripleSolvedDate === today;
  const hideInputForDaily = dailySolved && !dailyDismissed;
  const hideInputForTriple = tripleSolved && !tripleDismissed;

  return (
    <div className="wj-app">
      <Header
        mode={mode}
        setMode={setMode}
        onOpenHelp={() => setHelpOpen(true)}
        onOpenStats={() => setStatsOpen(true)}
        streak={headerStreak}
      />
      {!dictReady ||
      !dailyPair ||
      !dailyInitialGraph ||
      !dailyTriple ||
      !tripleInitialGraph ? (
        <main className="wj-graph">
          <div className="wj-graph__inner wj-loading">Loading dictionary…</div>
        </main>
      ) : mode === "daily" ? (
        <GraphProvider
          key={`daily-${today}`}
          keyPrefix={`daily:v2:${today}`}
          initialGraph={dailyInitialGraph}
          initialSelectedWord={dailyPair.start}
        >
          <StatusStripDaily
            start={dailyPair.start}
            target={dailyPair.target}
            onShowResult={
              dailySolved && dailyDismissed
                ? () => setDailyDismissed(false)
                : undefined
            }
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
            onSwitchToFreePlay={() => setMode("freeplay")}
            dismissed={dailyDismissed}
            onDismiss={() => setDailyDismissed(true)}
            solvedDate={dailySolvedDate}
            setSolvedDate={setDailySolvedDate}
          />
          {!hideInputForDaily && (
            <InputBar
              targetReminder={dailyPair.target}
              autoFocus={!dailySolved}
            />
          )}
        </GraphProvider>
      ) : mode === "triple" ? (
        <GraphProvider
          key={`triple-${today}`}
          keyPrefix={`triple:v1:${today}`}
          initialGraph={tripleInitialGraph}
          initialSelectedWord={dailyTriple.start}
        >
          <StatusStripTriple
            start={dailyTriple.start}
            t1={dailyTriple.t1}
            t2={dailyTriple.t2}
            onShowResult={
              tripleSolved && tripleDismissed
                ? () => setTripleDismissed(false)
                : undefined
            }
          />
          <main className="wj-graph">
            <div className="wj-graph__inner">
              <Graph />
            </div>
          </main>
          <VictoryPanelTriple
            start={dailyTriple.start}
            t1={dailyTriple.t1}
            t2={dailyTriple.t2}
            optimalEdges={dailyTriple.optimalEdges}
            history={tripleHistory}
            setHistory={setTripleHistory}
            onSwitchToFreePlay={() => setMode("freeplay")}
            dismissed={tripleDismissed}
            onDismiss={() => setTripleDismissed(true)}
            solvedDate={tripleSolvedDate}
            setSolvedDate={setTripleSolvedDate}
          />
          {!hideInputForTriple && (
            <InputBar
              targetReminder={`${dailyTriple.t1} + ${dailyTriple.t2}`}
              autoFocus={!tripleSolved}
            />
          )}
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
            pickGraphNodes={freePlayPickGraphNodes}
            setPickGraphNodes={setFreePlayPickGraphNodes}
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
      <HelpModal
        open={helpOpen}
        onClose={() => {
          setHelpOpen(false);
          if (!hasSeenHelp) setHasSeenHelp(true);
        }}
      />
      <StatsModal
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        dailyHistory={dailyHistory}
        tripleHistory={tripleHistory}
        initialTab={mode === "triple" ? "triple" : "daily"}
      />
      {devMode && (
        <DevPanel
          currentOverride={devDailyOverride}
          onReroll={handleDevReroll}
          onClearOverride={handleDevClearOverride}
        />
      )}
    </div>
  );
};

export default App;
