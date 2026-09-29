"use client";

import { useState, useEffect, useRef } from "react";
import { Wifi, WifiOff, AlertTriangle, X } from "lucide-react";

const PING_INTERVAL_MS = 15_000;

function classify(rttMs) {
  if (rttMs < 400)  return "excellent";
  if (rttMs < 900)  return "bon";
  if (rttMs < 1800) return "moyen";
  return "instable";
}

const CONFIG = {
  excellent: { label: "Connexion excellente", dot: "bg-emerald-500",  text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", warn: false },
  bon:       { label: "Bonne connexion",      dot: "bg-emerald-400",  text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", warn: false },
  moyen:     { label: "Connexion moyenne",    dot: "bg-amber-400",    text: "text-amber-600 dark:text-amber-400",     bg: "bg-amber-50 dark:bg-amber-500/10",     warn: true  },
  instable:  { label: "Connexion instable",   dot: "bg-red-500 animate-pulse", text: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10",       warn: true  },
  offline:   { label: "Hors-ligne",           dot: "bg-red-500 animate-pulse", text: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10",       warn: true  },
};

const WARN_MSG = {
  moyen:    "Votre connexion semble lente. L'envoi de l'audio peut prendre plus de temps que d'habitude.",
  instable: "Connexion instable détectée. Si l'envoi échoue, l'enregistrement sera sauvegardé automatiquement.",
  offline:  "Vous êtes hors-ligne. L'enregistrement sera sauvegardé et envoyé au retour du réseau.",
};

export default function ConnectionQuality() {
  const [quality, setQuality]       = useState(null);
  const [dismissed, setDismissed]   = useState(false);
  const pingTimerRef                = useRef(null);
  const dismissedQualityRef         = useRef(null);

  const doPing = async () => {
    if (!navigator.onLine) { setQuality("offline"); return; }
    const t0 = performance.now();
    try {
      await fetch("/api/ping", { cache: "no-store" });
      const rtt = performance.now() - t0;
      setQuality(classify(rtt));
    } catch {
      setQuality("instable");
    }
  };

  useEffect(() => {
    // Network Information API (Chrome/Edge)
    const nav = navigator;
    const conn = nav.connection ?? nav.mozConnection ?? nav.webkitConnection;
    if (conn) {
      const onConnChange = () => {
        const type = conn.effectiveType;
        if (type === "slow-2g" || type === "2g") setQuality("instable");
        else if (type === "3g") setQuality("moyen");
      };
      conn.addEventListener("change", onConnChange);
    }

    window.addEventListener("online",  () => { setQuality(null); doPing(); });
    window.addEventListener("offline", () => setQuality("offline"));

    doPing();
    pingTimerRef.current = setInterval(doPing, PING_INTERVAL_MS);

    return () => {
      clearInterval(pingTimerRef.current);
    };
  }, []);

  // Reset dismiss when quality worsens
  useEffect(() => {
    if (quality && quality !== dismissedQualityRef.current) {
      setDismissed(false);
    }
  }, [quality]);

  if (!quality) return null;

  const cfg = CONFIG[quality];
  const showBanner = cfg.warn && !dismissed;

  return (
    <>
      {/* Petit indicateur persistant (toujours visible) */}
      <div className={`flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
        {quality === "offline" ? <WifiOff size={11} /> : <Wifi size={11} />}
        {cfg.label}
      </div>

      {/* Bannière d'avertissement */}
      {showBanner && (
        <div className={`w-full max-w-5xl flex items-start gap-3 px-4 py-3 rounded-2xl border animate-in fade-in slide-in-from-top-2 duration-300 ${cfg.bg} ${quality === "instable" || quality === "offline" ? "border-red-200 dark:border-red-500/30" : "border-amber-200 dark:border-amber-500/30"}`}>
          <div className={`mt-0.5 shrink-0 ${cfg.text}`}>
            {quality === "offline" ? <WifiOff size={15} /> : <AlertTriangle size={15} />}
          </div>
          <p className={`text-xs font-bold flex-1 leading-relaxed ${cfg.text}`}>
            {WARN_MSG[quality]}
          </p>
          <button
            onClick={() => { setDismissed(true); dismissedQualityRef.current = quality; }}
            className={`${cfg.text} opacity-60 hover:opacity-100 transition-opacity mt-0.5`}
          >
            <X size={13} />
          </button>
        </div>
      )}
    </>
  );
}
