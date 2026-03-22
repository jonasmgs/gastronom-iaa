import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./i18n";

async function bootstrap() {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    const resetKey = "__lovable_sw_reset_v1";
    const hasReset = sessionStorage.getItem(resetKey) === "1";
    const registrations = await navigator.serviceWorker.getRegistrations();

    if (!hasReset && registrations.length > 0) {
      sessionStorage.setItem(resetKey, "1");
      await Promise.all(registrations.map((registration) => registration.unregister()));

      if ("caches" in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      }

      window.location.reload();
      return;
    }
  }

  createRoot(document.getElementById("root")!).render(<App />);
}

void bootstrap();
