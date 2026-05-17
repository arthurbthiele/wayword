import { InstructionsController } from "./InstructionsController";
import { Graph } from "./Graph";
import { WordInput } from "./WordInput";

export const PageContents = ({ targetPanel }) => (
  <>
    <Graph />
    <WordInput />
    {targetPanel}
    <InstructionsController />
  </>
);
