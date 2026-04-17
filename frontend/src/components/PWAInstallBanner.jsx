import { useEffect, useState } from 'react';

const STORAGE_KEY = 'pwa_install_dismissed';

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
}

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIOS, setShowIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isInStandaloneMode()) return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;

    if (isIOS() && isSafari()) {
      // Mostra banner iOS dopo 3 secondi
      const t = setTimeout(() => setShowIOS(true), 3000);
      return () => clearTimeout(t);
    }

    // Android/Chrome: intercetta beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowAndroid(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallAndroid = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowAndroid(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, '1');
    setShowAndroid(false);
    setShowIOS(false);
    setDismissed(true);
  };

  if (dismissed || (!showAndroid && !showIOS)) return null;

  // Banner Android
  if (showAndroid) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
        <div className="bg-[#2D1B14] text-white rounded-2xl shadow-2xl p-4 flex items-center gap-3">
          <img src="/icons/icon-96x96.png" alt="app icon" className="w-12 h-12 rounded-xl flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">Aggiungi alla Home</p>
            <p className="text-xs text-white/70">Accesso rapido al gestionale</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <button
              onClick={handleInstallAndroid}
              className="bg-[#E8477C] text-white text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap"
            >
              Installa
            </button>
            <button
              onClick={handleDismiss}
              className="text-white/50 text-xs text-center hover:text-white/80"
            >
              No grazie
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Banner iOS
  if (showIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
        <div className="bg-[#2D1B14] text-white rounded-2xl shadow-2xl p-4">
          <div className="flex items-start gap-3 mb-3">
            <img src="/icons/icon-96x96.png" alt="app icon" className="w-10 h-10 rounded-xl flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-sm">Aggiungi alla Home</p>
              <p className="text-xs text-white/70">Accesso rapido come un'app</p>
            </div>
            <button onClick={handleDismiss} className="text-white/40 hover:text-white text-lg leading-none">×</button>
          </div>
          <div className="bg-white/10 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="bg-white/20 rounded-lg p-1.5">
                {/* Share icon */}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </span>
              <span>Tocca <strong>Condividi</strong> (icona in basso)</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="bg-white/20 rounded-lg p-1.5">
                {/* Plus icon */}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </span>
              <span>Scegli <strong>"Aggiungi a Home"</strong></span>
            </div>
          </div>
          {/* Arrow pointing down to address bar */}
          <div className="flex justify-center mt-2">
            <svg className="w-6 h-6 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
