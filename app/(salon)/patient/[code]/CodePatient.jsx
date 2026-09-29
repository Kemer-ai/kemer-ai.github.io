"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, FileQuestion, Lock, ArrowRight, RefreshCw } from "lucide-react";

// Copie de app/patient/[qrCode]/page.jsx : seules les redirections diffèrent, elles restent dans la
// démo (/patient/...) au lieu de sortir vers les vraies routes /patient/... de l'app.
export default function DownloadPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const qrCode = resolvedParams.qrCode;

  // États possibles : 'verifying' | 'loading' | 'redirecting' | 'no_document' | 'error'
  const [status, setStatus] = useState('verifying');
  const [errorMsg, setErrorMsg] = useState("");
  const [securityCode, setSecurityCode] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  // Cacher la navigation globale pour une expérience "Plein écran"
  useEffect(() => {
    const elementsToHide = document.querySelectorAll('nav, header, footer, .bottom-bar');
    elementsToHide.forEach(el => el.style.display = 'none');
    return () => elementsToHide.forEach(el => el.style.display = '');
  }, []);

  // Fonction de vérification du code
  const handleVerification = async (e) => {
    e.preventDefault();
    
    if (securityCode.length < 3) {
      setErrorMsg("Le code doit faire 3 caractères (ex: DUP)");
      return;
    }

    setIsChecking(true);
    setErrorMsg("");

    try {
      // Appel POST vers l'API pour vérifier le QR Code ET le code de sécurité
      const res = await fetch('/api/patient/check-devis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          praticienQr: qrCode,
          securityCode: securityCode.toUpperCase()
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.consultationId) {
          setStatus('redirecting');
          if (data.isOrdonnance) {
            router.push(`/patient/ordonnance/${data.consultationId}`);
          } else {
            const suffix = data.isPedicurie ? '?pedicurie=1' : '';
            router.push(`/patient/signature/${data.consultationId}${suffix}`);
          }
          return;
        } else {
          // Le code est bon mais il n'y a rien à signer actuellement
          setStatus('no_document');
        }
      } else if (res.status === 401 || res.status === 403) {
         // L'API a répondu que le code de sécurité est mauvais
         setErrorMsg("Code de sécurité incorrect.");
         setIsChecking(false);
      } else {
         throw new Error("Erreur serveur");
      }

    } catch (err) {
      console.error(err);
      setErrorMsg("Erreur de connexion au serveur.");
      setIsChecking(false);
    }
  };

  // --- VUES ---

  // 1. Vue de vérification du code (PIN)
  if (status === 'verifying') {
    return (
      <div className="fixed inset-0 z-[999] bg-slate-50 flex flex-col items-center justify-center p-6 text-center text-[#001F3F]">
        <div className="w-20 h-20 bg-[#4931F7]/10 text-[#4931F7] rounded-3xl flex items-center justify-center mb-6 shadow-sm">
          <Lock size={40} />
        </div>
        <h1 className="text-2xl font-black mb-2 tracking-tight">Espace Sécurisé</h1>

        <p className="text-slate-500 mb-8 max-w-sm leading-relaxed text-sm">
          Pour accéder à vos documents, entrez votre code de sécurité :<br/>
          <strong className="text-[#001F3F] font-semibold">Les 3 premières lettres de votre nom de famille.</strong><br/>
          <span className="text-xs italic opacity-70">(Ex: DUP si vous êtes M. Dupont)</span>
        </p>

        <form onSubmit={handleVerification} className="w-full max-w-xs flex flex-col gap-4">
          <input
            type="text"
            placeholder="Ex: DUP"
            value={securityCode}
            onChange={(e) => {
                setSecurityCode(e.target.value.toUpperCase().slice(0, 3).replace(/[^A-Z]/g, ''));
            }}
            disabled={isChecking}
            className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 text-center text-2xl font-bold tracking-widest text-[#001F3F] placeholder:text-slate-300 focus:border-[#4931F7] outline-none transition-all disabled:opacity-50"
          />

          {errorMsg && <p className="text-red-500 text-sm font-medium animate-pulse">{errorMsg}</p>}

          <button
            type="submit"
            disabled={isChecking || securityCode.length < 3}
            className="flex items-center justify-center gap-2 px-6 py-4 mt-2 bg-[#4931F7] text-white font-bold rounded-2xl hover:bg-[#3b26c6] active:scale-95 transition-all shadow-lg shadow-[#4931F7]/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isChecking ? <Loader2 size={20} className="animate-spin" /> : <><ArrowRight size={20} /> Valider</>}
          </button>
        </form>
      </div>
    );
  }

  // 2. Vue de chargement / Redirection
  if (status === 'loading' || status === 'redirecting') {
    return (
      <div className="fixed inset-0 z-[999] bg-slate-50 flex flex-col items-center justify-center p-6 text-center text-[#001F3F]">
        <Loader2 size={40} className="text-[#4931F7] animate-spin mb-4" />
        <p className="font-bold animate-pulse">
          {status === 'redirecting' ? "Code validé ! Redirection..." : "Recherche de votre dossier..."}
        </p>
      </div>
    );
  }

  // 3. Vue Aucun document
  if (status === 'no_document') {
    return (
      <div className="fixed inset-0 z-[999] bg-slate-50 flex flex-col items-center justify-center p-6 text-center text-[#001F3F]">
        <div className="w-20 h-20 bg-[#4931F7]/10 text-[#4931F7] rounded-3xl flex items-center justify-center mb-6">
          <FileQuestion size={40} />
        </div>
        <h1 className="text-2xl font-black mb-2 tracking-tight">Aucun document</h1>
        <p className="text-slate-500 mb-10 max-w-xs leading-relaxed">
          Il n&apos;y a actuellement aucun document en attente de signature pour vous.
        </p>
        <button
          onClick={() => {
            setStatus('verifying');
            setSecurityCode('');
            setErrorMsg('');
          }}
          className="flex items-center justify-center gap-2 px-6 py-3.5 bg-[#4931F7] text-white font-bold rounded-2xl hover:bg-[#3b26c6] active:scale-95 transition-all shadow-lg shadow-[#4931F7]/20"
        >
          <RefreshCw size={18} /> Réessayer
        </button>
      </div>
    );
  }

  // 4. Vue Erreur globale (Lien invalide ou plantage serveur)
  return (
    <div className="fixed inset-0 z-[999] bg-slate-50 flex flex-col items-center justify-center p-6 text-center text-[#001F3F]">
      <div className="w-20 h-20 bg-red-100 text-red-500 rounded-[2rem] flex items-center justify-center mb-6">
        <AlertCircle size={32} />
      </div>
      <h1 className="text-2xl font-black mb-2">Une erreur est survenue</h1>
      <p className="text-slate-500 text-sm mb-8">{errorMsg || "Lien invalide ou expiré."}</p>
      <button
        onClick={() => window.location.reload()}
        className="text-[#4931F7] underline underline-offset-4 font-bold text-sm"
      >
        Recharger la page
      </button>
    </div>
  );
}