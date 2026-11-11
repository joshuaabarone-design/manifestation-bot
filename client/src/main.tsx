import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { queryClient } from "./lib/queryClient";
import { hydrateOfflineCache, persistOfflineCache, flushJournalQueue } from "./lib/native/offline";
import { initNative, hideSplash } from "./lib/native";

async function boot() {
  // iOS: restore the encrypted offline cache before first render so content shows without a network.
  await hydrateOfflineCache(queryClient).catch(() => undefined);
  persistOfflineCache(queryClient);
  await initNative({
    onOnline: () => void flushJournalQueue(queryClient),
    onResume: () => void flushJournalQueue(queryClient),
  });
  createRoot(document.getElementById("root")!).render(<App />);
  void hideSplash();
  void flushJournalQueue(queryClient);
}

void boot();
