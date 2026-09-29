"use client";

import { useState, useEffect, use } from "react";
import { Loader2, Download, CheckCircle, AlertCircle, Pill } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { OrdonnancePDF } from "@/components/OrdonnancePDF";

export default function PatientOrdonnancePage({ params }) {
  const { id } = use(params);
  const [state, setState] = useState("loading"); // loading | ready | downloading | downloaded | error
  const [consultation, setConsultation] = useState(null);
  const [ordonnanceData, setOrdonnanceData] = useState(null);

  // Masquer la navbar globale
  useEffect(() => {
    const els = document.querySelectorAll("nav, header, footer, .bottom-bar");
    els.forEach((el) => (el.style.display = "none"));
    return () => els.forEach((el) => (el.style.display = ""));
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/consultations/${id}`);
        if (!res.ok) { setState("error"); return; }
        const data = await res.json();

        const ordo =
          typeof data.ordonnanceData === "string"
            ? JSON.parse(data.ordonnanceData)
            : data.ordonnanceData;

        if (!ordo?.items?.length) { setState("error"); return; }

        setConsultation(data);
        setOrdonnanceData(ordo);
        setState("ready");
      } catch {
        setState("error");
      }
    };
    load();
  }, [id]);

  const markAsCollected = async () => {
    try {
      await fetch(`/api/consultations/${id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature: "DOWNLOADED", type: "ordonnance" }),
      });
    } catch {
      // non bloquant
    }
  };

  const resolveImages = async (branding) => {
    if (!branding) return branding;
    const fields = ['logo', 'photo', 'headerImage', 'footerImage'];
    const result = { ...branding };
    await Promise.all(
      fields.map(async (field) => {
        const url = result[field];
        if (url && url.startsWith('https://')) {
          try {
            const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(url)}`;
            const res = await fetch(proxyUrl);
            if (!res.ok) return;
            const dataUrl = await res.text();
            if (dataUrl.startsWith('data:')) result[field] = dataUrl;
          } catch { /* garde l'URL originale */ }
        }
      })
    );
    return result;
  };

  const handleDownload = async () => {
    if (state === "downloading") return;
    setState("downloading");

    const patient = consultation?.patient;
    const branding = await resolveImages(consultation?.praticien);
    const fileName = `Ordonnance_${patient?.nom || "patient"}_${new Date().toLocaleDateString("fr-FR").replace(/\//g, "-")}.pdf`;

    try {
      const blob = await pdf(
        <OrdonnancePDF data={ordonnanceData} patient={patient} branding={branding} />
      ).toBlob();

      // Approche universelle mobile/desktop : ancre temporaire
      // Évite les blob URL bloquées sur iOS Chrome (WKWebView)
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 500);

      await markAsCollected();
      setState("downloaded");
    } catch (err) {
      console.error("Erreur génération PDF:", err);
      setState("ready"); // on revient à ready pour réessayer
    }
  };

  // --- ÉTAT : CHARGEMENT ---
  if (state === "loading") return (
    <div className="fixed inset-0 z-[999] bg-slate-50 flex flex-col items-center justify-center text-[#001F3F]">
      <Loader2 size={40} className="text-[#4931F7] animate-spin mb-4" />
      <p className="font-bold animate-pulse">Chargement sécurisé...</p>
    </div>
  );

  // --- ÉTAT : ERREUR ---
  if (state === "error") return (
    <div className="fixed inset-0 z-[999] bg-slate-50 flex flex-col items-center justify-center p-6 text-center text-[#001F3F]">
      <div className="w-16 h-16 bg-red-100 text-red-500 rounded-3xl flex items-center justify-center mb-6">
        <AlertCircle size={32} />
      </div>
      <h1 className="text-2xl font-black mb-2">Ordonnance introuvable</h1>
      <p className="text-slate-500 max-w-xs text-sm">
        Cette ordonnance n'est plus disponible ou a déjà été récupérée.
      </p>
    </div>
  );

  // --- ÉTAT : TÉLÉCHARGÉE ---
  if (state === "downloaded") return (
    <div className="fixed inset-0 z-[999] bg-slate-50 flex flex-col items-center justify-center p-6 text-center text-[#001F3F] animate-in fade-in duration-500">
      <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
        <CheckCircle size={40} />
      </div>
      <h1 className="text-2xl font-black mb-2">Ordonnance téléchargée</h1>
      <p className="text-slate-500 max-w-xs text-sm leading-relaxed">
        Votre ordonnance a bien été enregistrée. Présentez le PDF à votre pharmacien.
      </p>
    </div>
  );

  // --- ÉTAT : PRÊT / EN COURS ---
  const patient = consultation?.patient;
  const branding = consultation?.praticien;

  return (
    <div className="fixed inset-0 z-[999] bg-slate-50 overflow-y-auto flex flex-col items-center justify-center p-5">
      <div className="w-full max-w-sm flex flex-col gap-5">

        {/* En-tête */}
        <div className="text-center">
          <div className="w-16 h-16 bg-[#4ECDC4]/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Pill size={32} className="text-[#4ECDC4]" />
          </div>
          <h1 className="text-2xl font-black text-[#001F3F] tracking-tight">Votre Ordonnance</h1>
          <p className="text-slate-500 text-sm mt-1">
            {patient?.prenom} {patient?.nom?.toUpperCase()}
          </p>
        </div>

        {/* Liste des médicaments */}
        <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden shadow-sm">
          {ordonnanceData?.items?.map((item, i) => (
            <div key={i} className="px-5 py-4 flex items-start gap-3">
              <span className="text-[#4931F7] font-black text-sm mt-0.5 shrink-0">{i + 1}.</span>
              <div className="flex-1 min-w-0">
                <p className="text-[#001F3F] font-bold text-sm leading-snug">
                  {item.name}{item.dosage ? ` ${item.dosage}` : ""}
                  {item.form ? <span className="text-slate-400 font-normal"> — {item.form}</span> : ""}
                </p>
                {item.instructions && (
                  <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{item.instructions}</p>
                )}
                <p className="text-[#4ECDC4] text-xs font-bold mt-1">
                  {item.qty} {item.unit}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Praticien */}
        {(branding?.prenom || branding?.nom) && (
          <p className="text-center text-slate-400 text-xs">
            {branding.prenom} {branding.nom?.toUpperCase()}
          </p>
        )}

        {/* Bouton téléchargement */}
        <button
          onClick={handleDownload}
          disabled={state === "downloading"}
          className="w-full flex items-center justify-center gap-3 bg-[#4ECDC4] text-white py-4 rounded-2xl font-bold shadow-lg shadow-[#4ECDC4]/30 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {state === "downloading"
            ? <><Loader2 size={18} className="animate-spin" /> Préparation...</>
            : <><Download size={18} /> Télécharger l'ordonnance</>
          }
        </button>

        <p className="text-center text-xs text-slate-400">
          Présentez ce document à votre pharmacien.
        </p>
      </div>
    </div>
  );
}
