import { PageContainer } from "./components/PageContainer";
import { PageContents } from "./components/PageContents";
import { GraphProvider } from "./components/GraphProvider";
import { ModeToggle } from "./components/ModeToggle";
import { TargetWord } from "./components/TargetWord";
import { DailyTargetPanel } from "./components/DailyTargetPanel";
import {
  useLocalStorage,
  migrateLegacyFreePlayKeys,
} from "./utilities/useLocalStorage";
import { getLocalDateString } from "./utilities/dailyTarget";

type GameMode = "daily" | "freeplay";

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
  const today = getLocalDateString();

  return (
    <PageContainer>
      <ModeToggle mode={mode} setMode={setMode} />
      {mode === "daily" ? (
        <GraphProvider
          keyPrefix={`daily:${today}`}
          initialGraph={dailyInitialGraph}
          initialSelectedWord="a"
        >
          <PageContents targetPanel={<DailyTargetPanel />} />
        </GraphProvider>
      ) : (
        <GraphProvider
          keyPrefix="freeplay"
          initialGraph={freeplayInitialGraph}
          initialSelectedWord="art"
        >
          <PageContents targetPanel={<TargetWord />} />
        </GraphProvider>
      )}
    </PageContainer>
  );
};

export default App;
