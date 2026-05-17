import { Instructions } from "./Instructions";
import { ShowInstructionsButton } from "./ShowInstructionsButton";
import { useLocalStorage } from "../../utilities/useLocalStorage";

export const InstructionsController = () => {
  const [showInstructions, setShowInstructions] = useLocalStorage(
    "showInstructions",
    true
  );
  const toggleShowInstructions = () => {
    setShowInstructions(!showInstructions);
  };

  return (
    <div style={{ position: "absolute", left: 16, bottom: 16 }}>
      {showInstructions && <Instructions />}
      <ShowInstructionsButton
        onClick={toggleShowInstructions}
        pressed={showInstructions}
      />
    </div>
  );
};
