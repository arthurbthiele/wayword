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
import { FreePlayIntroModal } from "./components/FreePlayIntroModal";
import { StatsModal } from "./components/StatsModal";
import { DevPanel } from "./components/DevPanel";
import {
  clearLocalStorage,
  migrateStaleGraphState,
  useLocalStorage,
} from "./utilities/useLocalStorage";
import {
  getRandomDailyPair,
  getLocalDateString,
} from "./utilities/dailyTarget";
import { loadOrPickDaily, loadOrPickTriple } from "./utilities/puzzleCache";
import { getWordGraph } from "./dictionaryData/wordGraphRef";
import {
  computeStreak,
  type DailyHistory,
  type TripleHistory,
} from "./utilities/dailyStats";
import { setWordGraph } from "./dictionaryData/wordGraphRef";
// `getWordGraph` imported above for the migration's orphan-word check.
import { setDisconnectedValidWords } from "./dictionaryData/disconnectedValidWordsRef";

const freeplayInitialGraph = {
  nodes: [{ id: "a", label: "a" }],
  edges: [] as { from: string; to: string }[],
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
    // wordGraph is the playable dictionary — gates dictReady because the
    // user can't type until we know what's allowed.
    import("./dictionaryData/wordGraph").then(({ wordGraph }) => {
      if (cancelled) return;
      setWordGraph(wordGraph);
      setDictReady(true);
      // After the dict is loaded, sanity-check stored graph state: any
      // saved daily/triple graph whose start word is no longer in the
      // playable dictionary gets cleared (orphan-word check). Other
      // dict-shift cases are tolerated — the per-date puzzle cache
      // makes the user's stored puzzle authoritative regardless of
      // current picker output.
      try {
        const wordGraph = getWordGraph();
        migrateStaleGraphState((word) => word in wordGraph);
      } catch {
        // Migration is best-effort; never let it block app load.
      }
    });
    // disconnectedValidBloom powers friendlier rejection messages ("X is
    // a word, but not one edit from Y"). Bloom-encoded for ~290 KB instead
    // of ~1.4 MB; loads lazily off the critical path, so if the user
    // types a disconnected-valid word before it arrives they fall through
    // to the plain "X is not a word" message.
    import("./dictionaryData/disconnectedValidBloom").then(
      ({ disconnectedValidBloom }) => {
        if (cancelled) return;
        setDisconnectedValidWords(disconnectedValidBloom);
      }
    );
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
  const [hasSeenFreePlayIntro, setHasSeenFreePlayIntro] =
    useLocalStorage<boolean>("hasSeenFreePlayIntro", false);
  const [freePlayIntroOpen, setFreePlayIntroOpen] = useState(false);
  // Open the free-play intro the first time the user lands on free play.
  // Tracked independently of the help-modal flag so existing players who've
  // seen Help but never used free play still get the explainer.
  useEffect(() => {
    if (mode === "freeplay" && !hasSeenFreePlayIntro && !helpOpen) {
      setFreePlayIntroOpen(true);
    }
  }, [mode, hasSeenFreePlayIntro, helpOpen]);
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
  // `activeDate` is the date of the puzzle this user is currently
  // playing. Initialised once at mount = current local date, then sticky
  // for the rest of the session. We deliberately do NOT refresh it on
  // focus or visibility events, so a user who started the puzzle at
  // 11:55pm and finishes at 12:15am stays on the same puzzle and gets
  // their solve recorded under the started date.
  //
  // A page refresh re-initialises (fresh mount → activeDate = whatever
  // today is at that moment). So crossing midnight + reloading = today's
  // new puzzle, yesterday's progress silently abandoned in localStorage.
  // That's the trade we picked over a "continue yesterday?" UI prompt.
  const [activeDate] = useState(getLocalDateString);
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
    return loadOrPickDaily(activeDate);
  }, [activeDate, dictReady, devMode, devDailyOverride]);

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
          }
        : null,
    [dailyPair?.start]
  );
  const dailyTriple = useMemo(
    () => (dictReady ? loadOrPickTriple(activeDate) : null),
    [activeDate, dictReady]
  );
  const tripleInitialGraph = useMemo(
    () =>
      dailyTriple
        ? {
            nodes: [{ id: dailyTriple.start, label: dailyTriple.start }],
            edges: [] as { from: string; to: string }[],
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
  // Hints used on today's daily. Date-keyed so Reset (which clears
  // `daily:*`) clears them too, and the count is recorded into history
  // when the puzzle is solved.
  const [dailyHintsUsed, setDailyHintsUsed] = useLocalStorage<number>(
    `daily:v2:${activeDate}:hintsUsed`,
    0
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
  const dailySolved = dailySolvedDate === activeDate;
  const tripleSolved = tripleSolvedDate === activeDate;
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
          key={`daily-${activeDate}`}
          keyPrefix={`daily:v2:${activeDate}`}
          initialGraph={dailyInitialGraph}
          initialSelectedWord={dailyPair.start}
        >
          <StatusStripDaily
            puzzleDate={activeDate}
            start={dailyPair.start}
            target={dailyPair.target}
            hintsUsed={dailyHintsUsed}
            onHintUsed={() => setDailyHintsUsed(dailyHintsUsed + 1)}
            onShowResult={
              dailySolved && dailyDismissed
                ? () => setDailyDismissed(false)
                : undefined
            }
          />
          <main className="wj-graph">
            <div className="wj-graph__inner">
              <Graph
                startWord={dailyPair.start}
                terminalWords={[dailyPair.target]}
              />
            </div>
          </main>
          <VictoryPanelDaily
            puzzleDate={activeDate}
            start={dailyPair.start}
            target={dailyPair.target}
            history={dailyHistory}
            setHistory={setDailyHistory}
            onSwitchToFreePlay={() => setMode("freeplay")}
            dismissed={dailyDismissed}
            onDismiss={() => setDailyDismissed(true)}
            solvedDate={dailySolvedDate}
            setSolvedDate={setDailySolvedDate}
            hintsUsed={dailyHintsUsed}
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
          key={`triple-${activeDate}`}
          keyPrefix={`triple:v1:${activeDate}`}
          initialGraph={tripleInitialGraph}
          initialSelectedWord={dailyTriple.start}
        >
          <StatusStripTriple
            puzzleDate={activeDate}
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
              <Graph
                startWord={dailyTriple.start}
                terminalWords={[dailyTriple.t1, dailyTriple.t2]}
              />
            </div>
          </main>
          <VictoryPanelTriple
            puzzleDate={activeDate}
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
          <InputBar
            targetReminder={freePlayTarget}
            autoFocus={!freePlayIntroOpen}
            substringHighlight
          />
        </GraphProvider>
      )}
      <HelpModal
        open={helpOpen}
        onClose={() => {
          setHelpOpen(false);
          if (!hasSeenHelp) setHasSeenHelp(true);
        }}
      />
      <FreePlayIntroModal
        open={freePlayIntroOpen}
        onClose={() => {
          setFreePlayIntroOpen(false);
          if (!hasSeenFreePlayIntro) setHasSeenFreePlayIntro(true);
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
