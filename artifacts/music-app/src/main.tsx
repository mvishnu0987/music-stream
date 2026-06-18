import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

if (import.meta.env.PROD) {
  // Point the API client directly to your Render backend URL in production
  setBaseUrl("https://music-stream-uxlq.onrender.com");
}

createRoot(document.getElementById("root")!).render(<App />);
