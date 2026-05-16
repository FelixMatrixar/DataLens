import React from "react";
import { createRoot } from "react-dom/client";
import ControlApp from "./ControlApp";
import OverlayApp from "./OverlayApp";

const params = new URLSearchParams(window.location.search);
const isOverlay = params.get("window") === "overlay";

createRoot(document.getElementById("root")!).render(
  isOverlay ? <OverlayApp /> : <ControlApp />
);
