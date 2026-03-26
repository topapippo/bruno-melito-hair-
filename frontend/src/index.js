import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Unregister old caching service worker and clear stale caches
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        if (reg.active && reg.active.scriptURL.includes('/sw.js')) {
          await reg.unregister();
          console.log('Old SW unregistered');
        }
      }
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        if (name.startsWith('salone-')) {
          await caches.delete(name);
          console.log('Deleted cache:', name);
        }
      }
    } catch (e) {
      console.log('SW cleanup error:', e);
    }
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
