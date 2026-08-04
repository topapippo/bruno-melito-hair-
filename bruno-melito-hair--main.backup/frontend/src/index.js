import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Registra PWA Service Worker (solo in produzione: in dev intercetta i fetch
// e se il dev server non risponde mostra "Contenuto non disponibile offline")
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
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
    } catch (e) {
    }
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
