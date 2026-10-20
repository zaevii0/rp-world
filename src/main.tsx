import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.css";
import "./styles/black-theme.css";
import "./styles/profile-tabs.css";
import "./styles/profile-avatar.css";
import "./styles/modern-font.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
