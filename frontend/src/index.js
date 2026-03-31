import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Registra PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // Pulisci vecchie cache obsolete
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        if (name.startsWith('salone-')) {
          await caches.delete(name);
        }
      }
      // Registra il nuovo SW
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registrato:', reg.scope);
    } catch (e) {
      console.log('SW errore:', e);
    }
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
