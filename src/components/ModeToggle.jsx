import React from "react";
import { Button } from "@material-ui/core";

export const ModeToggle = ({ mode, setMode }) => {
  const buttonStyle = (forMode) => ({
    margin: 4,
    fontWeight: mode === forMode ? "bold" : "normal",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 10,
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        border: "1px solid rgba(0, 0, 0, 0.3)",
        borderRadius: 10,
        padding: 4,
      }}
    >
      <Button
        onClick={() => setMode("daily")}
        variant={mode === "daily" ? "contained" : "outlined"}
        color="primary"
        size="small"
        style={buttonStyle("daily")}
      >
        Daily
      </Button>
      <Button
        onClick={() => setMode("freeplay")}
        variant={mode === "freeplay" ? "contained" : "outlined"}
        color="primary"
        size="small"
        style={buttonStyle("freeplay")}
      >
        Free play
      </Button>
    </div>
  );
};
