"use client";
// Coque de la démo du salon : navbar identique à components/Navbar.jsx (mêmes classes), état
// partagé (demo-context) et API factice. La navbar réelle n'est pas réutilisée telle quelle : elle
// dépend de la session (déconnexion, notifications serveur), ce que la démo ne doit pas toucher.
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactSVG } from "react-svg";
import { Home, Bell, Sun, Moon, Users, Calculator, BookOpen, RotateCcw, LayoutDashboard, Building2 } from "lucide-react";
import { motion, LayoutGroup, AnimatePresence } from "framer-motion";
import { DemoProvider, useDemo } from "./demo-context";
import { installerApiFactice } from "./mock-api";
import { installerFausseReconnaissance } from "./faux-micro";
import { PRATICIEN_DEMO } from "./data";

const BASE = "/demo/salon";
// Les <Link> et le routeur préfixent le sous-chemin de GitHub Pages, pas les URL d'image.
const PREFIXE = process.env.NEXT_PUBLIC_BASE_PATH || "";

function NavItem({ href, icon, label, active, onClick }) {
  const contenu = (
    <>
      {active && (
        <motion.span layoutId="nav-pill" className="absolute inset-0 bg-[#4931F7]/15 dark:bg-[#4ECDC4]/30 rounded-full"
          transition={{ type: "spring", bounce: 0.22, duration: 0.42 }} />
      )}
      <span className={`relative z-10 flex items-center gap-2 px-5 py-2.5 font-bold text-sm transition-colors duration-150 ${
        active ? "text-[#4931F7] dark:text-[#4ECDC4]" : "text-gray-500 dark:text-gray-400 hover:text-[#001F3F] dark:hover:text-white"
      }`}>
        {icon}
        <span className="hidden sm:inline">{label}</span>
      </span>
    </>
  );
  const classe = "relative flex items-center rounded-full text-current no-underline";
  return href ? <Link href={href} className={classe}>{contenu}</Link> : <button onClick={onClick} className={classe}>{contenu}</button>;
}

function MobileNavItem({ href, icon, active, onClick }) {
  const contenu = (
    <>
      {active && (
        <motion.span layoutId="mobile-nav-pill" className="absolute inset-0 bg-[#4931F7]/15 dark:bg-[#4ECDC4]/30 rounded-full"
          transition={{ type: "spring", bounce: 0.22, duration: 0.42 }} />
      )}
      <span className={`relative z-10 transition-colors duration-150 ${active ? "text-[#4931F7] dark:text-[#4ECDC4]" : "text-gray-400 hover:text-[#001F3F] dark:hover:text-white"}`}>
        {icon}
      </span>
    </>
  );
  const classe = `relative h-11 flex items-center justify-center rounded-full text-current no-underline transition-all duration-300 ${active ? "w-16" : "w-11"}`;
  return href ? <Link href={href} className={classe}>{contenu}</Link> : <button onClick={onClick} className={classe}>{contenu}</button>;
}

function Coque({ children }) {
  const pathname = usePathname() || "";
  const { reinitialiser, version } = useDemo();
  // Rendu client uniquement (voir SalonLayout) : document est disponible à l'initialisation.
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const [showNotifications, setShowNotifications] = useState(false);
  const [toast, setToast] = useState(null);
  const notificationRef = useRef(null);
  const toastTimer = useRef(null);

  const prenom = PRATICIEN_DEMO.prenom;
  const initiales = `${PRATICIEN_DEMO.prenom[0]}${PRATICIEN_DEMO.nom[0]}`;
  const accueil = pathname.replace(/\/$/, "") === BASE;
  const patients = pathname.startsWith(`${BASE}/patients`);
  const compta = pathname.startsWith(`${BASE}/comptabilite`);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const fermer = (e) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target)) setShowNotifications(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfileMenu(false);
    };
    document.addEventListener("mousedown", fermer);
    return () => document.removeEventListener("mousedown", fermer);
  }, []);

  // Ces boutons de l'app mènent vers ses vraies routes (suppression du cabinet, clôture du compte,
  // page tarifs…) : hors démo, on les neutralise avant que React ne les reçoive.
  useEffect(() => {
    const INTERDITS = /Supprimer le cabinet|Clôturer mon compte|Vue membre|Membres et droits|Passer à Pro/;
    const garde = (e) => {
      const cible = e.target.closest?.("button, a");
      if (!cible || !INTERDITS.test(cible.textContent || "")) return;
      e.preventDefault();
      e.stopPropagation();
      setToast("Non inclus dans la démo");
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 1800);
    };
    document.addEventListener("click", garde, true);
    return () => document.removeEventListener("click", garde, true);
  }, []);

  const toggleTheme = () => { setIsDark((d) => !d); document.documentElement.classList.toggle("dark"); };
  const indisponible = () => {
    setToast("Non inclus dans la démo");
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-16 md:h-20 bg-white/95 dark:bg-[#0b1121]/95 backdrop-blur-sm flex items-center justify-between px-4 md:px-10 border-b border-gray-100 dark:border-[#1a2333] z-[100] transition-colors duration-300">
        <Link href={BASE} className="flex items-center gap-2 md:gap-3 flex-shrink-0 transition-opacity hover:opacity-80">
          <ReactSVG src={`${PREFIXE}/logo-kemer.svg`} className="w-6 h-6 md:w-8 md:h-8 text-[#4ECDC4] flex-shrink-0" />
          <span className="text-lg md:text-xl font-black text-[#001F3F] dark:text-white tracking-tighter">
            KEMER<span className="text-[#4ECDC4]">.AI</span>
          </span>
        </Link>

        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2">
          <LayoutGroup>
            <nav className="flex items-center gap-1 bg-gray-50/80 dark:bg-[#151e32] p-1.5 rounded-full border border-gray-100 dark:border-[#232d3f]">
              <NavItem href={BASE} icon={<Home size={16} />} label="Accueil" active={accueil} />
              <NavItem href={`${BASE}/patients`} icon={<Users size={16} />} label="Mes Patients" active={patients} />
              <NavItem href={`${BASE}/comptabilite`} icon={<Calculator size={16} />} label="Comptabilité" active={compta} />
              <NavItem onClick={indisponible} icon={<BookOpen size={16} />} label="Aide" active={false} />
            </nav>
          </LayoutGroup>
        </div>

        <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
          <button onClick={reinitialiser} title="Réinitialiser la démo" className="hidden md:flex items-center justify-center w-9 h-9 text-gray-400 hover:text-[#4931F7] dark:hover:text-[#4ECDC4] rounded-xl transition-colors hover:bg-gray-100 dark:hover:bg-white/5">
            <RotateCcw size={17} />
          </button>
          <button onClick={toggleTheme} className="hidden md:flex items-center justify-center w-9 h-9 text-gray-400 hover:text-[#4931F7] dark:hover:text-[#4ECDC4] rounded-xl transition-colors hover:bg-gray-100 dark:hover:bg-white/5">
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div className="relative" ref={notificationRef}>
            <button onClick={() => setShowNotifications((v) => !v)}
              className={`relative flex items-center justify-center w-9 h-9 rounded-xl transition-all hover:bg-gray-100 dark:hover:bg-white/5 ${
                showNotifications ? "bg-gray-100 dark:bg-white/10 text-[#4931F7] dark:text-[#4ECDC4]" : "text-gray-400 hover:text-[#4931F7] dark:hover:text-[#4ECDC4]"
              }`}>
              <Bell size={18} />
            </button>
            <AnimatePresence>
              {showNotifications && (
                <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute top-12 right-0 w-80 bg-white dark:bg-[#151e32] rounded-[1.5rem] shadow-2xl border border-gray-100 dark:border-white/5 overflow-hidden z-[9999]">
                  <div className="px-5 py-4 border-b border-gray-50 dark:border-white/5">
                    <p className="text-xs font-black text-[#001F3F] dark:text-white uppercase tracking-widest">Notifications</p>
                  </div>
                  <div className="py-10 text-center text-slate-400">
                    <Bell size={28} className="mx-auto mb-2 opacity-30" />
                    <p className="text-xs font-bold">Tout est à jour !</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative flex items-center gap-3 ml-1" ref={profileRef}>
            <span className="font-bold text-sm text-[#001F3F] dark:text-white hidden sm:block">{prenom}</span>
            <button onClick={() => setShowProfileMenu((v) => !v)}
              className={`w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center font-black text-sm border transition-all duration-300 ${
                showProfileMenu
                  ? "bg-[#4931F7] dark:bg-[#4ECDC4] text-white border-transparent shadow-lg shadow-[#4931F7]/30 dark:shadow-[#4ECDC4]/30 scale-105"
                  : "bg-[#4931F7]/10 dark:bg-[#1c263d] text-[#4931F7] dark:text-[#4ECDC4] border-transparent dark:border-white/5 hover:scale-105"
              }`}>
              {initiales}
            </button>
            <AnimatePresence>
              {showProfileMenu && (
                <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="absolute top-14 right-0 w-64 bg-white dark:bg-[#151e32] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/5 overflow-hidden z-[9999]">
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5">
                    <p className="text-sm font-black text-[#001F3F] dark:text-white leading-none mb-1">{prenom} {PRATICIEN_DEMO.nom}</p>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-white/40 uppercase tracking-widest">{PRATICIEN_DEMO.role}</p>
                  </div>
                  <div className="p-2 flex flex-col gap-0.5">
                    <Link href={`${BASE}/profile`} onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-600 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 hover:text-[#4931F7] dark:hover:text-[#4ECDC4] transition-all font-semibold text-sm">
                      <LayoutDashboard size={15} /> Mon profil
                    </Link>
                    <Link href={`${BASE}/cabinet`} onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-600 dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 hover:text-[#4931F7] dark:hover:text-[#4ECDC4] transition-all font-semibold text-sm">
                      <Building2 size={15} /> Mon cabinet
                    </Link>
                    <div className="h-px bg-gray-100 dark:bg-white/5 my-1 mx-1" />
                    <button onClick={() => { setShowProfileMenu(false); reinitialiser(); }} className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-red-500 hover:bg-red-500/10 transition-all font-semibold text-sm">
                      <RotateCcw size={15} /> Réinitialiser la démo
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <LayoutGroup>
        <nav className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-fit bg-white/70 dark:bg-[#0b1121]/70 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-full shadow-2xl px-2 py-1.5 flex justify-center items-center gap-1">
          <MobileNavItem href={BASE} icon={<Home size={22} />} active={accueil} />
          <MobileNavItem href={`${BASE}/patients`} icon={<Users size={22} />} active={patients} />
          <MobileNavItem href={`${BASE}/comptabilite`} icon={<Calculator size={22} />} active={compta} />
          <MobileNavItem onClick={indisponible} icon={<BookOpen size={22} />} active={false} />
        </nav>
      </LayoutGroup>

      {/* key : « Réinitialiser » remonte les pages, leur état interne repart de zéro. */}
      <div key={version}>{children}</div>

      {toast && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[300] bg-[#001F3F] dark:bg-white text-white dark:text-[#001F3F] text-sm font-black px-5 py-3 rounded-full shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-200">
          {toast}
        </div>
      )}
    </>
  );
}

export default function SalonLayout({ children }) {
  const [pret, setPret] = useState(false);
  const pathname = usePathname() || "";

  // Avant le premier rendu des pages : leurs effets de montage appellent déjà /api/*.
  useEffect(() => {
    const retablirApi = installerApiFactice();
    const retablirVoix = installerFausseReconnaissance();
    const retablir = () => { retablirApi(); retablirVoix(); };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPret(true);
    return retablir;
  }, []);

  // Rendu client uniquement : les dates relatives des données fictives ne doivent pas
  // différer entre le HTML serveur et le navigateur.
  if (!pret) return null;
  // Côté patient (téléphone du visiteur, via le QR) : plein écran, sans la navbar du cabinet.
  if (pathname.startsWith(`${BASE}/patient`)) return children;
  return (
    <DemoProvider>
      <Coque>{children}</Coque>
    </DemoProvider>
  );
}
