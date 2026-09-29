"use client";

import { useState, useRef, useEffect } from "react";
import { Mail, Send, Loader2, CheckCircle2, X, AlertCircle } from "lucide-react";

/**
 * EmailButton — bouton "Envoyer par mail" partagé
 *
 * Props:
 *  patient        — objet patient (id, email, prenom, nom)
 *  generatePdf()  — fonction async qui retourne un Blob PDF
 *  filename       — nom du fichier joint (ex: "Facture_Dupont.pdf")
 *  type           — "facture" | "ordonnance"
 *  onEmailSaved   — callback(email) appelé après sauvegarde de l'email patient
 *  className      — classes supplémentaires sur le bouton
 */
export default function EmailButton({ patient, generatePdf, filename, type, onEmailSaved, className = "" }) {
  const [state, setState] = useState("idle"); // idle | prompt | sending | sent | error
  const [inputEmail, setInputEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Focus automatique sur l'input quand le prompt s'ouvre
  useEffect(() => {
    if (state === "prompt") setTimeout(() => inputRef.current?.focus(), 50);
  }, [state]);

  // Fermer le prompt si clic en dehors
  useEffect(() => {
    const handler = (e) => {
      if (state === "prompt" && containerRef.current && !containerRef.current.contains(e.target)) {
        setState("idle");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [state]);

  const blobToBase64 = (blob) =>
    new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Retirer le préfixe "data:application/pdf;base64,"
        const base64 = reader.result.split(",")[1];
        res(base64);
      };
      reader.onerror = rej;
      reader.readAsDataURL(blob);
    });

  const doSend = async (email, saveEmail = false) => {
    setState("sending");
    setErrorMsg("");
    try {
      const blob = await generatePdf();
      const pdfBase64 = await blobToBase64(blob);

      const res = await fetch("/api/send-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          pdfBase64,
          filename,
          type,
          patient,
          patientId: patient?.id,
          saveEmail,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur envoi");
      }

      if (saveEmail) onEmailSaved?.(email);
      setState("sent");
      // Revenir à idle après 3s
      setTimeout(() => setState("idle"), 3000);
    } catch (err) {
      setErrorMsg(err.message || "Erreur lors de l'envoi");
      setState("error");
      setTimeout(() => setState("idle"), 3500);
    }
  };

  const handleClick = () => {
    if (state === "sending" || state === "sent") return;
    if (patient?.email) {
      doSend(patient.email, false);
    } else {
      setInputEmail("");
      setState("prompt");
    }
  };

  const handleSubmitEmail = () => {
    const trimmed = inputEmail.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorMsg("Adresse e-mail invalide");
      return;
    }
    doSend(trimmed, true); // saveEmail = true → enregistrer dans le profil
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Bouton principal */}
      <button
        onClick={handleClick}
        disabled={state === "sending"}
        className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all disabled:opacity-60 ${
          state === "sent"
            ? "bg-green-100 text-green-600"
            : state === "error"
            ? "bg-red-100 text-red-500"
            : "bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/15"
        } ${className}`}
      >
        {state === "sending" ? (
          <><Loader2 size={15} className="animate-spin" /> Envoi…</>
        ) : state === "sent" ? (
          <><CheckCircle2 size={15} /> Envoyé !</>
        ) : state === "error" ? (
          <><AlertCircle size={15} /> Échec</>
        ) : (
          <><Mail size={15} /> Envoyer par mail</>
        )}
      </button>

      {/* Mini-formulaire email inline */}
      {state === "prompt" && (
        <div className="absolute bottom-full mb-2 left-0 min-w-[280px] bg-white dark:bg-[#1e2a42] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl p-4 z-30 animate-in fade-in slide-in-from-bottom-1 duration-150">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              E-mail du patient
            </p>
            <button onClick={() => setState("idle")} className="text-slate-400 hover:text-slate-600">
              <X size={14} />
            </button>
          </div>
          <input
            ref={inputRef}
            type="email"
            value={inputEmail}
            onChange={(e) => { setInputEmail(e.target.value); setErrorMsg(""); }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmitEmail()}
            placeholder="patient@exemple.fr"
            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-[#001F3F] dark:text-white outline-none focus:border-[#4931F7] transition-all mb-1"
          />
          {errorMsg && (
            <p className="text-xs text-red-500 mb-2">{errorMsg}</p>
          )}
          <p className="text-[10px] text-slate-400 mb-3 leading-relaxed">
            L'adresse sera enregistrée dans le dossier patient.
          </p>
          <button
            onClick={handleSubmitEmail}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#4931F7] text-white rounded-xl font-bold text-sm hover:bg-[#3b26c6] transition-colors"
          >
            <Send size={14} /> Envoyer
          </button>
        </div>
      )}
    </div>
  );
}
