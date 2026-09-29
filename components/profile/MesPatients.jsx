"use client";

import React, { useState, useMemo } from "react";
import {
  Users, Search, Plus, Phone, Mail, Trash2, X, Calendar,
  Loader2, Save, FileText, Download, Pencil, Check,
  User, MapPin, AlertTriangle, UploadCloud, Camera,
  Receipt, Pill, Printer, ChevronDown, FileSignature,
  ArrowLeft, FileQuestion, Eye, Footprints, Scissors, Layers,
  RotateCcw, WifiOff, AlertCircle, ChevronLeft, ChevronRight, Merge
} from "lucide-react";
import { useRouter } from "next/navigation";
import { pdf } from "@react-pdf/renderer";
import { useCustomModal } from "@/components/ModalProvider";
import { MedicalReportPDF } from "@/components/MedicalReportPDF";
import { blobCrPatient } from "@/lib/crPatientPdf";
import { InvoicePDF } from "@/components/InvoicePDF";
import { OrdonnancePDF } from "@/components/OrdonnancePDF";
import { CourrierAdressagePDF } from "@/components/CourrierAdressagePDF";
import { AutoResizeTextarea, ModalInput } from "./SharedUI";
import ImportPatientsReview from "@/components/patients/ImportPatientsReview";
import Papa from "papaparse";
import { formatPrenom, formatNom } from "@/lib/formatName";
import { avatarColor } from "@/lib/avatarColor";

// ── Avatar patient — initiales, couleur stable par patient ──────────────────
function PatientAvatar({ patient }) {
  const initials = `${patient?.prenom?.[0] || ""}${patient?.nom?.[0] || ""}`.toUpperCase();
  const { bg, text } = avatarColor(patient?.id);
  return (
    <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-sm font-black ${bg} ${text}`}>
      {initials}
    </div>
  );
}

// Reprend les mêmes priorités de colonnes que /api/patients/bulk (pour un aperçu
// fidèle avant import) — les clés déjà en minuscules seront de toute façon
// re-résolues côté serveur par les mêmes chaînes de repli.
function normalizeCsvRow(p, source) {
  if (source === "podoevolution") {
    return {
      nom: p.Nom || p.NOM || p.nom || "",
      prenom: p["Prénom"] || p.Prenom || p.PRENOM || p.prenom || "",
      telephone: p["Tel Portable"] || p.Mobile || p["Téléphone"] || p.Telephone || p.Portable || "",
      email: p.Email || p.Mail || p.email || "",
      adresse: p.Adresse || p.adresse || p.ADRESSE || "",
      codePostal: p["Code Postal"] || p.CP || p.cp || p.codePostal || "",
      ville: p.Ville || p.ville || p.VILLE || "",
    };
  }
  return {
    nom: p.Nom || p.nom || "",
    prenom: p["Prénom"] || p.prenom || p.Prenom || "",
    telephone: p["Téléphone"] || p.Telephone || p.telephone || "",
    email: p.Email || p.email || "",
    adresse: p.Adresse || p.adresse || "",
    codePostal: p["Code Postal"] || p.codePostal || "",
    ville: p.Ville || p.ville || "",
  };
}

// ── Détection des doublons ────────────────────────────────────────────────────
function normalizeName(str) {
  return (str || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // accents
    .toLowerCase().trim().replace(/\s+/g, " ");
}

function findDuplicateGroups(patients) {
  const groups = new Map();
  for (const p of patients) {
    const key = `${normalizeName(p.nom)}|${normalizeName(p.prenom)}`;
    if (!key.trim().replace("|", "")) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  return Array.from(groups.entries())
    .filter(([, members]) => members.length > 1)
    .map(([key, members]) => ({
      key,
      members: [...members].sort((a, b) => (b.consultations?.length || 0) - (a.consultations?.length || 0)),
    }))
    .sort((a, b) => a.members[0].nom.localeCompare(b.members[0].nom, "fr"));
}

// Patients existants dont le nom + prénom correspond exactement à celui saisi
function findMatchingPatients(candidate, patients) {
  const nom = normalizeName(candidate.nom);
  const prenom = normalizeName(candidate.prenom);
  if (!nom || !prenom) return [];
  return patients.filter(p => normalizeName(p.nom) === nom && normalizeName(p.prenom) === prenom);
}

// ── Utilitaire images GCS ─────────────────────────────────────────────────────
// Passe par /api/image-proxy pour éviter les blocages CORS sur les URLs GCS.
async function resolveImages(branding) {
  if (!branding) return branding;
  const result = { ...branding };
  await Promise.all(
    ["logo", "photo", "headerImage", "footerImage"].map(async (field) => {
      const url = result[field];
      if (url?.startsWith("https://")) {
        try {
          const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(url)}`;
          const res = await fetch(proxyUrl);
          if (!res.ok) return;
          const dataUrl = await res.text();
          if (dataUrl.startsWith("data:")) result[field] = dataUrl;
        } catch {}
      }
    })
  );
  return result;
}

// ── Vue agrandie d'une pièce jointe (photo) ───────────────────────────────────
function PhotoLightbox({ photos, index, onClose, onNav }) {
  if (index === null || index === undefined || !photos?.[index]) return null;
  return (
    <div className="fixed inset-0 z-[300] bg-black/92 flex items-center justify-center p-4" onClick={onClose}>
      <img src={photos[index]} alt="" className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl" />
      <button onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
        <X size={20} />
      </button>
      {index > 0 && (
        <button onClick={(e) => { e.stopPropagation(); onNav(index - 1); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
          <ChevronLeft size={22} />
        </button>
      )}
      {index < photos.length - 1 && (
        <button onClick={(e) => { e.stopPropagation(); onNav(index + 1); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
          <ChevronRight size={22} />
        </button>
      )}
    </div>
  );
}

// ── Détection CR vide (généré depuis un audio inaudible) ─────────────────────
function isEmptyReport(reportData) {
  if (!reportData) return false;
  return ["anamnese", "examen_clinique", "bilan_podologique", "diagnostic", "traitement"]
    .every(f => !reportData[f]?.trim?.());
}

// ── Badge type consultation ───────────────────────────────────────────────────
function TypeBadge({ type }) {
  const map = {
    podologie:    "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    consultation: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    pedicurie:    "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    semelles:     "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400",
    facturation:  "bg-slate-100 text-slate-500 dark:bg-white/10",
  };
  const labels = { podologie: "Podologie", consultation: "Podologie", pedicurie: "Pédicurie", semelles: "Semelles", facturation: "Facturation" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide ${map[type] || "bg-emerald-100 text-emerald-600"}`}>
      {labels[type] || "Podologie"}
    </span>
  );
}

// ── DocumentItem ──────────────────────────────────────────────────────────────
function DocumentItem({ doc, patient, praticien, onDelete, onDateChange }) {
  const { showModal } = useCustomModal();
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [dateValue, setDateValue] = useState(() => doc.date.toISOString().slice(0, 10));
  const [isSavingDate, setIsSavingDate] = useState(false);

  const META = {
    cr:      { label: "Compte Rendu",       icon: <FileText size={14} />,     cls: "text-[#4931F7] bg-[#4931F7]/10" },
    devis:   { label: "Devis semelles",     icon: <FileSignature size={14} />, cls: "text-slate-500 bg-slate-100 dark:bg-white/10" },
    facture: { label: "Facture",            icon: <Receipt size={14} />,       cls: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" },
    ordo:    { label: "Prescription",       icon: <Pill size={14} />,          cls: "text-blue-600 bg-blue-50 dark:bg-blue-900/20" },
  };
  const m = META[doc.type] || META.cr;
  const canEditDate = doc.type === "facture" || doc.type === "devis";

  const handleSaveDate = async () => {
    if (!dateValue || !doc.consultation?.id) return;
    setIsSavingDate(true);
    try {
      const currentData = typeof doc.data === "string" ? JSON.parse(doc.data) : { ...doc.data };
      const updatedData = { ...currentData, factureDate: dateValue };
      await fetch(`/api/consultations/${doc.consultation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ devisData: updatedData }),
      });
      onDateChange?.(doc.id, dateValue);
      setEditingDate(false);
    } catch {
      await showModal({ type: "alert", title: "Erreur", message: "Impossible de modifier la date." });
    } finally {
      setIsSavingDate(false);
    }
  };

  const handleAction = async (action) => {
    setIsProcessing(true);
    const win = action !== "download" ? window.open("", "_blank") : null;
    try {
      const b = await resolveImages(praticien);
      let el;
      if (doc.type === "cr") el = <MedicalReportPDF data={doc.data} branding={b} photos={doc.photos || []} date={doc.date} />;
      else if (doc.type === "ordo") el = <OrdonnancePDF data={doc.data} patient={patient} branding={b} />;
      else el = <InvoicePDF type={doc.type} data={doc.data} patient={patient} signature={doc.signature} branding={b} />;
      const blob = await pdf(el).toBlob();
      const url = URL.createObjectURL(blob);
      if (action === "download") {
        const a = document.createElement("a");
        a.href = url; a.download = `${doc.type}_${patient?.nom}_${doc.date.toLocaleDateString("fr-FR").replace(/\//g, "-")}.pdf`;
        a.target = "_blank"; document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 500);
      } else {
        if (win) { win.location.href = url; if (action === "print") win.onload = () => win.print(); }
      }
    } catch {
      if (win) win.close();
      await showModal({ type: "alert", title: "Erreur", message: "Erreur lors de la génération du document." });
    } finally { setIsProcessing(false); }
  };

  return (
    <div className="flex items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-[#0b1121]/50 rounded-xl border border-slate-100 dark:border-white/5 hover:border-[#4931F7]/20 transition-all group">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${m.cls}`}>{m.icon}</div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#001F3F] dark:text-white truncate">{m.label}</p>
          {editingDate ? (
            <div className="flex items-center gap-1 mt-0.5">
              <input
                type="date"
                value={dateValue}
                onChange={e => setDateValue(e.target.value)}
                className="text-[11px] font-bold bg-white dark:bg-[#151e32] border border-[#4931F7]/40 rounded-lg px-1.5 py-0.5 focus:outline-none focus:border-[#4931F7] text-[#001F3F] dark:text-white"
                autoFocus
              />
              <button onClick={handleSaveDate} disabled={isSavingDate} className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50 disabled:opacity-50">
                {isSavingDate ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
              </button>
              <button onClick={() => setEditingDate(false)} className="p-1 rounded-md text-slate-400 hover:bg-slate-100">
                <X size={11} />
              </button>
            </div>
          ) : (
            <p className="text-[10px] text-slate-400 font-medium">
              {doc.date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        {isProcessing ? <Loader2 size={15} className="text-[#4931F7] animate-spin mx-2" /> : (
          <>
            {canEditDate && !editingDate && (
              <button onClick={() => setEditingDate(true)} className="p-1.5 rounded-lg text-slate-400 hover:text-[#4931F7] hover:bg-[#4931F7]/5 transition-all" title="Modifier la date"><Calendar size={13} /></button>
            )}
            <button onClick={() => handleAction("view")} className="p-1.5 rounded-lg text-slate-400 hover:text-[#4931F7] hover:bg-[#4931F7]/5 transition-all" title="Voir"><Eye size={13} /></button>
            <button onClick={() => handleAction("print")} className="p-1.5 rounded-lg text-slate-400 hover:text-[#4931F7] hover:bg-[#4931F7]/5 transition-all" title="Imprimer"><Printer size={13} /></button>
            <button onClick={() => handleAction("download")} className="p-1.5 rounded-lg text-slate-400 hover:text-[#4931F7] hover:bg-[#4931F7]/5 transition-all" title="Télécharger"><Download size={13} /></button>
            <button onClick={() => onDelete(doc)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all" title="Supprimer"><Trash2 size={13} /></button>
          </>
        )}
      </div>
    </div>
  );
}

// ── ConsultationRow ───────────────────────────────────────────────────────────
const CONSULT_TYPE_META = {
  podologie:    { icon: <Footprints size={15} />, bg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" },
  consultation: { icon: <Footprints size={15} />, bg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" },
  pedicurie:    { icon: <Scissors size={15} />,   bg: "bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" },
  semelles:     { icon: <Layers size={15} />,     bg: "bg-teal-100 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400" },
};

function ConsultationRow({ consult, onDelete, onEdit, isOpen, onToggle, docs = [], patient, praticien, onDeleteDoc, onEditOrdo, onEditCR, onEditFacture,
  editingNotes, onEditNotes, onSaveNotes, isSavingNotes, savingPhotosId, onAddPhoto, onRemovePhoto
}) {
  const router = useRouter();
  const date = new Date(consult.createdAt);
  const isPedicurie = consult.typeConsultation === "pedicurie";
  const canRegenerate = !isPedicurie && isEmptyReport(consult.reportData);
  const [regenState, setRegenState] = useState("idle"); // idle | loading | success | error
  const [regenError, setRegenError] = useState("");
  const [confrereText, setConfrereText] = useState(consult.reportData?.resume_confreres || null);
  const [confrereState, setConfrereState] = useState("idle");
  const [confrereError, setConfrereError] = useState("");
  const [courrierText, setCourrierText] = useState(consult.reportData?.courrier_adressage || null);
  const [courrierState, setCourrierState] = useState("idle");
  const [courrierError, setCourrierError] = useState("");
  const [courrierEditing, setCourrierEditing] = useState(false);
  const [courrierDraft, setCourrierDraft] = useState("");
  const [courrierSaving, setCourrierSaving] = useState(false);
  const [courrierSaveError, setCourrierSaveError] = useState("");
  const [courrierEmailPanel, setCourrierEmailPanel] = useState(false);
  const [courrierEmailInput, setCourrierEmailInput] = useState("");
  const [courrierSendState, setCourrierSendState] = useState("idle"); // idle | loading | success | error
  const [courrierSendError, setCourrierSendError] = useState("");
  const [lightboxIdx, setLightboxIdx] = useState(null);

  const handleGenerateConfrere = async () => {
    setConfrereState("loading");
    setConfrereError("");
    try {
      const res = await fetch("/api/generate-confrere-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationId: consult.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur serveur");
      setConfrereText(data.resume_confreres);
      setConfrereState("success");
    } catch (e) {
      setConfrereState("error");
      setConfrereError(e.message);
    }
  };

  const handleGenerateCourrier = async () => {
    setCourrierState("loading");
    setCourrierError("");
    try {
      const res = await fetch("/api/generate-courrier-adressage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationId: consult.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur serveur");
      setCourrierText(data.courrier_adressage);
      setCourrierState("success");
    } catch (e) {
      setCourrierState("error");
      setCourrierError(e.message);
    }
  };

  const handleSaveCourrier = async () => {
    setCourrierSaving(true);
    setCourrierSaveError("");
    try {
      const res = await fetch(`/api/consultations/${consult.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportData: { ...consult.reportData, courrier_adressage: courrierDraft } }),
      });
      if (!res.ok) throw new Error("Erreur serveur");
      setCourrierText(courrierDraft);
      setCourrierEditing(false);
    } catch (e) {
      setCourrierSaveError(e.message);
    } finally {
      setCourrierSaving(false);
    }
  };

  const handleSendCourrier = async () => {
    if (!courrierEmailInput.trim()) return;
    setCourrierSendState("loading");
    setCourrierSendError("");
    try {
      let pdfBase64 = null;
      try {
        const pdfElement = <CourrierAdressagePDF courrier={courrierText} praticien={praticien} patient={patient} />;
        const pdfBlob = await pdf(pdfElement).toBlob();
        const reader = new FileReader();
        pdfBase64 = await new Promise((res, rej) => {
          reader.onloadend = () => res(reader.result.split(",")[1]);
          reader.onerror = rej;
          reader.readAsDataURL(pdfBlob);
        });
      } catch (pdfErr) {
        console.warn("PDF génération failed, envoi sans PDF:", pdfErr);
      }

      const res = await fetch("/api/send-courrier-medecin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailMedecin: courrierEmailInput.trim(),
          courrier: courrierText,
          praticienPrenom: praticien?.prenom,
          praticienNom: praticien?.nom,
          cabinetName: praticien?.cabinetName,
          ...(pdfBase64 && { pdfBase64 }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur serveur");
      setCourrierSendState("success");
      setTimeout(() => {
        setCourrierEmailPanel(false);
        setCourrierSendState("idle");
        setCourrierEmailInput("");
      }, 1500);
    } catch (e) {
      setCourrierSendState("error");
      setCourrierSendError(e.message);
    }
  };

  const handleRegenerate = async () => {
    setRegenState("loading");
    setRegenError("");
    try {
      const res = await fetch("/api/regenerate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationId: consult.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur serveur");
      setRegenState("success");
      router.refresh();
    } catch (e) {
      setRegenState("error");
      setRegenError(e.message);
    }
  };
  const canExpand = true; // toujours expandable pour ajouter notes/photos
  const typeMeta = CONSULT_TYPE_META[consult.typeConsultation] || { icon: <Footprints size={15} />, bg: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" };

  const renderVal = (val) => {
    if (val === null || val === undefined) return "—";
    if (Array.isArray(val)) return <ul className="list-disc ml-4 space-y-0.5">{val.map((v, i) => <li key={i}>{typeof v === "object" ? renderVal(v) : String(v)}</li>)}</ul>;
    if (typeof val === "object") return <div className="space-y-1">{Object.entries(val).map(([k, v]) => <div key={k}><span className="text-[9px] font-bold text-slate-400 uppercase">{k.replace(/_/g, " ")}</span><div>{renderVal(v)}</div></div>)}</div>;
    return String(val);
  };

  return (
    <div className="bg-white dark:bg-[#151e32] rounded-xl border border-slate-100 dark:border-white/5 overflow-hidden">
      <div
        className={`flex items-center gap-3 p-3.5 transition-colors ${canExpand ? "cursor-pointer hover:bg-slate-50/50 dark:hover:bg-white/[0.02]" : ""}`}
        onClick={() => canExpand && onToggle()}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${typeMeta.bg}`}>
          {typeMeta.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-[#001F3F] dark:text-white">{date.toLocaleDateString("fr-FR")}</span>
            <TypeBadge type={consult.typeConsultation} />
            {docs.length > 0 && (
              <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded-md">
                {docs.length} doc{docs.length > 1 ? "s" : ""}
              </span>
            )}
            {canRegenerate && (
              <span className="inline-flex items-center gap-1 text-[9px] font-black text-orange-500 bg-orange-50 dark:bg-orange-500/10 px-1.5 py-0.5 rounded-md">
                <WifiOff size={8} /> Audio inaudible
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 truncate mt-0.5">{consult.motif || "Consultation"}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {canExpand && (
            <ChevronDown size={15} className={`text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
          )}
          <button onClick={(e) => { e.stopPropagation(); onEdit(consult); }} className="p-1.5 rounded-lg text-slate-400 hover:text-[#4931F7] hover:bg-[#4931F7]/5 transition-all"><Pencil size={13} /></button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(consult); }} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"><Trash2 size={13} /></button>
        </div>
      </div>

      {isOpen && canExpand && (
        <div className="border-t border-slate-100 dark:border-white/5 px-4 py-4 space-y-4 bg-slate-50/60 dark:bg-[#0b1121]/40">
          {/* Pédicurie → dictée vocale (indépendant de reportData) */}
          {isPedicurie && consult.transcription && (
            <div>
              <p className="text-[10px] font-black text-[#4931F7] uppercase tracking-widest mb-1.5">Dictée vocale</p>
              <p className="text-sm font-medium whitespace-pre-wrap text-[#001F3F] dark:text-white leading-relaxed">{consult.transcription}</p>
            </div>
          )}
          {/* Autres types → CR structuré (ou vide → régénération) */}
          {consult.reportData && !isPedicurie && (
            canRegenerate ? (
              <div className="rounded-xl border border-orange-200 dark:border-orange-500/20 bg-orange-50/50 dark:bg-orange-500/5 px-4 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <WifiOff size={13} className="text-orange-500 shrink-0" />
                  <p className="text-xs font-bold text-orange-600 dark:text-orange-400">
                    L'audio était inaudible lors de la génération — le compte rendu est vide.
                  </p>
                </div>
                {regenState !== "success" && (
                  <button
                    onClick={handleRegenerate}
                    disabled={regenState === "loading"}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#4931F7] text-white text-xs font-black hover:bg-[#3b26c6] disabled:opacity-60 transition-colors shadow-sm shadow-[#4931F7]/20"
                  >
                    {regenState === "loading"
                      ? <><Loader2 size={12} className="animate-spin" /> Régénération en cours…</>
                      : <><RotateCcw size={12} /> Regénérer le compte rendu</>}
                  </button>
                )}
                {regenState === "success" && (
                  <p className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                    <Check size={12} /> Compte rendu régénéré — rechargement…
                  </p>
                )}
                {regenState === "error" && (
                  <p className="text-xs text-red-500 font-medium">{regenError}</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(consult.reportData).filter(([key]) => key !== "resume_confreres" && key !== "courrier_adressage").map(([key, value]) => (
                  <div key={key}>
                    <p className="text-[10px] font-black text-[#4931F7] uppercase tracking-widest mb-1">{key.replace(/_/g, " ")}</p>
                    <div className="text-sm font-medium text-[#001F3F] dark:text-slate-300">{renderVal(value)}</div>
                  </div>
                ))}
              </div>
            )
          )}
          {/* ── Résumé confrère ── */}
          {!isPedicurie && !canRegenerate && consult.reportData && (
            <div>
              <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1.5">Résumé confrère</p>
              {confrereText ? (
                <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3">
                  <p className="text-sm font-medium text-[#001F3F] dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{confrereText}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {confrereState === "error" && confrereError && (
                    <p className="text-[11px] text-red-500 font-medium">{confrereError}</p>
                  )}
                  <button
                    onClick={handleGenerateConfrere}
                    disabled={confrereState === "loading"}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-200 dark:border-amber-800/40 text-amber-600 dark:text-amber-400 text-xs font-black hover:bg-amber-500/20 disabled:opacity-60 transition-colors self-start"
                  >
                    {confrereState === "loading"
                      ? <><Loader2 size={11} className="animate-spin" /> Génération…</>
                      : <><FileText size={11} /> Générer</>}
                  </button>
                </div>
              )}
            </div>
          )}
          {/* ── Courrier d'adressage ── */}
          {!isPedicurie && !canRegenerate && consult.reportData && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Courrier d'adressage</p>
                {courrierText && !courrierEditing && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setCourrierDraft(courrierText); setCourrierSaveError(""); setCourrierEditing(true); }}
                      className="p-1 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-500/5 transition-all" title="Modifier"
                    >
                      <Pencil size={11} />
                    </button>
                    <button
                      onClick={() => { setCourrierEmailPanel(v => !v); setCourrierSendState("idle"); setCourrierSendError(""); }}
                      className="p-1 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-500/5 transition-all" title="Envoyer par mail"
                    >
                      <Mail size={11} />
                    </button>
                  </div>
                )}
              </div>

              {courrierEditing ? (
                <div className="space-y-2">
                  <AutoResizeTextarea
                    value={courrierDraft}
                    onChange={setCourrierDraft}
                    className="w-full bg-white dark:bg-[#0b1121] border-2 border-blue-500/30 focus:border-blue-500 rounded-xl p-3 text-sm outline-none dark:text-white"
                  />
                  {courrierSaveError && <p className="text-[11px] text-red-500 font-medium">{courrierSaveError}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => setCourrierEditing(false)}
                      className="flex-1 py-2 text-xs font-bold text-slate-500 bg-slate-100 dark:bg-white/10 rounded-xl hover:bg-slate-200 transition-colors">
                      Annuler
                    </button>
                    <button onClick={handleSaveCourrier} disabled={courrierSaving}
                      className="flex-1 py-2 text-xs font-black text-white bg-blue-500 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-60">
                      {courrierSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Sauvegarder
                    </button>
                  </div>
                </div>
              ) : courrierText ? (
                <div className="space-y-3">
                  <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 rounded-xl p-3">
                    <p className="text-sm font-medium text-[#001F3F] dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{courrierText}</p>
                  </div>
                  <div className="bg-slate-50/60 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Coordonnées du praticien</p>
                    <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                      {praticien?.prenom || praticien?.nom ? <p className="font-medium">{[praticien?.prenom, praticien?.nom].filter(Boolean).join(" ")}</p> : null}
                      {praticien?.cabinetName && <p>{praticien.cabinetName}</p>}
                      {praticien?.address && <p>{praticien.address}</p>}
                      {praticien?.phone && <p>Tél. : {praticien.phone}</p>}
                      {praticien?.email && <p>Mail : {praticien.email}</p>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        try {
                          const pdfElement = <CourrierAdressagePDF courrier={courrierText} praticien={praticien} patient={patient} />;
                          const blob = await pdf(pdfElement).toBlob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `courrier_adressage_${patient?.nom}_${new Date().toLocaleDateString("fr-FR").replace(/\//g, "-")}.pdf`;
                          a.target = "_blank";
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          setTimeout(() => URL.revokeObjectURL(url), 500);
                        } catch (err) {
                          console.error("Erreur téléchargement PDF:", err);
                        }
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-200 dark:border-blue-800/40 text-blue-600 dark:text-blue-400 text-xs font-black hover:bg-blue-500/20 transition-colors"
                    >
                      <Download size={11} /> Télécharger PDF
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {courrierState === "error" && courrierError && (
                    <p className="text-[11px] text-red-500 font-medium">{courrierError}</p>
                  )}
                  <button
                    onClick={handleGenerateCourrier}
                    disabled={courrierState === "loading"}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-200 dark:border-blue-800/40 text-blue-600 dark:text-blue-400 text-xs font-black hover:bg-blue-500/20 disabled:opacity-60 transition-colors self-start"
                  >
                    {courrierState === "loading"
                      ? <><Loader2 size={11} className="animate-spin" /> Génération…</>
                      : <><FileText size={11} /> Générer</>}
                  </button>
                </div>
              )}

              {courrierEmailPanel && !courrierEditing && (
                <div className="mt-2 flex flex-col gap-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Email du médecin destinataire</label>
                  <input
                    type="email"
                    value={courrierEmailInput}
                    onChange={(e) => setCourrierEmailInput(e.target.value)}
                    placeholder="medecin@exemple.com"
                    className="w-full bg-white dark:bg-[#0b1121] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 dark:text-white"
                  />
                  {courrierSendState === "error" && courrierSendError && (
                    <p className="text-[11px] text-red-500 font-medium">{courrierSendError}</p>
                  )}
                  {courrierSendState === "success" ? (
                    <p className="text-xs font-bold text-emerald-600 flex items-center gap-1.5"><Check size={12} /> Courrier envoyé</p>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => setCourrierEmailPanel(false)}
                        className="flex-1 py-2 text-xs font-bold text-slate-500 bg-slate-100 dark:bg-white/10 rounded-xl hover:bg-slate-200 transition-colors">
                        Annuler
                      </button>
                      <button onClick={handleSendCourrier} disabled={courrierSendState === "loading" || !courrierEmailInput.trim()}
                        className="flex-1 py-2 text-xs font-black text-white bg-blue-500 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-60">
                        {courrierSendState === "loading" ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />} Envoyer
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {/* ── Notes (éditable) ── */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notes</p>
              {editingNotes?.consultId !== consult.id && (
                <button onClick={() => onEditNotes({ consultId: consult.id, value: consult.notes || "" })}
                  className="p-1 rounded-lg text-slate-400 hover:text-[#4931F7] hover:bg-[#4931F7]/5 transition-all" title="Modifier">
                  <Pencil size={11} />
                </button>
              )}
            </div>
            {editingNotes?.consultId === consult.id ? (
              <div className="space-y-2">
                <AutoResizeTextarea
                  value={editingNotes.value}
                  onChange={val => onEditNotes({ consultId: consult.id, value: val })}
                  className="w-full bg-white dark:bg-[#0b1121] border-2 border-[#4931F7]/30 focus:border-[#4931F7] rounded-xl p-3 text-sm outline-none dark:text-white"
                />
                <div className="flex gap-2">
                  <button onClick={() => onEditNotes(null)}
                    className="flex-1 py-2 text-xs font-bold text-slate-500 bg-slate-100 dark:bg-white/10 rounded-xl hover:bg-slate-200 transition-colors">
                    Annuler
                  </button>
                  <button onClick={() => onSaveNotes(consult.id, editingNotes.value)} disabled={isSavingNotes}
                    className="flex-1 py-2 text-xs font-black text-white bg-[#4931F7] rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-60">
                    {isSavingNotes ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Sauvegarder
                  </button>
                </div>
              </div>
            ) : consult.notes?.trim() ? (
              <p className="text-sm font-medium text-[#001F3F] dark:text-white whitespace-pre-wrap leading-relaxed">{consult.notes}</p>
            ) : (
              <button onClick={() => onEditNotes({ consultId: consult.id, value: "" })}
                className="text-xs text-slate-400 hover:text-[#4931F7] font-medium flex items-center gap-1.5 transition-colors py-0.5">
                <Plus size={12} /> Ajouter une note
              </button>
            )}
          </div>

          {/* ── Photos (éditable) ── */}
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Camera size={10} /> Photos{Array.isArray(consult.photos) && consult.photos.length > 0 ? ` (${consult.photos.length})` : ""}
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {(consult.photos || []).map((src, i) => (
                <div key={i} onClick={() => setLightboxIdx(i)}
                  className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 group cursor-zoom-in">
                  <img src={src} alt="" className="w-full h-auto block" />
                  <button onClick={(e) => { e.stopPropagation(); onRemovePhoto(consult.id, consult.photos, i); }} disabled={savingPhotosId === consult.id}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm disabled:opacity-30">
                    <X size={9} />
                  </button>
                </div>
              ))}
              <label className={`aspect-square rounded-lg border-2 border-dashed flex items-center justify-center transition-colors ${savingPhotosId === consult.id ? "cursor-not-allowed border-slate-200 dark:border-white/10" : "cursor-pointer border-slate-200 dark:border-white/10 hover:border-[#4931F7] hover:bg-[#4931F7]/5"}`}>
                {savingPhotosId === consult.id
                  ? <Loader2 size={14} className="animate-spin text-[#4931F7]" />
                  : <Plus size={14} className="text-slate-400" />}
                <input type="file" accept="image/*" className="hidden" disabled={savingPhotosId === consult.id}
                  onChange={e => { if (e.target.files[0]) { onAddPhoto(consult.id, consult.photos || [], e.target.files[0]); e.target.value = ""; } }} />
              </label>
            </div>
          </div>
          {docs.length > 0 && (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Documents</p>
              <div className="flex flex-wrap gap-2">
                {docs.map(doc => (
                  <DocChip key={doc.id} doc={doc} patient={patient} praticien={praticien} onDelete={onDeleteDoc} onEdit={onEditOrdo} onEditCR={onEditCR} onEditFacture={onEditFacture} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <PhotoLightbox photos={consult.photos} index={lightboxIdx} onClose={() => setLightboxIdx(null)} onNav={setLightboxIdx} />
    </div>
  );
}

// ── DocChip (compact, inline) ─────────────────────────────────────────────────
function DocChip({ doc, patient, praticien, onDelete, onEdit, onEditCR, onEditFacture }) {
  const { showModal } = useCustomModal();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [dateValue, setDateValue] = useState(() => doc.date.toISOString().slice(0, 10));
  const [isSavingDate, setIsSavingDate] = useState(false);
  const [emailConfirm, setEmailConfirm] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [editingEmail, setEditingEmail] = useState(false);

  const META = {
    cr:      { label: "Compte rendu",  icon: <FileText size={13} />,      bg: "bg-[#4931F7]/5 border-[#4931F7]/20 text-[#4931F7]" },
    devis:   { label: "Devis semelles",icon: <FileSignature size={13} />, bg: "bg-slate-50 border-slate-200 text-slate-500 dark:bg-white/5 dark:border-white/10" },
    facture: { label: "Facture",       icon: <Receipt size={13} />,       bg: "bg-emerald-50 border-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:border-emerald-900/30" },
    ordo:    { label: "Prescription",  icon: <Pill size={13} />,          bg: "bg-blue-50 border-blue-100 text-blue-600 dark:bg-blue-900/20 dark:border-blue-900/30" },
    crpatient: { label: "CR patient",  icon: <FileText size={13} />,      bg: "bg-teal-50 border-teal-100 text-teal-600 dark:bg-teal-900/20 dark:border-teal-900/30" },
  };
  const m = META[doc.type] || META.cr;
  const canEditDate = doc.type === "facture" || doc.type === "devis";
  const canEditOrdo = doc.type === "ordo" && !!onEdit;
  const canEditCR = doc.type === "cr" && !!onEditCR;
  const canEditFactureDoc = doc.type === "facture" && !!onEditFacture;

  const handleSaveDate = async () => {
    if (!dateValue || !doc.consultation?.id) return;
    setIsSavingDate(true);
    try {
      const currentData = typeof doc.data === "string" ? JSON.parse(doc.data) : { ...doc.data };
      await fetch(`/api/consultations/${doc.consultation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ devisData: { ...currentData, factureDate: dateValue } }),
      });
      setEditingDate(false);
      router.refresh();
    } catch {
      await showModal({ type: "alert", title: "Erreur", message: "Impossible de modifier la date." });
    } finally {
      setIsSavingDate(false);
    }
  };

  const generateBlob = async () => {
    const b = await resolveImages(praticien);
    if (doc.type === "crpatient") return blobCrPatient({ consultationId: doc.consultation?.id, reportData: doc.data, branding: b, photos: Array.isArray(doc.photos) ? doc.photos : [], repli: false });
    let el;
    if (doc.type === "cr") el = <MedicalReportPDF data={doc.data} branding={b} photos={doc.photos || []} date={doc.date} />;
    else if (doc.type === "ordo") el = <OrdonnancePDF data={doc.data} patient={patient} branding={b} />;
    else el = <InvoicePDF type={doc.type} data={doc.data} patient={patient} signature={doc.signature} branding={b} />;
    return pdf(el).toBlob();
  };

  const handleOpen = async () => {
    setIsProcessing(true);
    const win = window.open("", "_blank");
    // Le CR patient est généré par l'IA (quelques secondes) : on l'annonce plutôt que de laisser about:blank.
    if (win && doc.type === "crpatient") win.document.write('<title>CR patient</title><body style="font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;color:#4931F7"><p>Génération du compte rendu patient…</p></body>');
    try {
      const blob = await generateBlob();
      const url = URL.createObjectURL(blob);
      if (win) win.location.href = url;
    } catch { if (win) win.close(); await showModal({ type: "alert", title: "Erreur", message: "Erreur lors de la génération du document." }); }
    finally { setIsProcessing(false); }
  };

  const handleDownload = async () => {
    setIsProcessing(true);
    try {
      const blob = await generateBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `${doc.type}_${patient?.nom}_${doc.date.toLocaleDateString("fr-FR").replace(/\//g, "-")}.pdf`;
      a.target = "_blank"; document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 500);
    } catch { await showModal({ type: "alert", title: "Erreur", message: "Erreur lors du téléchargement." }); }
    finally { setIsProcessing(false); }
  };

  const handleSendEmail = async () => {
    const to = (editingEmail || !patient?.email) ? emailInput.trim() : patient.email;
    if (!to) return;
    setEmailSending(true);
    try {
      // Sauvegarder l'email si le patient n'en avait pas
      if (!patient?.email && emailInput.trim() && patient?.id) {
        await fetch(`/api/patients/${patient.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailInput.trim() }),
        });
        router.refresh();
      }
      const blob = await generateBlob();
      const pdfBase64 = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onloadend = () => res(reader.result.split(",")[1]);
        reader.onerror = rej;
        reader.readAsDataURL(blob);
      });
      const apiType = doc.type === "ordo" ? "ordonnance" : doc.type;
      const filename = `${apiType}_${patient?.nom}_${doc.date.toLocaleDateString("fr-FR").replace(/\//g, "-")}.pdf`;
      await fetch("/api/send-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: to, filename, pdfBase64, type: apiType, patient: { prenom: patient?.prenom, nom: patient?.nom, dateNaissance: patient?.dateNaissance } }),
      });
      setEmailSent(true);
      setTimeout(() => { setEmailSent(false); setEmailConfirm(false); setEmailInput(""); setEditingEmail(false); }, 2500);
    } catch { await showModal({ type: "alert", title: "Erreur", message: "Erreur lors de l'envoi." }); }
    finally { setEmailSending(false); }
  };

  // ── Mode édition date ─────────────────────────────────────────────────────
  if (editingDate) {
    return (
      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border ${m.bg} transition-all`}>
        <div className="flex items-center gap-1.5 shrink-0">{m.icon}<span className="text-sm font-bold">{m.label}</span></div>
        <input type="date" value={dateValue} onChange={e => setDateValue(e.target.value)} autoFocus
          className="text-[11px] font-bold bg-white/80 dark:bg-white/10 border border-current/20 rounded-md px-1.5 py-0.5 focus:outline-none" />
        <button onClick={handleSaveDate} disabled={isSavingDate} className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-50" title="Valider">
          {isSavingDate ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
        </button>
        <button onClick={() => setEditingDate(false)} className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10" title="Annuler"><X size={11} /></button>
      </div>
    );
  }

  // ── Mode confirmation email ───────────────────────────────────────────────
  if (emailConfirm) {
    return (
      <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border ${m.bg} transition-all`}>
        <Mail size={13} className="shrink-0" />
        {emailSent ? (
          <span className="text-sm font-bold flex-1 flex items-center gap-1.5"><Check size={13} /> Envoyé !</span>
        ) : patient?.email && !editingEmail ? (
          <span className="text-[11px] font-medium flex-1 truncate">Envoyer à <strong>{patient.email}</strong> ?</span>
        ) : (
          <input
            type="email"
            value={emailInput}
            onChange={e => setEmailInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleSendEmail(); }}
            placeholder="Email du patient"
            autoFocus
            className="text-[11px] font-medium flex-1 min-w-0 bg-white/80 dark:bg-white/10 border border-current/20 rounded-lg px-2 py-1 outline-none placeholder:opacity-40"
          />
        )}
        {!emailSent && (
          <>
            {patient?.email && !editingEmail && (
              <button
                onClick={() => { setEmailInput(patient.email); setEditingEmail(true); }}
                className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                title="Modifier le destinataire"
              >
                <Pencil size={11} />
              </button>
            )}
            <button
              onClick={handleSendEmail}
              disabled={emailSending || ((editingEmail || !patient?.email) && !emailInput.trim())}
              className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
              title="Confirmer l'envoi"
            >
              {emailSending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
            </button>
            <button onClick={() => { setEmailConfirm(false); setEmailInput(""); setEditingEmail(false); }} className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors" title="Annuler"><X size={11} /></button>
          </>
        )}
      </div>
    );
  }

  // ── Mode normal ───────────────────────────────────────────────────────────
  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border ${m.bg} transition-all`}>
      <button onClick={handleOpen} disabled={isProcessing} className="flex items-center gap-1.5 flex-1 min-w-0 text-left cursor-pointer hover:opacity-75 transition-opacity disabled:opacity-50">
        {m.icon}<span className="text-sm font-bold">{m.label}</span>
      </button>
      {isProcessing ? <Loader2 size={13} className="animate-spin ml-1 shrink-0" /> : (
        <div className="flex items-center gap-1 ml-auto shrink-0">
          {canEditDate && (
            <button onClick={() => setEditingDate(true)} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors" title="Modifier la date"><Calendar size={13} /></button>
          )}
          {canEditCR && (
            <button onClick={() => onEditCR(doc)} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors" title="Modifier le compte rendu"><Pencil size={13} /></button>
          )}
          {canEditOrdo && (
            <button onClick={() => onEdit(doc)} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors" title="Modifier l'ordonnance"><Pencil size={13} /></button>
          )}
          {canEditFactureDoc && (
            <button onClick={() => onEditFacture(doc)} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors" title="Modifier la facture"><Pencil size={13} /></button>
          )}
          {doc.type !== "crpatient" && (
            <button onClick={() => setEmailConfirm(true)} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors" title="Envoyer par email"><Mail size={13} /></button>
          )}
        </div>
      )}
    </div>
  );
}

// ── RecoveryBanner ────────────────────────────────────────────────────────────
function RecoveryBanner({ recoverableLogs, patients }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [states, setStates] = useState({});
  const [errors, setErrors] = useState({});
  const [dismissed, setDismissed] = useState({});

  if (!recoverableLogs?.length) return null;

  const visible = recoverableLogs.filter(l => !dismissed[l.id]);
  if (!visible.length) return null;

  const active = visible.filter(l => !l.expired);
  const expired = visible.filter(l => l.expired);

  const getPatient = (patientId) => patients.find(p => p.id === patientId);

  const handleRecover = async (log) => {
    setStates(s => ({ ...s, [log.id]: "loading" }));
    setErrors(e => ({ ...e, [log.id]: "" }));
    try {
      const res = await fetch("/api/regenerate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logId: log.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur serveur");
      setStates(s => ({ ...s, [log.id]: "success" }));
      setTimeout(() => {
        setDismissed(d => ({ ...d, [log.id]: true }));
        router.refresh();
      }, 2000);
    } catch (e) {
      setStates(s => ({ ...s, [log.id]: "error" }));
      setErrors(er => ({ ...er, [log.id]: e.message }));
    }
  };

  const formatAge = (isoDate) => {
    const diff = Date.now() - new Date(isoDate).getTime();
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    if (d >= 1) return `il y a ${d}j${h > 0 ? ` ${h}h` : ""}`;
    if (h >= 1) return `il y a ${h}h`;
    return `il y a ${Math.floor(diff / 60000)}min`;
  };

  const LogRow = ({ log }) => {
    const patient = getPatient(log.patientId);
    const state = states[log.id] || "idle";
    const error = errors[log.id];
    return (
      <div key={log.id} className={`flex items-center gap-3 px-4 py-3 ${log.expired ? "opacity-50" : ""}`}>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${log.expired ? "bg-slate-100 dark:bg-white/5" : "bg-orange-100 dark:bg-orange-500/10"}`}>
          <WifiOff size={13} className={log.expired ? "text-slate-400" : "text-orange-500"} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#001F3F] dark:text-white truncate">
            {patient ? `${formatPrenom(patient.prenom)} ${formatNom(patient.nom)}` : "Patient inconnu"}
          </p>
          <p className="text-[11px] text-slate-400">
            {formatAge(log.createdAt)}
            {log.expired && <span className="ml-1 text-slate-400">· audio expiré</span>}
          </p>
          {state === "error" && error && (
            <p className="text-[11px] text-red-500 font-medium mt-0.5">{error}</p>
          )}
        </div>
        {log.expired ? (
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-lg">Expiré</span>
        ) : state === "success" ? (
          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
            <Check size={13} /> Récupéré
          </span>
        ) : (
          <button
            onClick={() => handleRecover(log)}
            disabled={state === "loading"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#4931F7] text-white text-xs font-black hover:bg-[#3b26c6] disabled:opacity-60 transition-colors shrink-0"
          >
            {state === "loading"
              ? <><Loader2 size={11} className="animate-spin" /> En cours…</>
              : <><RotateCcw size={11} /> Récupérer</>}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="mb-5 rounded-2xl border border-orange-200 dark:border-orange-500/20 bg-orange-50/60 dark:bg-orange-500/5 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-colors text-left"
      >
        <AlertCircle size={15} className="text-orange-500 shrink-0" />
        <span className="flex-1 text-sm font-black text-orange-600 dark:text-orange-400">
          {active.length > 0
            ? `${active.length} enregistrement${active.length > 1 ? "s" : ""} à récupérer`
            : `${expired.length} enregistrement${expired.length > 1 ? "s" : ""} non traité${expired.length > 1 ? "s" : ""} (audio expiré)`}
        </span>
        <ChevronDown size={14} className={`text-orange-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-orange-200 dark:border-orange-500/20 divide-y divide-orange-100 dark:divide-orange-500/10">
          {active.map(log => <LogRow key={log.id} log={log} />)}
          {expired.map(log => <LogRow key={log.id} log={log} />)}
        </div>
      )}
    </div>
  );
}

// ── COMPOSANT PRINCIPAL ───────────────────────────────────────────────────────
export default function MesPatients({ patients = [], praticien = null, recoverableLogs = [] }) {
  const router = useRouter();
  const { showModal } = useCustomModal();

  // Navigation
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showMobilePanel, setShowMobilePanel] = useState(false);

  // Recherche
  const [search, setSearch] = useState("");

  // Modals
  const [showNewModal, setShowNewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [consultToDelete, setConsultToDelete] = useState(null);
  const [docToDelete, setDocToDelete] = useState(null);

  // Forms
  const [editingPatient, setEditingPatient] = useState(null);
  const [newPatient, setNewPatient] = useState({ nom: "", prenom: "", email: "", telephone: "", dateNaissance: "", adresse: "", codePostal: "", ville: "", pays: "France" });
  const [duplicateMatches, setDuplicateMatches] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Import CSV
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSource, setImportSource] = useState("doctolib");
  const [csvReviewPatients, setCsvReviewPatients] = useState(null);

  // Fusion des doublons
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeSelections, setMergeSelections] = useState({}); // { [groupKey]: primaryPatientId }
  const [mergingGroupKey, setMergingGroupKey] = useState(null);
  const [isMergingAll, setIsMergingAll] = useState(false);

  // Édition ordonnance
  const [ordoEditDoc, setOrdoEditDoc] = useState(null);
  const [ordoEditItems, setOrdoEditItems] = useState([]);
  const [ordoSaving, setOrdoSaving] = useState(false);
  const [ordoExpandedId, setOrdoExpandedId] = useState(null);

  const handleOpenOrdoEdit = (doc) => {
    const items = (doc.data?.items || []).map(item => ({ ...item, id: item.id ?? Date.now() + Math.random() }));
    setOrdoEditItems(items);
    setOrdoExpandedId(null);
    setOrdoEditDoc(doc);
  };

  const updateOrdoItem = (id, field, value) =>
    setOrdoEditItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));

  const removeOrdoItem = (id) => setOrdoEditItems(prev => prev.filter(i => i.id !== id));

  const addOrdoItem = () => {
    const newItem = { id: Date.now() + Math.random(), name: "", dosage: "", form: "", qty: 1, unit: "boîte(s)", instructions: "" };
    setOrdoEditItems(prev => [...prev, newItem]);
    setOrdoExpandedId(newItem.id);
  };

  const handleOrdoSave = async () => {
    if (!ordoEditDoc?.consultation?.id) return;
    setOrdoSaving(true);
    try {
      const contenu = ordoEditItems.map((item, i) =>
        `${i + 1}/ ${item.name}${item.dosage ? ` ${item.dosage}` : ""} ${item.form}\n   Qté : ${item.qty} ${item.unit}\n   ${item.instructions}`
      ).join("\n\n");
      await fetch(`/api/consultations/${ordoEditDoc.consultation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ordonnanceData: { contenu, items: ordoEditItems } }),
      });
      setOrdoEditDoc(null);
      router.refresh();
    } catch {
      await showModal({ type: "alert", title: "Erreur", message: "Impossible de sauvegarder l'ordonnance." });
    } finally { setOrdoSaving(false); }
  };

  // Édition facture
  const [factureEditDoc, setFactureEditDoc] = useState(null);
  const [factureEditItems, setFactureEditItems] = useState([]);
  const [factureEditMode, setFactureEditMode] = useState("");
  const [factureSaving, setFactureSaving] = useState(false);

  const handleOpenFactureEdit = (doc) => {
    const items = (doc.data?.items || []).map(item => ({ ...item, _id: Math.random() }));
    setFactureEditItems(items);
    setFactureEditMode(doc.data?.modePaiement || "");
    setFactureEditDoc(doc);
  };

  const handleFactureSave = async () => {
    if (!factureEditDoc?.consultation?.id) return;
    setFactureSaving(true);
    try {
      const total = factureEditItems.reduce(
        (acc, item) => acc + (parseFloat(item.unitPrice) || 0) * (parseInt(item.quantity) || 1), 0
      );
      const cleanItems = factureEditItems.map(({ _id, ...item }) => item);
      const updatedData = {
        ...factureEditDoc.data,
        items: cleanItems,
        totalAmount: `${total.toFixed(2)} €`,
        modePaiement: factureEditMode || null,
      };
      await fetch(`/api/consultations/${factureEditDoc.consultation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ devisData: updatedData }),
      });
      setFactureEditDoc(null);
      router.refresh();
    } catch {
      await showModal({ type: "alert", title: "Erreur", message: "Impossible de sauvegarder la facture." });
    } finally { setFactureSaving(false); }
  };

  // Édition CR
  const [editingReport, setEditingReport] = useState(null);
  const [editedReportData, setEditedReportData] = useState(null);
  const [isSavingReport, setIsSavingReport] = useState(false);

  // Coordonnées patient (expand)
  const [showContactInfo, setShowContactInfo] = useState(false);

  // Accordéon historique (une seule row ouverte à la fois)
  const [openConsultId, setOpenConsultId] = useState(null);

  // Notes & Photos inline
  const [editingNotes, setEditingNotes] = useState(null); // { consultId, value }
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [savingPhotosId, setSavingPhotosId] = useState(null); // consultId en cours d'upload
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const [courrierText, setCourrierText] = useState(null);
  const [courrierState, setCourrierState] = useState("idle");
  const [courrierError, setCourrierError] = useState("");
  const [courrierConsultId, setCourrierConsultId] = useState(null);
  const [courrierEditing, setCourrierEditing] = useState(false);
  const [courrierDraft, setCourrierDraft] = useState("");
  const [courrierSaving, setCourrierSaving] = useState(false);
  const [courrierSaveError, setCourrierSaveError] = useState("");
  const [courrierEmailPanel, setCourrierEmailPanel] = useState(false);
  const [courrierEmailInput, setCourrierEmailInput] = useState("");
  const [courrierSendState, setCourrierSendState] = useState("idle");
  const [courrierSendError, setCourrierSendError] = useState("");

  const handleSaveCourrier = async (consultId, currentReportData) => {
    setCourrierSaving(true);
    setCourrierSaveError("");
    try {
      const res = await fetch(`/api/consultations/${consultId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportData: { ...currentReportData, courrier_adressage: courrierDraft } }),
      });
      if (!res.ok) throw new Error("Erreur serveur");
      setCourrierText(courrierDraft);
      setCourrierConsultId(consultId);
      setCourrierEditing(false);
    } catch (e) {
      setCourrierSaveError(e.message);
    } finally {
      setCourrierSaving(false);
    }
  };

  const handleSendCourrier = async (text) => {
    if (!courrierEmailInput.trim()) return;
    setCourrierSendState("loading");
    setCourrierSendError("");
    try {
      const res = await fetch("/api/send-courrier-medecin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailMedecin: courrierEmailInput.trim(),
          courrier: text,
          praticienPrenom: praticien?.prenom,
          praticienNom: praticien?.nom,
          cabinetName: praticien?.cabinetName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur serveur");
      setCourrierSendState("success");
      setTimeout(() => {
        setCourrierEmailPanel(false);
        setCourrierSendState("idle");
        setCourrierEmailInput("");
      }, 1500);
    } catch (e) {
      setCourrierSendState("error");
      setCourrierSendError(e.message);
    }
  };

  const handleGenerateCourrier = async (consultId) => {
    setCourrierState("loading");
    setCourrierError("");
    setCourrierConsultId(consultId);
    try {
      const res = await fetch("/api/generate-courrier-adressage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationId: consultId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur serveur");
      setCourrierText(data.courrier_adressage);
      setCourrierState("success");
    } catch (e) {
      setCourrierState("error");
      setCourrierError(e.message);
    }
  };

  const compressImage = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
      const img = new Image();
      img.src = reader.result;
      img.onload = () => {
        const maxW = 800, maxH = 800;
        let { width, height } = img;
        if (width > maxW) { height = Math.round(height * maxW / width); width = maxW; }
        if (height > maxH) { width = Math.round(width * maxH / height); height = maxH; }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
    };
  });

  const handleSaveNotes = async (consultId, notes) => {
    setIsSavingNotes(true);
    try {
      await fetch(`/api/consultations/${consultId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      setEditingNotes(null);
      router.refresh();
    } catch {} finally { setIsSavingNotes(false); }
  };

  const handleAddPhoto = async (consultId, currentPhotos, file) => {
    setSavingPhotosId(consultId);
    try {
      const compressed = await compressImage(file);
      const next = [...(currentPhotos || []), compressed];
      await fetch(`/api/consultations/${consultId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: next }),
      });
      router.refresh();
    } catch {} finally { setSavingPhotosId(null); }
  };

  const handleRemovePhoto = async (consultId, currentPhotos, index) => {
    setSavingPhotosId(consultId);
    try {
      const next = (currentPhotos || []).filter((_, i) => i !== index);
      await fetch(`/api/consultations/${consultId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: next }),
      });
      router.refresh();
    } catch {} finally { setSavingPhotosId(null); }
  };

  // ── Computed ─────────────────────────────────────────────────────────────────
  const duplicateGroups = useMemo(() => findDuplicateGroups(patients), [patients]);

  const doMergeGroup = async (group) => {
    const primaryId = mergeSelections[group.key] || group.members[0].id;
    const duplicateIds = group.members.filter(m => m.id !== primaryId).map(m => m.id);
    setMergingGroupKey(group.key);
    try {
      const res = await fetch("/api/patients/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryId, duplicateIds }),
      });
      if (res.ok) {
        router.refresh();
      } else {
        await showModal({ type: "alert", title: "Erreur", message: "Impossible de fusionner ces patients." });
      }
    } catch {
      await showModal({ type: "alert", title: "Erreur", message: "Impossible de fusionner ces patients." });
    } finally {
      setMergingGroupKey(null);
    }
  };

  const doMergeAll = async () => {
    setIsMergingAll(true);
    try {
      const results = await Promise.all(duplicateGroups.map(group => {
        const primaryId = mergeSelections[group.key] || group.members[0].id;
        const duplicateIds = group.members.filter(m => m.id !== primaryId).map(m => m.id);
        return fetch("/api/patients/merge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ primaryId, duplicateIds }),
        }).then(r => r.ok);
      }));
      router.refresh();
      if (results.every(Boolean)) {
        setShowMergeModal(false);
      } else {
        await showModal({ type: "alert", title: "Fusion partielle", message: "Certains groupes n'ont pas pu être fusionnés. Réessayez ceux qui restent." });
      }
    } catch {
      await showModal({ type: "alert", title: "Erreur", message: "Impossible de fusionner les doublons." });
    } finally {
      setIsMergingAll(false);
    }
  };

  const filtered = patients
    .filter(p =>
      `${p.nom} ${p.prenom} ${p.prenom} ${p.nom}`.toLowerCase().includes(search.toLowerCase()) ||
      (p.telephone && p.telephone.includes(search))
    )
    .sort((a, b) =>
      a.nom.localeCompare(b.nom, "fr") || a.prenom.localeCompare(b.prenom, "fr")
    );

  const fresh = selectedPatient ? patients.find(p => p.id === selectedPatient.id) || selectedPatient : null;

  const sortedConsults = fresh?.consultations
    ? [...fresh.consultations].filter(c => c.typeConsultation !== "facturation" || c.reportData).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    : [];

  const sortedConsultIds = new Set(sortedConsults.map(c => c.id));
  const sortedFacturations = fresh?.consultations
    ? [...fresh.consultations].filter(c => c.typeConsultation === "facturation" && c.devisData && !sortedConsultIds.has(c.id)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    : [];

  const allDocs = [];
  if (fresh?.consultations) {
    fresh.consultations.forEach(c => {
      const date = new Date(c.createdAt);
      if (c.reportData) allDocs.push({ id: `${c.id}-cr`, type: "cr", date, data: c.reportData, photos: c.photos, notes: c.notes, consultation: c });
      if (c.reportData) allDocs.push({ id: `${c.id}-crpatient`, type: "crpatient", date, data: c.reportData, photos: c.photos, consultation: c });
      if (c.devisData) {
        const dj = typeof c.devisData === "string" ? JSON.parse(c.devisData) : c.devisData;
        const factureDate = dj.factureDate ? new Date(dj.factureDate) : date;
        // Devis visible uniquement pour les semelles (nomenclature LPP ou item "Semelles")
        const isSemelles = !!dj.nomenclatureSelected ||
          dj.items?.some(item => item.description?.toLowerCase().includes("semelle"));
        if (c.typeConsultation === "facturation") {
          if (isSemelles) allDocs.push({ id: `${c.id}-devis`, type: "devis", date: factureDate, data: dj, signature: c.signatureDevis, consultation: c });
          allDocs.push({ id: `${c.id}-facture`, type: "facture", date: factureDate, data: dj, signature: c.signatureFacture || c.signatureDevis, consultation: c });
        } else {
          if (isSemelles) allDocs.push({ id: `${c.id}-devis`, type: "devis", date: factureDate, data: dj, signature: c.signatureDevis, consultation: c });
          if (c.signatureDevis || c.signatureFacture || dj.status === "SIGNED") {
            allDocs.push({ id: `${c.id}-facture`, type: "facture", date: factureDate, data: dj, signature: c.signatureFacture || c.signatureDevis, consultation: c });
          }
        }
      }
      if (c.ordonnanceData) {
        const oj = typeof c.ordonnanceData === "string" ? JSON.parse(c.ordonnanceData) : c.ordonnanceData;
        allDocs.push({ id: `${c.id}-ordo`, type: "ordo", date, data: oj, consultation: c });
      }
    });
    allDocs.sort((a, b) => b.date - a.date);
  }
  // Regroupe les docs par jour — déduplique par type, priorité à la même consultation, ordre fixe
  const DOC_ORDER = { cr: 0, crpatient: 1, devis: 2, facture: 3, ordo: 4 };
  const getDocsForConsult = (consult) => {
    if (!consult) return [];
    const day = new Date(consult.createdAt).toDateString();
    const candidates = allDocs.filter(d =>
      d.consultation?.id === consult.id || d.date.toDateString() === day
    );
    const byType = new Map();
    // 1er passage : même consultation (prioritaire)
    candidates.filter(d => d.consultation?.id === consult.id).forEach(d => byType.set(d.type, d));
    // 2ème passage : même jour — seulement si le type n'est pas encore couvert
    candidates.filter(d => d.consultation?.id !== consult.id).forEach(d => {
      if (!byType.has(d.type)) byType.set(d.type, d);
    });
    return [...byType.values()].sort((a, b) => (DOC_ORDER[a.type] ?? 9) - (DOC_ORDER[b.type] ?? 9));
  };

  const lastConsult = sortedConsults[0] ?? null;
  const lastConsultDocs = getDocsForConsult(lastConsult);
  const prevConsults = sortedConsults.slice(1);

  // ── API ───────────────────────────────────────────────────────────────────────
  const selectPatient = (p) => { setSelectedPatient(p); setEditingReport(null); setShowMobilePanel(true); setShowContactInfo(false); setOpenConsultId(null); };

  const handleCreate = async (e, force = false) => {
    e.preventDefault();
    if (!force) {
      const matches = findMatchingPatients(newPatient, patients);
      if (matches.length > 0) { setDuplicateMatches(matches); return; }
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/patients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newPatient) });
      if (res.ok) {
        setShowNewModal(false);
        setDuplicateMatches(null);
        setNewPatient({ nom: "", prenom: "", email: "", telephone: "", dateNaissance: "", adresse: "", codePostal: "", ville: "", pays: "France" });
        router.refresh();
      } else await showModal({ type: "alert", title: "Erreur", message: "Erreur lors de la création." });
    } catch {} finally { setIsSubmitting(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      const res = await fetch(`/api/patients/${editingPatient.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editingPatient) });
      if (res.ok) { setShowEditModal(false); router.refresh(); }
      else await showModal({ type: "alert", title: "Erreur", message: "Erreur lors de la modification." });
    } catch {} finally { setIsSubmitting(false); }
  };

  const doDeletePatient = async () => {
    if (!patientToDelete) return; setIsDeleting(true);
    try {
      const res = await fetch(`/api/patients/${patientToDelete.id}`, { method: "DELETE" });
      if (res.ok) {
        setPatientToDelete(null);
        if (fresh?.id === patientToDelete.id) { setSelectedPatient(null); setShowMobilePanel(false); }
        router.refresh();
      }
    } catch {} finally { setIsDeleting(false); }
  };

  const doDeleteConsult = async () => {
    if (!consultToDelete) return; setIsDeleting(true);
    try {
      const res = await fetch(`/api/consultations/${consultToDelete.id}`, { method: "DELETE" });
      if (res.ok) { setConsultToDelete(null); router.refresh(); }
    } catch {} finally { setIsDeleting(false); }
  };

  const doDeleteDoc = async () => {
    if (!docToDelete) return; setIsDeleting(true);
    try {
      let payload = {};
      if (docToDelete.type === "cr") payload = { reportData: null };
      else if (docToDelete.type === "devis" || docToDelete.type === "facture") payload = { devisData: null, signatureDevis: null, signatureFacture: null };
      else if (docToDelete.type === "ordo") payload = { ordonnanceData: null };
      const res = await fetch(`/api/consultations/${docToDelete.consultation.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) { setDocToDelete(null); router.refresh(); }
    } catch {} finally { setIsDeleting(false); }
  };

  const saveReport = async () => {
    if (!editingReport) return; setIsSavingReport(true);
    try {
      const res = await fetch(`/api/consultations/${editingReport.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reportData: editedReportData }) });
      if (res.ok) { setEditingReport(null); router.refresh(); }
    } catch {} finally { setIsSavingReport(false); }
  };

  const doImport = () => {
    if (!importFile) return; setIsImporting(true);
    Papa.parse(importFile, {
      header: true, skipEmptyLines: true,
      complete: (results) => {
        setIsImporting(false);
        if (results.data.length === 0) {
          return showModal({ type: "alert", title: "Erreur", message: "Aucune ligne trouvée dans ce fichier." });
        }
        setShowImportModal(false); setImportFile(null);
        setCsvReviewPatients(results.data.map(row => normalizeCsvRow(row, importSource)));
      },
      error: () => { setIsImporting(false); showModal({ type: "alert", title: "Erreur", message: "Impossible de lire ce fichier." }); }
    });
  };

  if (csvReviewPatients) {
    return (
      <ImportPatientsReview
        rawPatients={csvReviewPatients}
        sourceLabel={importSource === "podoevolution" ? "PodoEvolution" : "Doctolib"}
        onConfirm={async (patients) => {
          const res = await fetch("/api/patients/bulk", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ patients, source: importSource }),
          });
          const data = await res.json().catch(() => ({}));
          return { success: res.ok, count: data.count, error: data.error };
        }}
        onCancel={() => {}}
        onExit={() => { setCsvReviewPatients(null); router.refresh(); }}
      />
    );
  }

  // ── RENDER ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-0 min-h-[70vh]">
      <RecoveryBanner recoverableLogs={recoverableLogs} patients={patients} />
    <div className="flex flex-col lg:flex-row gap-5 min-h-[70vh] relative">

      {/* ── LEFT: liste patients ─────────────────────────────────────────────── */}
      <div className={`shrink-0 flex flex-col gap-3 transition-all duration-300 ease-in-out lg:sticky lg:top-6 lg:self-start ${fresh ? "lg:w-[360px] xl:w-[400px]" : "lg:w-full"} ${showMobilePanel ? "hidden lg:flex" : "flex"}`}>
        {/* Actions */}
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-black text-slate-400 uppercase tracking-widest">
            {patients.length} patient{patients.length !== 1 ? "s" : ""}
          </span>
          <div className="flex gap-2">
            {duplicateGroups.length > 0 && (
              <button onClick={() => setShowMergeModal(true)} title="Fusionner les doublons"
                className="relative p-2.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all">
                <Merge size={17} />
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-amber-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                  {duplicateGroups.length}
                </span>
              </button>
            )}
            <button onClick={() => setShowImportModal(true)} title="Importer CSV"
              className="p-2.5 bg-white dark:bg-[#151e32] border border-slate-200 dark:border-white/10 rounded-xl text-slate-500 hover:text-[#4931F7] hover:border-[#4931F7]/30 transition-all">
              <UploadCloud size={17} />
            </button>
            <button onClick={() => { setDuplicateMatches(null); setShowNewModal(true); }}
              className="flex items-center gap-1.5 bg-[#4ECDC4] text-[#001F3F] px-4 py-2.5 rounded-xl font-black text-sm hover:bg-[#3dbbb3] transition-all shadow-lg shadow-[#4ECDC4]/20 active:scale-95">
              <Plus size={15} /> Nouveau
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Nom, prénom, téléphone…"
            className="w-full bg-white dark:bg-[#151e32] border border-slate-200 dark:border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm font-medium text-[#001F3F] dark:text-white outline-none focus:ring-2 focus:ring-[#4931F7]/20 focus:border-[#4931F7]/30 transition-all placeholder:text-slate-400" />
        </div>

        {!fresh ? (
          /* ── Liste (mode navigation, pleine largeur) ── */
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              {/* En-tête colonnes — sans fond, gris foncé, Montserrat bold */}
              <div className="grid grid-cols-[44px_2fr_1fr_1.4fr_2fr] gap-4 items-center px-4 py-2">
                <span />
                <span className="text-left text-xs font-bold text-slate-400 dark:text-slate-500">Nom du patient</span>
                <span className="text-left text-xs font-bold text-slate-400 dark:text-slate-500">Consultations</span>
                <span className="text-left text-xs font-bold text-slate-400 dark:text-slate-500">Dernière consultation</span>
                <span className="text-left text-xs font-bold text-slate-400 dark:text-slate-500">Dernier motif de consultation</span>
              </div>

              {filtered.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {filtered.map(p => {
                    const lastC = p.consultations?.[0];
                    return (
                      <div key={p.id} onClick={() => selectPatient(p)}
                        className="grid grid-cols-[44px_2fr_1fr_1.4fr_2fr] gap-4 items-center px-4 py-4 bg-white dark:bg-[#151e32] border border-slate-100 dark:border-white/5 rounded-2xl hover:border-[#4931F7]/20 transition-colors cursor-pointer text-xs font-bold">
                        <PatientAvatar patient={p} />
                        <div>
                          <p className="text-sm font-black text-black dark:text-white">{formatNom(p.nom)} {formatPrenom(p.prenom)}</p>
                          <div className="flex flex-col gap-0.5 mt-1">
                            {p.telephone && <span className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400"><Phone size={10} className="text-[#4931F7] shrink-0" />{p.telephone}</span>}
                            {p.email && <span className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400"><Mail size={10} className="text-[#4931F7] shrink-0" />{p.email}</span>}
                          </div>
                        </div>
                        <div className="text-slate-600 dark:text-slate-300">{p.consultations?.length || 0}</div>
                        <div className="text-slate-600 dark:text-slate-300">
                          {lastC ? (
                            <p className="capitalize">{new Date(lastC.createdAt).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}</p>
                          ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                        </div>
                        <div>
                          {lastC ? (
                            <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                              <span className="w-1 self-stretch rounded-full bg-amber-400 shrink-0" />
                              {lastC.motif || "Consultation"}
                            </span>
                          ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 text-center py-16">
                  <Users size={36} className="text-slate-300 dark:text-slate-700" />
                  <p className="text-sm text-slate-400 font-medium">Aucun patient trouvé</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ── Cartes compactes (mode détail, colonne étroite) ── */
          <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: "calc(100vh - 300px)" }}>
            {filtered.length > 0 ? filtered.map(p => {
              const isActive = fresh?.id === p.id;
              return (
                <button key={p.id} onClick={() => selectPatient(p)}
                  className={`w-full text-left flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                    isActive
                      ? "bg-[#4931F7]/5 border-[#4931F7]/30 ring-1 ring-[#4931F7]/20 dark:bg-[#4931F7]/10"
                      : "bg-white dark:bg-[#151e32] border-slate-100 dark:border-white/5 hover:border-[#4931F7]/20 hover:shadow-sm"
                  }`}>
                  <PatientAvatar patient={p} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#001F3F] dark:text-white truncate">{formatPrenom(p.prenom)} <span className="uppercase">{p.nom}</span></p>
                  </div>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[#4931F7] shrink-0" />}
                </button>
              );
            }) : (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <Users size={36} className="text-slate-300 dark:text-slate-700" />
                <p className="text-sm text-slate-400 font-medium">Aucun patient trouvé</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── RIGHT: volet patient ─────────────────────────────────────────────── */}
      {(showMobilePanel || fresh) && (
      <div className={`flex-1 min-w-0 ${showMobilePanel ? "flex flex-col" : "hidden lg:flex lg:flex-col"} animate-in slide-in-from-right-8 fade-in duration-300`}>
        <div className="flex flex-col gap-4">

          {/* Mobile: retour */}
          <button onClick={() => { setShowMobilePanel(false); setEditingReport(null); }}
            className="lg:hidden flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#4931F7] transition-colors self-start">
            <ArrowLeft size={15} /> Retour à la liste
          </button>

          {editingReport ? (
            /* ── Mode édition CR ──────────────────────────────────────── */
            <div className="bg-white dark:bg-[#151e32] rounded-2xl border border-slate-100 dark:border-white/5 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <button onClick={() => setEditingReport(null)} className="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-[#4931F7] transition-colors">
                  <ArrowLeft size={15} /> Retour
                </button>
                <button onClick={saveReport} disabled={isSavingReport}
                  className="flex items-center gap-2 px-4 py-2 bg-[#4931F7] text-white rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-[#3b26c6] transition-colors">
                  {isSavingReport ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Sauvegarder
                </button>
              </div>
              {editedReportData && Object.entries(editedReportData).map(([key, value]) => (
                <div key={key}>
                  <label className="text-[10px] font-black text-[#4931F7] uppercase tracking-widest mb-1.5 block">{key.replace(/_/g, " ")}</label>
                  <AutoResizeTextarea
                    value={Array.isArray(value) ? value.join("\n") : typeof value === "object" ? JSON.stringify(value, null, 2) : String(value || "")}
                    onChange={val => {
                      let parsed = val;
                      if (Array.isArray(editedReportData[key])) parsed = val.split("\n");
                      else if (typeof editedReportData[key] === "object" && editedReportData[key] !== null) { try { parsed = JSON.parse(val); } catch {} }
                      setEditedReportData(p => ({ ...p, [key]: parsed }));
                    }}
                    className="w-full bg-slate-50 dark:bg-[#0b1121] border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm focus:ring-2 focus:ring-[#4931F7] outline-none"
                  />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* ── 1. Header patient ───────────────────────────────────── */}
              <div className="bg-white dark:bg-[#151e32] rounded-2xl border border-slate-100 dark:border-white/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#4931F7] text-white flex items-center justify-center text-base font-black shrink-0">
                    {fresh.prenom?.charAt(0).toUpperCase()}{fresh.nom?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-black text-[#001F3F] dark:text-white leading-tight truncate">
                      {formatPrenom(fresh.prenom)} <span className="uppercase">{fresh.nom}</span>
                    </h3>
                    <span className="text-xs text-slate-400 font-medium">
                      {sortedConsults.length} consultation{sortedConsults.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setShowContactInfo(v => !v)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                        showContactInfo
                          ? "bg-[#4931F7] text-white border-[#4931F7] shadow-sm"
                          : "text-slate-400 border-slate-200 dark:border-white/10 hover:border-[#4931F7]/30 hover:text-[#4931F7]"
                      }`}>
                      <ChevronDown size={12} className={`transition-transform duration-200 ${showContactInfo ? "rotate-180" : ""}`} />
                      <span className="hidden sm:inline">Coordonnées</span>
                    </button>
                    <button onClick={() => { setEditingPatient({ ...fresh }); setShowEditModal(true); }}
                      className="p-2 rounded-xl text-slate-400 hover:text-[#4931F7] hover:bg-[#4931F7]/5 border border-transparent hover:border-[#4931F7]/10 transition-all" title="Modifier">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setPatientToDelete(fresh)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all" title="Supprimer">
                      <Trash2 size={14} />
                    </button>
                    <button onClick={() => { setSelectedPatient(null); setShowMobilePanel(false); }}
                      className="p-2 rounded-xl text-slate-400 hover:text-[#001F3F] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 border border-transparent transition-all" title="Fermer">
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {showContactInfo && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 grid grid-cols-2 gap-x-4 gap-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    {fresh.telephone && (
                      <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <Phone size={11} className="text-[#4931F7] shrink-0" />{fresh.telephone}
                      </span>
                    )}
                    {fresh.dateNaissance && (
                      <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <Calendar size={11} className="text-[#4931F7] shrink-0" />{new Date(fresh.dateNaissance).toLocaleDateString("fr-FR")}
                      </span>
                    )}
                    {fresh.email && (
                      <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium col-span-2 truncate">
                        <Mail size={11} className="text-[#4931F7] shrink-0" />{fresh.email}
                      </span>
                    )}
                    {(fresh.adresse || fresh.ville) && (
                      <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium col-span-2">
                        <MapPin size={11} className="text-[#4931F7] shrink-0" />
                        {[fresh.adresse, fresh.codePostal, fresh.ville].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* ── 2. Dernière consultation ─────────────────────────────── */}
              {lastConsult ? (
                <div className="bg-white dark:bg-[#151e32] rounded-2xl border border-slate-100 dark:border-white/5 overflow-hidden">
                  {/* En-tête */}
                  <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 border-b border-slate-100 dark:border-white/5">
                    <div>
                      <p className="text-[9px] font-black text-[#4931F7] uppercase tracking-widest mb-1.5">Dernière consultation</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-[#001F3F] dark:text-white">
                          {new Date(lastConsult.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                        </span>
                        <TypeBadge type={lastConsult.typeConsultation} />
                      </div>
                      {lastConsult.motif && <p className="text-xs text-slate-400 mt-0.5">{lastConsult.motif}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {lastConsult.reportData && (
                        <button onClick={() => { setEditingReport(lastConsult); setEditedReportData(lastConsult.reportData); }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#4931F7] hover:bg-[#4931F7]/5 transition-all" title="Modifier le CR">
                          <Pencil size={13} />
                        </button>
                      )}
                      <button onClick={() => setConsultToDelete(lastConsult)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all" title="Supprimer">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* CR / Transcription / Notes / Photos */}
                  <div className="px-4 py-4 space-y-3">
                    {/* Pédicurie → dictée vocale */}
                    {lastConsult.typeConsultation === "pedicurie" && lastConsult.transcription && (
                      <div>
                        <p className="text-[9px] font-black text-[#4931F7] uppercase tracking-widest mb-1.5">Dictée vocale</p>
                        <p className="text-sm font-medium whitespace-pre-wrap text-[#001F3F] dark:text-white leading-relaxed">{lastConsult.transcription}</p>
                      </div>
                    )}
                    {/* Autres types → CR structuré */}
                    {lastConsult.reportData && lastConsult.typeConsultation !== "pedicurie" && (
                      <div className="space-y-2">
                        {Object.entries(lastConsult.reportData).filter(([key]) => key !== "resume_confreres" && key !== "courrier_adressage").map(([key, value]) => (
                          <div key={key}>
                            <p className="text-[9px] font-black text-[#4931F7] uppercase tracking-widest">{key.replace(/_/g, " ")}</p>
                            <p className="text-sm font-medium text-[#001F3F] dark:text-slate-300 whitespace-pre-wrap">
                              {Array.isArray(value) ? value.join(", ") : typeof value === "object" ? JSON.stringify(value) : String(value || "—")}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── Courrier d'adressage ── */}
                    {lastConsult.reportData && lastConsult.typeConsultation !== "pedicurie" && (() => {
                      const currentCourrierText = courrierConsultId === lastConsult.id ? courrierText : lastConsult.reportData?.courrier_adressage;
                      const isEditingThis = courrierEditing && courrierConsultId === lastConsult.id;
                      return (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Courrier d'adressage</p>
                            {currentCourrierText && !isEditingThis && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    setCourrierDraft(currentCourrierText);
                                    setCourrierConsultId(lastConsult.id);
                                    setCourrierSaveError("");
                                    setCourrierEditing(true);
                                  }}
                                  className="p-1 rounded text-slate-400 hover:text-blue-500 hover:bg-blue-500/5 transition-all" title="Modifier"
                                >
                                  <Pencil size={11} />
                                </button>
                                <button
                                  onClick={() => {
                                    setCourrierConsultId(lastConsult.id);
                                    setCourrierEmailPanel(v => !v);
                                    setCourrierSendState("idle");
                                    setCourrierSendError("");
                                  }}
                                  className="p-1 rounded text-slate-400 hover:text-blue-500 hover:bg-blue-500/5 transition-all" title="Envoyer par mail"
                                >
                                  <Mail size={11} />
                                </button>
                              </div>
                            )}
                          </div>

                          {isEditingThis ? (
                            <div className="space-y-2">
                              <AutoResizeTextarea
                                value={courrierDraft}
                                onChange={setCourrierDraft}
                                className="w-full bg-white dark:bg-[#0b1121] border-2 border-blue-500/30 focus:border-blue-500 rounded-xl p-3 text-sm outline-none dark:text-white"
                              />
                              {courrierSaveError && <p className="text-[11px] text-red-500 font-medium">{courrierSaveError}</p>}
                              <div className="flex gap-2">
                                <button onClick={() => setCourrierEditing(false)}
                                  className="flex-1 py-2 text-xs font-bold text-slate-500 bg-slate-100 dark:bg-white/10 rounded-xl hover:bg-slate-200 transition-colors">
                                  Annuler
                                </button>
                                <button onClick={() => handleSaveCourrier(lastConsult.id, lastConsult.reportData)} disabled={courrierSaving}
                                  className="flex-1 py-2 text-xs font-black text-white bg-blue-500 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-60">
                                  {courrierSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Sauvegarder
                                </button>
                              </div>
                            </div>
                          ) : currentCourrierText ? (
                            <div className="bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 rounded-xl p-3">
                              <p className="text-sm font-medium text-[#001F3F] dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                {currentCourrierText}
                              </p>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1.5">
                              {courrierConsultId === lastConsult.id && courrierState === "error" && courrierError && (
                                <p className="text-[11px] text-red-500 font-medium">{courrierError}</p>
                              )}
                              <button
                                onClick={() => handleGenerateCourrier(lastConsult.id)}
                                disabled={courrierConsultId === lastConsult.id && courrierState === "loading"}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-200 dark:border-blue-800/40 text-blue-600 dark:text-blue-400 text-xs font-black hover:bg-blue-500/20 disabled:opacity-60 transition-colors self-start"
                              >
                                {courrierConsultId === lastConsult.id && courrierState === "loading"
                                  ? <><Loader2 size={11} className="animate-spin" /> Génération…</>
                                  : <><FileText size={11} /> Générer</>}
                              </button>
                            </div>
                          )}

                          {courrierEmailPanel && courrierConsultId === lastConsult.id && !isEditingThis && (
                            <div className="mt-2 flex flex-col gap-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Email du médecin destinataire</label>
                              <input
                                type="email"
                                value={courrierEmailInput}
                                onChange={(e) => setCourrierEmailInput(e.target.value)}
                                placeholder="medecin@exemple.com"
                                className="w-full bg-white dark:bg-[#0b1121] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 dark:text-white"
                              />
                              {courrierSendState === "error" && courrierSendError && (
                                <p className="text-[11px] text-red-500 font-medium">{courrierSendError}</p>
                              )}
                              {courrierSendState === "success" ? (
                                <p className="text-xs font-bold text-emerald-600 flex items-center gap-1.5"><Check size={12} /> Courrier envoyé</p>
                              ) : (
                                <div className="flex gap-2">
                                  <button onClick={() => setCourrierEmailPanel(false)}
                                    className="flex-1 py-2 text-xs font-bold text-slate-500 bg-slate-100 dark:bg-white/10 rounded-xl hover:bg-slate-200 transition-colors">
                                    Annuler
                                  </button>
                                  <button onClick={() => handleSendCourrier(currentCourrierText)} disabled={courrierSendState === "loading" || !courrierEmailInput.trim()}
                                    className="flex-1 py-2 text-xs font-black text-white bg-blue-500 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-60">
                                    {courrierSendState === "loading" ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />} Envoyer
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* ── Notes (éditable) ── */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Notes</p>
                        {editingNotes?.consultId !== lastConsult.id && (
                          <button onClick={() => setEditingNotes({ consultId: lastConsult.id, value: lastConsult.notes || "" })}
                            className="p-1 rounded text-slate-400 hover:text-[#4931F7] hover:bg-[#4931F7]/5 transition-all" title="Modifier">
                            <Pencil size={11} />
                          </button>
                        )}
                      </div>
                      {editingNotes?.consultId === lastConsult.id ? (
                        <div className="space-y-2">
                          <AutoResizeTextarea
                            value={editingNotes.value}
                            onChange={val => setEditingNotes(prev => ({ ...prev, value: val }))}
                            className="w-full bg-white dark:bg-[#0b1121] border-2 border-[#4931F7]/30 focus:border-[#4931F7] rounded-xl p-3 text-sm outline-none dark:text-white"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => setEditingNotes(null)}
                              className="flex-1 py-2 text-xs font-bold text-slate-500 bg-slate-100 dark:bg-white/10 rounded-xl hover:bg-slate-200 transition-colors">
                              Annuler
                            </button>
                            <button onClick={() => handleSaveNotes(lastConsult.id, editingNotes.value)} disabled={isSavingNotes}
                              className="flex-1 py-2 text-xs font-black text-white bg-[#4931F7] rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-60">
                              {isSavingNotes ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Sauvegarder
                            </button>
                          </div>
                        </div>
                      ) : lastConsult.notes?.trim() ? (
                        <p className="text-sm font-medium text-[#001F3F] dark:text-white whitespace-pre-wrap leading-relaxed">{lastConsult.notes}</p>
                      ) : (
                        <button onClick={() => setEditingNotes({ consultId: lastConsult.id, value: "" })}
                          className="text-xs text-slate-400 hover:text-[#4931F7] font-medium flex items-center gap-1.5 transition-colors py-0.5">
                          <Plus size={12} /> Ajouter une note
                        </button>
                      )}
                    </div>

                    {/* ── Photos (éditable) ── */}
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                        <Camera size={9} /> Photos{Array.isArray(lastConsult.photos) && lastConsult.photos.length > 0 ? ` (${lastConsult.photos.length})` : ""}
                      </p>
                      <div className="grid grid-cols-5 gap-1.5">
                        {(lastConsult.photos || []).map((src, i) => (
                          <div key={i} onClick={() => setLightboxIdx(i)}
                            className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-white/10 group cursor-zoom-in">
                            <img src={src} alt="" className="w-full h-auto block" />
                            <button onClick={(e) => { e.stopPropagation(); handleRemovePhoto(lastConsult.id, lastConsult.photos, i); }}
                              disabled={savingPhotosId === lastConsult.id}
                              className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm disabled:opacity-30">
                              <X size={9} />
                            </button>
                          </div>
                        ))}
                        <label className={`aspect-square rounded-lg border-2 border-dashed flex items-center justify-center transition-colors ${savingPhotosId === lastConsult.id ? "cursor-not-allowed border-slate-200 dark:border-white/10" : "cursor-pointer border-slate-200 dark:border-white/10 hover:border-[#4931F7] hover:bg-[#4931F7]/5"}`}>
                          {savingPhotosId === lastConsult.id
                            ? <Loader2 size={14} className="animate-spin text-[#4931F7]" />
                            : <Plus size={14} className="text-slate-400" />}
                          <input type="file" accept="image/*" className="hidden" disabled={savingPhotosId === lastConsult.id}
                            onChange={e => { if (e.target.files[0]) { handleAddPhoto(lastConsult.id, lastConsult.photos || [], e.target.files[0]); e.target.value = ""; } }} />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Documents de cette consultation */}
                  {lastConsultDocs.length > 0 && (
                    <div className="px-4 pb-4 pt-3 border-t border-slate-100 dark:border-white/5 flex flex-wrap gap-2">
                      {lastConsultDocs.map(doc => (
                        <DocChip key={doc.id} doc={doc} patient={fresh} praticien={praticien} onDelete={setDocToDelete} onEdit={handleOpenOrdoEdit} onEditCR={(d) => { setEditingReport(d.consultation); setEditedReportData(d.data); }} onEditFacture={handleOpenFactureEdit} />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-14 gap-3 text-center bg-white dark:bg-[#151e32] rounded-2xl border border-slate-100 dark:border-white/5">
                  <FileQuestion size={32} className="text-slate-300 dark:text-slate-700" />
                  <p className="text-sm text-slate-400 font-medium">Aucune consultation</p>
                </div>
              )}

              {/* ── 3. Historique ───────────────────────────────────────── */}
              {prevConsults.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                    Historique
                    <span className="bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-md font-black">{prevConsults.length}</span>
                  </p>
                  {prevConsults.map(c => {
                    const cDocs = getDocsForConsult(c);
                    return (
                      <ConsultationRow
                        key={c.id}
                        consult={c}
                        onDelete={setConsultToDelete}
                        onEdit={(c) => { setEditingReport(c); setEditedReportData(c.reportData); }}
                        isOpen={openConsultId === c.id}
                        onToggle={() => setOpenConsultId(v => v === c.id ? null : c.id)}
                        docs={cDocs}
                        patient={fresh}
                        praticien={praticien}
                        onDeleteDoc={setDocToDelete}
                        onEditOrdo={handleOpenOrdoEdit}
                        onEditCR={(d) => { setEditingReport(d.consultation); setEditedReportData(d.data); }}
                        onEditFacture={handleOpenFactureEdit}
                        editingNotes={editingNotes}
                        onEditNotes={setEditingNotes}
                        onSaveNotes={handleSaveNotes}
                        isSavingNotes={isSavingNotes}
                        savingPhotosId={savingPhotosId}
                        onAddPhoto={handleAddPhoto}
                        onRemovePhoto={handleRemovePhoto}
                      />
                    );
                  })}
                </div>
              )}

              {/* ── 4. Factures autonomes (typeConsultation === "facturation") ── */}
              {sortedFacturations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                    Factures
                    <span className="bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-md font-black">{sortedFacturations.length}</span>
                  </p>
                  {sortedFacturations.map(c => {
                    const factureDocs = getDocsForConsult(c);
                    if (!factureDocs.length) return null;
                    return (
                      <div key={c.id} className="bg-white dark:bg-[#151e32] rounded-2xl border border-slate-100 dark:border-white/5 px-4 py-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[#001F3F] dark:text-white">
                            {new Date(c.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                          </span>
                          <button onClick={() => setConsultToDelete(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all" title="Supprimer">
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {factureDocs.map(doc => (
                            <DocChip key={doc.id} doc={doc} patient={fresh} praticien={praticien} onDelete={setDocToDelete} onEdit={handleOpenOrdoEdit} onEditCR={() => {}} onEditFacture={handleOpenFactureEdit} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/*  MODALS                                                               */}
      {/* ══════════════════════════════════════════════════════════════════════ */}

      {/* Import CSV */}
      {showImportModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#001F3F]/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#151e32] w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
            <div className="p-5 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
              <h3 className="text-lg font-black text-[#001F3F] dark:text-white flex items-center gap-2"><UploadCloud size={18} className="text-[#4931F7]" /> Importer des patients</h3>
              <button onClick={() => { setShowImportModal(false); setImportFile(null); }} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-400 hover:bg-red-500 hover:text-white transition-colors"><X size={15} /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex gap-3">
                {["doctolib", "podoevolution"].map(src => (
                  <label key={src} className={`flex-1 border p-3.5 rounded-xl cursor-pointer text-center transition-all ${importSource === src ? "border-[#4931F7] bg-[#4931F7]/5 ring-1 ring-[#4931F7]" : "border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5"}`}>
                    <input type="radio" name="src" value={src} checked={importSource === src} onChange={() => setImportSource(src)} className="hidden" />
                    <span className={`text-sm font-black capitalize ${importSource === src ? "text-[#4931F7]" : "text-slate-500"}`}>{src}</span>
                  </label>
                ))}
              </div>
              <div className="border-2 border-dashed border-[#4931F7]/20 bg-[#4931F7]/3 rounded-2xl p-8 flex flex-col items-center text-center relative">
                <UploadCloud size={36} className="text-[#4931F7]/40 mb-3" />
                <p className="font-bold text-[#001F3F] dark:text-white mb-1">Glissez votre fichier CSV</p>
                <input type="file" accept=".csv" onChange={e => setImportFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                {importFile && <div className="mt-3 bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-sm font-bold">{importFile.name}</div>}
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setShowImportModal(false); setImportFile(null); }} className="flex-1 py-3 rounded-xl font-bold text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 transition-colors">Annuler</button>
                <button onClick={doImport} disabled={!importFile || isImporting} className="flex-1 py-3 rounded-xl font-black text-sm text-white bg-[#001F3F] hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {isImporting ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />} Importer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fusion des doublons */}
      {showMergeModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#001F3F]/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#151e32] w-full max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh] sm:h-auto sm:max-h-[85vh] animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
            <div className="p-5 border-b border-gray-100 dark:border-white/5 flex justify-between items-center gap-3 shrink-0">
              <h3 className="text-lg font-black text-[#001F3F] dark:text-white flex items-center gap-2">
                <Merge size={18} className="text-amber-500" /> Fusionner les doublons
              </h3>
              <div className="flex items-center gap-2">
                {duplicateGroups.length > 1 && (
                  <button
                    onClick={doMergeAll}
                    disabled={isMergingAll || mergingGroupKey !== null}
                    title="Fusionne chaque groupe en conservant par défaut la fiche avec le plus de consultations"
                    className="flex items-center gap-1.5 bg-amber-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-black hover:bg-amber-600 transition-colors disabled:opacity-50"
                  >
                    {isMergingAll ? <Loader2 size={13} className="animate-spin" /> : <Merge size={13} />} Tout corriger
                  </button>
                )}
                <button onClick={() => setShowMergeModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-400 hover:bg-red-500 hover:text-white transition-colors shrink-0"><X size={15} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {duplicateGroups.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <Check size={40} className="mx-auto mb-3 text-green-400" />
                  <p className="font-bold">Aucun doublon détecté.</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Patients partageant le même nom et prénom. Choisissez la fiche à conserver
                    (les consultations des autres y seront rattachées, puis les doublons seront supprimés).
                  </p>
                  {duplicateGroups.map(group => {
                    const primaryId = mergeSelections[group.key] || group.members[0].id;
                    const isMerging = mergingGroupKey === group.key;
                    return (
                      <div key={group.key} className="border border-slate-100 dark:border-white/5 rounded-2xl overflow-hidden">
                        <div className="px-4 py-3 bg-slate-50 dark:bg-white/5 flex items-center justify-between gap-3">
                          <p className="text-sm font-black text-[#001F3F] dark:text-white">
                            {formatPrenom(group.members[0].prenom)} <span className="uppercase">{group.members[0].nom}</span>
                            <span className="ml-2 text-[11px] text-slate-400 font-bold">{group.members.length} fiches</span>
                          </p>
                          <button
                            onClick={() => doMergeGroup(group)}
                            disabled={isMerging || isMergingAll}
                            className="flex items-center gap-1.5 bg-[#4931F7] text-white px-3.5 py-1.5 rounded-lg text-xs font-black hover:bg-[#3b26c6] transition-colors disabled:opacity-50"
                          >
                            {isMerging ? <Loader2 size={13} className="animate-spin" /> : <Merge size={13} />} Fusionner
                          </button>
                        </div>
                        <div className="divide-y divide-slate-50 dark:divide-white/5">
                          {group.members.map(m => (
                            <label key={m.id} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/3 transition-colors">
                              <input
                                type="radio"
                                name={`merge-${group.key}`}
                                checked={primaryId === m.id}
                                onChange={() => setMergeSelections(prev => ({ ...prev, [group.key]: m.id }))}
                                className="accent-[#4931F7]"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-[#001F3F] dark:text-white truncate">
                                  {m.email || <span className="text-slate-300">Pas d'email</span>}
                                  {m.telephone && <span className="text-slate-400 font-medium"> · {m.telephone}</span>}
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  {m.consultations?.length || 0} consultation{(m.consultations?.length || 0) !== 1 ? "s" : ""} · créé le {new Date(m.createdAt).toLocaleDateString("fr-FR")}
                                </p>
                              </div>
                              {primaryId === m.id && <span className="text-[10px] font-black text-[#4931F7] uppercase tracking-widest shrink-0">À conserver</span>}
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Nouveau patient */}
      {showNewModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#001F3F]/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#151e32] w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh] sm:h-auto sm:max-h-[90vh] animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
            <div className="p-5 border-b border-gray-100 dark:border-white/5 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-black text-[#001F3F] dark:text-white flex items-center gap-2"><User size={18} className="text-[#4931F7]" /> Créer un dossier</h3>
              <button onClick={() => setShowNewModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-400 hover:bg-red-500 hover:text-white transition-colors"><X size={15} /></button>
            </div>
            {duplicateMatches ? (
              <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertTriangle size={18} className="shrink-0" />
                  <p className="text-sm font-bold">
                    {duplicateMatches.length > 1
                      ? `${duplicateMatches.length} patients portent déjà ce nom et prénom`
                      : "Un patient porte déjà ce nom et prénom"}
                  </p>
                </div>
                <div className="space-y-2">
                  {duplicateMatches.map(p => (
                    <button key={p.id} type="button"
                      onClick={() => { setShowNewModal(false); setDuplicateMatches(null); selectPatient(p); }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-white/10 hover:border-[#4931F7]/40 hover:bg-slate-50 dark:hover:bg-white/5 text-left transition-colors">
                      <PatientAvatar patient={p} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-black dark:text-white truncate">{formatNom(p.nom)} {formatPrenom(p.prenom)}</p>
                        <p className="text-xs text-slate-400 truncate">
                          {p.consultations?.length || 0} consultation{(p.consultations?.length || 0) !== 1 ? "s" : ""}
                          {p.telephone ? ` · ${p.telephone}` : ""}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setDuplicateMatches(null)}
                    className="flex-1 py-3 rounded-xl font-bold text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white transition-colors">
                    Retour
                  </button>
                  <button type="button" onClick={(e) => handleCreate(e, true)} disabled={isSubmitting}
                    className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-[#4931F7] hover:bg-[#3b26c6] shadow-lg shadow-[#4931F7]/30 transition-all flex items-center justify-center gap-2">
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null} Créer quand même
                  </button>
                </div>
              </div>
            ) : (
            <form onSubmit={handleCreate} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <ModalInput label="Prénom *" value={newPatient.prenom} onChange={e => setNewPatient({ ...newPatient, prenom: e.target.value })} required />
                <ModalInput label="Nom *" value={newPatient.nom} onChange={e => setNewPatient({ ...newPatient, nom: e.target.value })} required />
              </div>
              <ModalInput label="Date de naissance" type="date" icon={<Calendar size={15} />} value={newPatient.dateNaissance} onChange={e => setNewPatient({ ...newPatient, dateNaissance: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <ModalInput label="Téléphone" type="tel" icon={<Phone size={15} />} value={newPatient.telephone} onChange={e => setNewPatient({ ...newPatient, telephone: e.target.value })} />
                <ModalInput label="Email" type="email" icon={<Mail size={15} />} value={newPatient.email} onChange={e => setNewPatient({ ...newPatient, email: e.target.value })} />
              </div>
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-white/5">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><MapPin size={13} className="text-[#4931F7]" /> Adresse</p>
                <ModalInput label="Rue" value={newPatient.adresse} onChange={e => setNewPatient({ ...newPatient, adresse: e.target.value })} />
                <div className="grid grid-cols-2 gap-4">
                  <ModalInput label="Code Postal" value={newPatient.codePostal} onChange={e => setNewPatient({ ...newPatient, codePostal: e.target.value })} />
                  <ModalInput label="Ville" value={newPatient.ville} onChange={e => setNewPatient({ ...newPatient, ville: e.target.value })} />
                </div>
              </div>
              <div className="pt-4 pb-6 sm:pb-0 flex gap-3 sticky bottom-0 bg-white dark:bg-[#151e32]">
                <button type="button" onClick={() => setShowNewModal(false)} className="flex-1 py-3 rounded-xl font-bold text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">Annuler</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-[#4931F7] hover:bg-[#3b26c6] shadow-lg shadow-[#4931F7]/30 transition-all flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Enregistrer
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}

      {/* Modifier patient */}
      {showEditModal && editingPatient && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#001F3F]/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#151e32] w-full max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh] sm:h-auto sm:max-h-[90vh] animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300">
            <div className="p-5 border-b border-gray-100 dark:border-white/5 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-black text-[#001F3F] dark:text-white flex items-center gap-2"><Pencil size={18} className="text-[#4931F7]" /> Modifier le dossier</h3>
              <button onClick={() => setShowEditModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-400 hover:bg-red-500 hover:text-white transition-colors"><X size={15} /></button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <ModalInput label="Prénom *" value={editingPatient.prenom || ""} onChange={e => setEditingPatient({ ...editingPatient, prenom: e.target.value })} required />
                <ModalInput label="Nom *" value={editingPatient.nom || ""} onChange={e => setEditingPatient({ ...editingPatient, nom: e.target.value })} required />
              </div>
              <ModalInput label="Date de naissance" type="date" icon={<Calendar size={15} />}
                value={editingPatient.dateNaissance ? new Date(editingPatient.dateNaissance).toISOString().split("T")[0] : ""}
                onChange={e => setEditingPatient({ ...editingPatient, dateNaissance: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <ModalInput label="Téléphone" type="tel" icon={<Phone size={15} />} value={editingPatient.telephone || ""} onChange={e => setEditingPatient({ ...editingPatient, telephone: e.target.value })} />
                <ModalInput label="Email" type="email" icon={<Mail size={15} />} value={editingPatient.email || ""} onChange={e => setEditingPatient({ ...editingPatient, email: e.target.value })} />
              </div>
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-white/5">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><MapPin size={13} className="text-[#4931F7]" /> Adresse</p>
                <ModalInput label="Rue" value={editingPatient.adresse || ""} onChange={e => setEditingPatient({ ...editingPatient, adresse: e.target.value })} />
                <div className="grid grid-cols-2 gap-4">
                  <ModalInput label="Code Postal" value={editingPatient.codePostal || ""} onChange={e => setEditingPatient({ ...editingPatient, codePostal: e.target.value })} />
                  <ModalInput label="Ville" value={editingPatient.ville || ""} onChange={e => setEditingPatient({ ...editingPatient, ville: e.target.value })} />
                </div>
              </div>
              <div className="pt-4 pb-6 sm:pb-0 flex gap-3 sticky bottom-0 bg-white dark:bg-[#151e32]">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-3 rounded-xl font-bold text-sm text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">Annuler</button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-[#4931F7] hover:bg-[#3b26c6] shadow-lg shadow-[#4931F7]/30 transition-all flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supprimer patient */}
      {patientToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#001F3F]/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#151e32] w-full max-w-md rounded-2xl shadow-2xl p-6 sm:p-8 text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-red-100 dark:bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5"><AlertTriangle size={28} /></div>
            <h3 className="text-lg font-black text-[#001F3F] dark:text-white mb-2">Supprimer ce dossier ?</h3>
            <p className="text-sm text-gray-500 mb-7 leading-relaxed">
              Le dossier de <strong className="text-[#001F3F] dark:text-white">{formatPrenom(patientToDelete.prenom)} {formatNom(patientToDelete.nom)}</strong> sera supprimé définitivement, ainsi que tous ses comptes rendus et documents.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setPatientToDelete(null)} className="flex-1 py-3 rounded-xl font-bold text-sm text-gray-500 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 transition-colors">Annuler</button>
              <button onClick={doDeletePatient} disabled={isDeleting} className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-red-500 hover:bg-red-600 transition-all flex items-center justify-center gap-2">
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supprimer consultation */}
      {consultToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#001F3F]/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#151e32] w-full max-w-md rounded-2xl shadow-2xl p-6 sm:p-8 text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-orange-100 dark:bg-orange-500/10 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-5"><AlertTriangle size={28} /></div>
            <h3 className="text-lg font-black text-[#001F3F] dark:text-white mb-2">Supprimer ce compte rendu ?</h3>
            <p className="text-sm text-gray-500 mb-7">
              Consultation du <strong className="text-[#001F3F] dark:text-white">{new Date(consultToDelete.createdAt).toLocaleDateString("fr-FR")}</strong>. Action irréversible.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConsultToDelete(null)} className="flex-1 py-3 rounded-xl font-bold text-sm text-gray-500 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 transition-colors">Annuler</button>
              <button onClick={doDeleteConsult} disabled={isDeleting} className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-orange-500 hover:bg-orange-600 transition-all flex items-center justify-center gap-2">
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supprimer document */}
      {docToDelete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[#001F3F]/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#151e32] w-full max-w-md rounded-2xl shadow-2xl p-6 sm:p-8 text-center animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 bg-red-100 dark:bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5"><AlertTriangle size={28} /></div>
            <h3 className="text-lg font-black text-[#001F3F] dark:text-white mb-2">Supprimer ce document ?</h3>
            <p className="text-sm text-gray-500 mb-7">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setDocToDelete(null)} className="flex-1 py-3 rounded-xl font-bold text-sm text-gray-500 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 transition-colors">Annuler</button>
              <button onClick={doDeleteDoc} disabled={isDeleting} className="flex-1 py-3 rounded-xl font-bold text-sm text-white bg-red-500 hover:bg-red-600 transition-all flex items-center justify-center gap-2">
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal édition facture ────────────────────────────────────────── */}
      {factureEditDoc && (
        <div className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center bg-[#001F3F]/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#151e32] w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5 shrink-0">
              <div>
                <p className="font-black text-[#001F3F] dark:text-white">Modifier la facture</p>
                <p className="text-xs text-slate-400 mt-0.5">{factureEditDoc.date?.toLocaleDateString("fr-FR")}</p>
              </div>
              <button onClick={() => setFactureEditDoc(null)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/10 text-slate-500 hover:bg-slate-200 transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Lignes */}
              {factureEditItems.map((item, idx) => (
                <div key={item._id} className="border border-slate-100 dark:border-white/10 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-white/5">
                    <span className="text-xs font-black text-emerald-600 w-5 shrink-0">{idx + 1}</span>
                    <p className="flex-1 min-w-0 font-bold text-sm text-[#001F3F] dark:text-white truncate">
                      {item.description || <span className="italic text-slate-400">Sans description</span>}
                    </p>
                    <span className="text-xs font-bold text-slate-500 shrink-0">
                      {(parseFloat(item.unitPrice) || 0).toFixed(2)} € × {item.quantity || 1}
                    </span>
                    <button
                      onClick={() => setFactureEditItems(prev => prev.filter((_, i) => i !== idx))}
                      className="text-slate-300 hover:text-red-500 p-1 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="px-4 py-4 grid grid-cols-2 gap-3 bg-white dark:bg-[#0b1121]">
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</label>
                      <input
                        value={item.description || ""}
                        onChange={e => setFactureEditItems(prev => prev.map((it, i) => i === idx ? { ...it, description: e.target.value } : it))}
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-medium text-[#001F3F] dark:text-white outline-none focus:border-[#4931F7]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prix unitaire (€)</label>
                      <input
                        type="number" min="0" step="0.01"
                        value={item.unitPrice || ""}
                        onChange={e => setFactureEditItems(prev => prev.map((it, i) => i === idx ? { ...it, unitPrice: e.target.value } : it))}
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-medium text-[#001F3F] dark:text-white outline-none focus:border-[#4931F7]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantité</label>
                      <input
                        type="number" min="1"
                        value={item.quantity || 1}
                        onChange={e => setFactureEditItems(prev => prev.map((it, i) => i === idx ? { ...it, quantity: e.target.value } : it))}
                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-medium text-[#001F3F] dark:text-white outline-none focus:border-[#4931F7]"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={() => setFactureEditItems(prev => [...prev, { _id: Math.random(), description: "", quantity: 1, unitPrice: "" }])}
                className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-400 hover:border-[#4931F7] hover:text-[#4931F7] transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={15} /> Ajouter une ligne
              </button>

              {/* Total calculé */}
              <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Total</span>
                <span className="text-base font-black text-emerald-700 dark:text-emerald-400">
                  {factureEditItems.reduce((acc, item) => acc + (parseFloat(item.unitPrice) || 0) * (parseInt(item.quantity) || 1), 0).toFixed(2)} €
                </span>
              </div>

              {/* Mode de paiement */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mode de paiement</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "especes", label: "Espèces" },
                    { id: "cb", label: "Carte bancaire" },
                    { id: "cheque", label: "Chèque" },
                    { id: "virement", label: "Virement" },
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setFactureEditMode(v => v === id ? "" : id)}
                      className={`py-2.5 rounded-xl border-2 text-xs font-bold transition-all ${
                        factureEditMode === id
                          ? "border-[#4931F7] bg-[#4931F7]/5 text-[#4931F7]"
                          : "border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-[#4931F7]/30"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-slate-100 dark:border-white/5 shrink-0">
              <button onClick={() => setFactureEditDoc(null)} className="flex-1 py-3 rounded-xl font-bold text-sm text-slate-500 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 transition-colors">Annuler</button>
              <button onClick={handleFactureSave} disabled={factureSaving} className="flex-1 py-3 rounded-xl font-black text-sm text-white bg-[#4931F7] hover:bg-[#3b26c6] transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {factureSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal édition ordonnance ──────────────────────────────────────── */}
      {ordoEditDoc && (
        <div className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center bg-[#001F3F]/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#151e32] w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5 flex-shrink-0">
              <div>
                <p className="font-black text-[#001F3F] dark:text-white">Modifier l'ordonnance</p>
                <p className="text-xs text-slate-400 mt-0.5">{ordoEditDoc.date?.toLocaleDateString("fr-FR")}</p>
              </div>
              <button onClick={() => setOrdoEditDoc(null)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/10 text-slate-500 hover:bg-slate-200 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Liste items */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {ordoEditItems.map((item, idx) => (
                <div key={item.id} className="border border-slate-100 dark:border-white/10 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-white/5">
                    <span className="text-xs font-black text-[#4931F7] w-5 shrink-0">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-[#001F3F] dark:text-white truncate">{item.name || <span className="italic text-slate-400">Sans nom</span>}</p>
                      <p className="text-xs text-slate-400">{item.dosage} {item.form} · {item.qty} {item.unit}</p>
                    </div>
                    <button onClick={() => setOrdoExpandedId(ordoExpandedId === item.id ? null : item.id)} className="text-slate-400 hover:text-[#4931F7] p-1">
                      <ChevronDown size={15} className={`transition-transform ${ordoExpandedId === item.id ? "rotate-180" : ""}`} />
                    </button>
                    <button onClick={() => removeOrdoItem(item.id)} className="text-slate-300 hover:text-red-500 p-1"><X size={14} /></button>
                  </div>
                  {ordoExpandedId === item.id && (
                    <div className="px-4 py-4 grid grid-cols-2 gap-3 bg-white dark:bg-[#0b1121]">
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Médicament</label>
                        <input value={item.name} onChange={e => updateOrdoItem(item.id, "name", e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-medium text-[#001F3F] dark:text-white outline-none focus:border-[#4931F7]" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dosage</label>
                        <input value={item.dosage} onChange={e => updateOrdoItem(item.id, "dosage", e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-medium text-[#001F3F] dark:text-white outline-none focus:border-[#4931F7]" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Forme</label>
                        <input value={item.form} onChange={e => updateOrdoItem(item.id, "form", e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-medium text-[#001F3F] dark:text-white outline-none focus:border-[#4931F7]" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantité</label>
                        <input type="number" min="1" value={item.qty} onChange={e => updateOrdoItem(item.id, "qty", e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-medium text-[#001F3F] dark:text-white outline-none focus:border-[#4931F7]" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unité</label>
                        <input value={item.unit} onChange={e => updateOrdoItem(item.id, "unit", e.target.value)} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-medium text-[#001F3F] dark:text-white outline-none focus:border-[#4931F7]" />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Posologie / Instructions</label>
                        <textarea value={item.instructions} onChange={e => updateOrdoItem(item.id, "instructions", e.target.value)} rows={2} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm font-medium text-[#001F3F] dark:text-white outline-none focus:border-[#4931F7] resize-none" />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <button onClick={addOrdoItem} className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-400 hover:border-[#4931F7] hover:text-[#4931F7] transition-colors flex items-center justify-center gap-2">
                <Plus size={15} /> Ajouter un médicament
              </button>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-slate-100 dark:border-white/5 flex-shrink-0">
              <button onClick={() => setOrdoEditDoc(null)} className="flex-1 py-3 rounded-xl font-bold text-sm text-slate-500 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 transition-colors">Annuler</button>
              <button onClick={handleOrdoSave} disabled={ordoSaving} className="flex-1 py-3 rounded-xl font-black text-sm text-white bg-[#4931F7] hover:bg-[#3b26c6] transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {ordoSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
      <PhotoLightbox photos={lastConsult?.photos} index={lightboxIdx} onClose={() => setLightboxIdx(null)} onNav={setLightboxIdx} />
    </div>
    </div>
  );
}
