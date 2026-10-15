import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { startReminderSync } from "./lib/nativeReminders";
import { isNative } from "./lib/platform";
import { ANALYTICS_TOKEN } from "./lib/site";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if (isNative) {
  // The app shell serves files locally, so no service worker; keep reminders in sync instead.
  startReminderSync();
} else if (import.meta.env.PROD) {
  startAnalytics();
}

if (!isNative && import.meta.env.PROD && "serviceWorker" in navigator) {
  // Only in production builds: a service worker in dev would cache stale modules.
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // Offline support is a nice-to-have; the app works without it.
    });
  });
}

/** Cookie-free Cloudflare page counts, website only (see privacy.html). Never sends anything from the log. */
function startAnalytics() {
  if (!ANALYTICS_TOKEN) return;
  const s = document.createElement("script");
  s.defer = true;
  s.src = "https://static.cloudflareinsights.com/beacon.min.js";
  s.dataset.cfBeacon = JSON.stringify({ token: ANALYTICS_TOKEN });
  document.head.appendChild(s);
}
