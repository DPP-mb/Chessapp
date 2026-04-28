import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ChessScoreApp from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ChessScoreApp />
  </StrictMode>
);
