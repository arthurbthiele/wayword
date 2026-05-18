// Wire the lazy wordGraph singleton up for tests. In production App.tsx does
// this via dynamic import after mount; the dynamic chunk lets the app shell
// paint instantly. Tests don't care about bundle size, so we just load it
// synchronously here before any test runs.
import { wordGraph } from "./dictionaryData/wordGraph";
import { setWordGraph } from "./dictionaryData/wordGraphRef";

setWordGraph(wordGraph);
