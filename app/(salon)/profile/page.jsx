"use client";
// Profil de l'app : même page que app/profile/SettingsClient (copiée, elle ne fait qu'encadrer
// MonProfil), avec un QR du chevalet qui pointe vers la démo patient au lieu de app.kemer.ai.
import { Suspense, useState } from "react";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";
import { PRATICIEN_DEMO } from "../data";

const MonProfil = dynamic(() => import("@/components/profile/MonProfil"), { ssr: false });

const LOCAL = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/;

function Contenu() {
  const user = PRATICIEN_DEMO;
  // Le QR encode l'adresse de la démo telle que le présentateur l'a ouverte : un téléphone doit
  // pouvoir la joindre (site déployé, ou adresse réseau du poste), pas « localhost ».
  const [origine] = useState(() => window.location.origin);
  const injoignable = LOCAL.test(window.location.hostname);
  const cible = `${origine}${process.env.NEXT_PUBLIC_BASE_PATH || ""}/patient/${user.qrCodePatient}/`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(cible)}&color=001F3F`;

  return (
    <div className="min-h-screen w-full bg-white dark:bg-[#151e32] transition-colors duration-300 font-sans print:hidden">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10 pb-24">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-black text-[#001F3F] dark:text-white tracking-tighter">
            Mes <span className="text-[#4931F7]">Informations</span>
          </h1>
          <p className="text-sm text-gray-400 font-medium mt-1">Gérez votre profil et vos paramètres</p>
        </div>

        {injoignable && (
          <p className="mb-6 text-xs font-bold text-amber-600 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl px-4 py-3">
            Ce QR pointe vers « {window.location.host} », que le téléphone d&apos;un visiteur ne peut pas joindre.
            Ouvrez la démo via l&apos;adresse réseau du poste ou le site déployé.
          </p>
        )}

        <MonProfil user={user} prenom={user.prenom} nom={user.nom} email={user.email} qrUrl={qrUrl} onPrintQR={() => window.print()} />
      </div>
    </div>
  );
}

export default function ProfilDemo() {
  return (
    <Suspense fallback={
      <div className="h-screen w-full flex flex-col items-center justify-center bg-white dark:bg-[#151e32]">
        <Loader2 size={40} className="text-[#4931F7] animate-spin mb-4" />
      </div>
    }>
      <Contenu />
    </Suspense>
  );
}
