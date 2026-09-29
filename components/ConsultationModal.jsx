"use client";

import { useState, useEffect } from "react";
import {
  X, Edit3, Check, Loader2, Download, User, Phone, Mail,
  MapPin, FileText, Receipt, CheckCircle, AlertCircle, Cake,
  Camera, ChevronLeft, ChevronRight
} from "lucide-react";
import { PDFDownloadLink, pdf } from "@react-pdf/renderer";
import { MedicalReportPDF } from "@/components/MedicalReportPDF";
import { InvoicePDF } from "@/components/InvoicePDF";

const SECTION_LABELS = {
  motif_consultation: "Motif de consultation",
  anamnese: "Anamnèse",
  examen_clinique: "Examen clinique",
  diagnostic: "Diagnostic",
  traitement: "Traitement",
};

function renderValue(val) {
  if (val === null || val === undefined) return "Non précisé";
  if (Array.isArray(val)) return val.join(" — ");
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
}

// ——— Galerie photos (lecture seule + lightbox) ———
function PhotoGallery({ photos }) {
  const [lightboxIdx, setLightboxIdx] = useState(null);
  if (!photos?.length) return null;

  return (
    <>
      <div className="pt-4 mt-2 border-t border-slate-100 dark:border-white/5">
        <p className="text-[9px] font-black text-[#4931F7] uppercase tracking-widest flex items-center gap-1.5 mb-3">
          <Camera size={11} /> Photos ({photos.length})
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {photos.map((src, i) => (
            <button key={i} onClick={() => setLightboxIdx(i)}
              className="aspect-square rounded-xl overflow-hidden border border-slate-100 dark:border-white/10 hover:border-[#4931F7]/40 transition-colors cursor-zoom-in">
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      {lightboxIdx !== null && (
        <div className="fixed inset-0 z-[400] bg-black/92 flex items-center justify-center p-4"
          onClick={() => setLightboxIdx(null)}>
          <img src={photos[lightboxIdx]} alt="" className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl" />
          <button onClick={() => setLightboxIdx(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
            <X size={18} />
          </button>
          {lightboxIdx > 0 && (
            <button onClick={(e) => { e.stopPropagation(); setLightboxIdx(i => i - 1); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
              <ChevronLeft size={22} />
            </button>
          )}
          {lightboxIdx < photos.length - 1 && (
            <button onClick={(e) => { e.stopPropagation(); setLightboxIdx(i => i + 1); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
              <ChevronRight size={22} />
            </button>
          )}
        </div>
      )}
    </>
  );
}

// ——— Onglet Compte Rendu ———
function TabCR({ consultation }) {
  const [reportData, setReportData] = useState(consultation.reportData || {});
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedKey, setSavedKey] = useState(null);

  // Pedicurie: transcription dictée à la place du CR
  const isPedicurie = consultation.typeConsultation === "pedicurie" || consultation.motif === "Soin de Pédicurie";
  const [transcription, setTranscription] = useState(consultation.transcription || "");
  const [editingTranscription, setEditingTranscription] = useState(false);
  const [transcriptionDraft, setTranscriptionDraft] = useState("");
  const [savingTranscription, setSavingTranscription] = useState(false);
  const [savedTranscription, setSavedTranscription] = useState(false);

  const saveTranscription = async () => {
    setSavingTranscription(true);
    try {
      await fetch(`/api/consultations/${consultation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcription: transcriptionDraft }),
      });
      setTranscription(transcriptionDraft);
      setSavedTranscription(true);
      setTimeout(() => setSavedTranscription(false), 2000);
    } catch {}
    setEditingTranscription(false);
    setSavingTranscription(false);
  };

  const handleEdit = (key) => {
    setEditingKey(key);
    setEditValue(typeof reportData[key] === "object" ? JSON.stringify(reportData[key], null, 2) : String(reportData[key] ?? ""));
  };

  const handleSave = async (key) => {
    setIsSaving(true);
    const updated = { ...reportData, [key]: editValue };
    try {
      await fetch(`/api/consultations/${consultation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportData: updated }),
      });
      setReportData(updated);
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 2000);
    } catch {}
    setEditingKey(null);
    setIsSaving(false);
  };

  const hasReport = Object.keys(reportData).length > 0;
  const photos = Array.isArray(consultation.photos) ? consultation.photos : [];

  // Bloc pédicurie : afficher la dictée
  if (isPedicurie) {
    return (
      <div className="space-y-3">
        <div className="bg-slate-50 dark:bg-[#0b1121] p-4 rounded-2xl border border-slate-100 dark:border-white/5 group relative">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] font-black text-[#4931F7] uppercase tracking-widest">Dictée vocale</p>
            {!editingTranscription && (
              <button
                onClick={() => { setTranscriptionDraft(transcription); setEditingTranscription(true); }}
                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-[#4931F7] transition-all p-1 rounded-lg hover:bg-[#4931F7]/10"
              >
                <Edit3 size={14} />
              </button>
            )}
          </div>
          {editingTranscription ? (
            <div className="space-y-2">
              <textarea
                autoFocus
                value={transcriptionDraft}
                onChange={(e) => setTranscriptionDraft(e.target.value)}
                className="w-full text-sm p-3 border-2 border-[#4931F7]/30 rounded-xl focus:border-[#4931F7] outline-none resize-none min-h-[120px] dark:bg-[#151e32] dark:text-white"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditingTranscription(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                  Annuler
                </button>
                <button onClick={saveTranscription} disabled={savingTranscription} className="px-3 py-1.5 text-xs font-bold bg-[#4931F7] text-white rounded-lg hover:bg-[#3b26c6] flex items-center gap-1 disabled:opacity-50">
                  {savingTranscription ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Enregistrer
                </button>
              </div>
            </div>
          ) : transcription ? (
            <div className="flex items-start gap-2">
              <p className="text-sm text-[#001F3F] dark:text-white font-medium leading-relaxed flex-1 whitespace-pre-wrap">{transcription}</p>
              {savedTranscription && <CheckCircle size={14} className="text-green-500 shrink-0 mt-0.5" />}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">Aucune dictée enregistrée.</p>
          )}
        </div>
        {consultation.notes?.trim() && (
          <div className="bg-slate-50 dark:bg-[#0b1121] p-4 rounded-2xl border border-slate-100 dark:border-white/5">
            <p className="text-[9px] font-black text-[#4931F7] uppercase tracking-widest mb-2">Notes</p>
            <p className="text-sm text-[#001F3F] dark:text-white font-medium leading-relaxed whitespace-pre-wrap">{consultation.notes}</p>
          </div>
        )}
        <PhotoGallery photos={photos} />
      </div>
    );
  }

  if (!hasReport && !photos.length && !consultation.notes?.trim()) {
    return <p className="text-sm text-slate-400 italic py-8 text-center">Aucune donnée de compte rendu.</p>;
  }

  return (
    <div className="space-y-3">
      {Object.entries(reportData).map(([key, value]) => {
        const isEditing = editingKey === key;
        const label = SECTION_LABELS[key] || key.replace(/_/g, " ");
        return (
          <div key={key} className="bg-slate-50 dark:bg-[#0b1121] p-4 rounded-2xl border border-slate-100 dark:border-white/5 group relative">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[9px] font-black text-[#4931F7] uppercase tracking-widest">{label}</p>
              {!isEditing && (
                <button
                  onClick={() => handleEdit(key)}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-[#4931F7] transition-all p-1 rounded-lg hover:bg-[#4931F7]/10"
                >
                  <Edit3 size={14} />
                </button>
              )}
            </div>
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full text-sm p-3 border-2 border-[#4931F7]/30 rounded-xl focus:border-[#4931F7] outline-none resize-none min-h-[100px] dark:bg-[#151e32] dark:text-white"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditingKey(null)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                    Annuler
                  </button>
                  <button onClick={() => handleSave(key)} disabled={isSaving} className="px-3 py-1.5 text-xs font-bold bg-[#4931F7] text-white rounded-lg hover:bg-[#3b26c6] flex items-center gap-1 disabled:opacity-50">
                    {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Enregistrer
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <p className="text-sm text-[#001F3F] dark:text-white font-medium leading-relaxed flex-1">{renderValue(value)}</p>
                {savedKey === key && <CheckCircle size={14} className="text-green-500 shrink-0 mt-0.5" />}
              </div>
            )}
          </div>
        );
      })}

      {consultation.notes?.trim() && (
        <div className="bg-slate-50 dark:bg-[#0b1121] p-4 rounded-2xl border border-slate-100 dark:border-white/5">
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Notes</p>
          <p className="text-sm text-[#001F3F] dark:text-white font-medium leading-relaxed whitespace-pre-wrap">{consultation.notes}</p>
        </div>
      )}
      <PhotoGallery photos={photos} />
    </div>
  );
}

// ——— Onglet Patient ———
function TabPatient({ patient }) {
  if (!patient) return <p className="text-sm text-slate-400 italic py-8 text-center">Aucune info patient.</p>;

  const fields = [
    { icon: <User size={15} />, label: "Nom complet", value: `${patient.prenom || ""} ${patient.nom || ""}`.trim() },
    { icon: <Mail size={15} />, label: "Email", value: patient.email },
    { icon: <Phone size={15} />, label: "Téléphone", value: patient.telephone },
    { icon: <Cake size={15} />, label: "Date de naissance", value: patient.dateNaissance ? new Date(patient.dateNaissance).toLocaleDateString("fr-FR") : null },
    { icon: <MapPin size={15} />, label: "Adresse", value: [patient.adresse, patient.codePostal, patient.ville, patient.pays].filter(Boolean).join(", ") || null },
  ];

  return (
    <div className="space-y-3">
      {fields.map(({ icon, label, value }) =>
        value ? (
          <div key={label} className="flex items-start gap-3 p-4 bg-slate-50 dark:bg-[#0b1121] rounded-2xl border border-slate-100 dark:border-white/5">
            <div className="w-8 h-8 rounded-xl bg-[#4931F7]/10 text-[#4931F7] flex items-center justify-center shrink-0">{icon}</div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
              <p className="text-sm font-bold text-[#001F3F] dark:text-white">{value}</p>
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}

// ——— Onglet Documents ———
function TabDocuments({ consultation }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const patient = consultation.patient || {};
  const branding = consultation.praticien || {};
  const devisData = typeof consultation.devisData === "string" ? JSON.parse(consultation.devisData) : consultation.devisData;
  const ordonnanceData = consultation.ordonnanceData;

  const handlePrintFacture = async () => {
    if (!devisData?.items?.length) return;
    const win = window.open('', '_blank');
    setIsGenerating(true);
    try {
      const blob = await pdf(
        <InvoicePDF data={devisData} patient={patient} signature={consultation.signatureFacture || null} type="facture" branding={branding} />
      ).toBlob();
      if (win) win.location.href = URL.createObjectURL(blob);
    } catch { if (win) win.close(); }
    setIsGenerating(false);
  };

  const hasFacture = devisData?.items?.length > 0;
  const hasOrdonnance = ordonnanceData?.items?.length > 0 || ordonnanceData?.contenu;

  if (!hasFacture && !hasOrdonnance) {
    return <p className="text-sm text-slate-400 italic py-8 text-center">Aucun document pour cette consultation.</p>;
  }

  return (
    <div className="space-y-5">
      {/* Facture */}
      {hasFacture && (
        <div className="bg-blue-50/50 dark:bg-blue-500/5 p-5 rounded-2xl border border-blue-100 dark:border-blue-500/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Receipt size={16} className="text-[#4931F7]" />
              <h4 className="text-sm font-black text-[#001F3F] dark:text-white uppercase tracking-wide">Facture / Devis</h4>
            </div>
            <div className="flex items-center gap-2">
              {devisData.status === "SIGNED" || consultation.signatureFacture ? (
                <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                  <CheckCircle size={11} /> Signé
                </span>
              ) : (
                <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-1 rounded-lg">En attente</span>
              )}
              <button
                onClick={handlePrintFacture}
                disabled={isGenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4931F7] text-white rounded-xl text-xs font-bold hover:bg-[#3b26c6] transition-colors disabled:opacity-50"
              >
                {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} PDF
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            {devisData.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-300 font-medium">{item.quantity}x {item.description}</span>
                <span className="font-bold text-[#001F3F] dark:text-white">{item.unitPrice} €</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-black pt-2 border-t border-blue-100 dark:border-blue-500/20 mt-2">
              <span className="text-[#001F3F] dark:text-white">Total</span>
              <span className="text-[#4931F7]">{devisData.totalAmount}</span>
            </div>
          </div>
          {consultation.signatureFacture && consultation.signatureFacture !== "SIGNATURE_PAPIER_MANUELLE" && (
            <div className="mt-3 pt-3 border-t border-blue-100 dark:border-blue-500/20">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Signature</p>
              <img src={consultation.signatureFacture} alt="Signature" className="h-10 bg-white rounded-lg p-1" />
            </div>
          )}
        </div>
      )}

      {/* Ordonnance */}
      {hasOrdonnance && (
        <div className="bg-green-50/50 dark:bg-green-500/5 p-5 rounded-2xl border border-green-100 dark:border-green-500/20">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={16} className="text-green-600" />
            <h4 className="text-sm font-black text-[#001F3F] dark:text-white uppercase tracking-wide">Ordonnance</h4>
          </div>
          {ordonnanceData.items?.length > 0 ? (
            <div className="space-y-2">
              {ordonnanceData.items.map((item, i) => (
                <div key={i} className="bg-white dark:bg-[#0b1121] rounded-xl p-3 text-sm">
                  <p className="font-bold text-[#001F3F] dark:text-white">{item.name} {item.dosage}</p>
                  <p className="text-slate-500 text-xs">{item.form} — {item.qty} {item.unit}</p>
                  {item.instructions && <p className="text-slate-400 text-xs mt-0.5 italic">{item.instructions}</p>}
                </div>
              ))}
            </div>
          ) : ordonnanceData.contenu ? (
            <p className="text-sm text-[#001F3F] dark:text-white font-medium whitespace-pre-line">{ordonnanceData.contenu}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ——— Modal principale ———
export default function ConsultationModal({ consultationId, onClose }) {
  const [consultation, setConsultation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("cr");

  useEffect(() => {
    if (!consultationId) return;
    setConsultation(null);
    setIsLoading(true);
    setError(null);
    const load = async () => {
      try {
        const res = await fetch(`/api/consultations/${consultationId}`);
        if (!res.ok) throw new Error("Introuvable");
        const data = await res.json();
        setConsultation(data);
      } catch {
        setError("Impossible de charger la consultation.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [consultationId]);

  if (!consultationId) return null;
  const patient = consultation?.patient;
  const isPedicurie = consultation?.typeConsultation === "pedicurie" || consultation?.motif === "Soin de Pédicurie";
  const tabs = [
    { id: "cr", label: isPedicurie ? "Dictée" : "Compte Rendu", icon: <FileText size={14} /> },
    { id: "patient", label: "Patient", icon: <User size={14} /> },
    { id: "documents", label: "Documents", icon: <Receipt size={14} /> },
  ];

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-24 px-4 pb-4 bg-[#001F3F]/60 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#151e32] w-full max-w-5xl max-h-[calc(100vh-7rem)] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            {patient ? (
              <div className="w-12 h-12 rounded-2xl bg-[#4931F7] text-white flex items-center justify-center text-lg font-black shrink-0">
                {patient.prenom?.charAt(0)}{patient.nom?.charAt(0)}
              </div>
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/10 animate-pulse" />
            )}
            <div>
              <h3 className="text-lg font-black text-[#001F3F] dark:text-white">
                {patient ? `${patient.prenom} ${patient.nom}` : "Chargement..."}
              </h3>
              {consultation && (
                <p className="text-xs text-[#4931F7] font-bold uppercase tracking-widest">
                  {new Date(consultation.createdAt).toLocaleDateString("fr-FR", {
                    day: "numeric", month: "long", year: "numeric",
                    timeZone: "Europe/Paris",
                  })}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {consultation?.reportData && (
              <PDFDownloadLink
                document={<MedicalReportPDF data={consultation.reportData} branding={consultation.praticien || {}} photos={Array.isArray(consultation.photos) ? consultation.photos : []} date={consultation.createdAt} />}
                fileName={`CR_${patient?.nom}_${new Date(consultation.createdAt).toLocaleDateString("fr-FR")}.pdf`}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#4931F7]/10 text-[#4931F7] rounded-xl text-xs font-bold hover:bg-[#4931F7]/20 transition-colors"
              >
                {({ loading }) => loading ? <Loader2 size={13} className="animate-spin" /> : <><Download size={13} /> CR PDF</>}
              </PDFDownloadLink>
            )}
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/10 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === tab.id
                  ? "bg-[#4931F7] text-white shadow-lg shadow-[#4931F7]/20"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="text-[#4931F7] animate-spin" />
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 text-red-500 bg-red-50 px-4 py-3 rounded-2xl text-sm font-bold">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          {consultation && activeTab === "cr" && <TabCR consultation={consultation} />}
          {consultation && activeTab === "patient" && <TabPatient patient={consultation.patient} />}
          {consultation && activeTab === "documents" && <TabDocuments consultation={consultation} />}
        </div>
      </div>
    </div>
  );
}
