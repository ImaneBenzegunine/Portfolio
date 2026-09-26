import { hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-serif-display/latin-400.css";
import "@fontsource/dm-serif-display/latin-400-italic.css";
import "./styles.css";
import "./themes.css";
import "./work.css";
hydrateRoot(
  document.getElementById("root")!,
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
