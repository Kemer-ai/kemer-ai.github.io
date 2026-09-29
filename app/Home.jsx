"use client";
import { useState, useRef, useEffect, useMemo } from "react";

import {
  Mic, Square, Pause, Play, Mail, FileText, ChevronRight, ChevronLeft, ChevronDown,
  Loader2, AlertCircle, Search, X, FileSignature, Download, ArrowLeft,
  Smartphone, CheckCircle, Clock, Stethoscope, Footprints, Scissors,
  Printer, Camera, ClipboardPaste, User,
  Edit3, Check, UserPlus, QrCode, Pencil, Trash2, Plus, Receipt,
  CreditCard, Banknote, PenLine, RotateCcw, Upload, BrainCircuit, RefreshCw
} from "lucide-react";
import { PDFDownloadLink, pdf } from "@react-pdf/renderer";
import { useCustomModal } from "@/components/ModalProvider";
import { blobCrPatient } from "@/lib/crPatientPdf";
import { InvoicePDF } from "@/components/InvoicePDF";
import OrdonnanceBlock from "@/components/OrdonnanceBlock";
import ConsultationModal from "@/components/ConsultationModal";
import EmailButton from "@/components/EmailButton";
import { useRouter, useSearchParams } from "next/navigation";
import { savePendingAudio, getAllPendingAudios, deletePendingAudioByKey } from "@/lib/audioStore";
import ConnectionQuality from "@/components/ConnectionQuality";
import dynamic from "next/dynamic";
import { detectZones, detectSide, extractConsultationText } from "@/lib/footZones";
import { formatPrenom, formatNom } from "@/lib/formatName";

const FootViewer3D = dynamic(() => import("@/components/FootViewer3D"), { ssr: false });

// Désactivé temporairement — boucle de rendu WebGL continue non throttlée,
// cause probable des erreurs "Context Lost" observées en prod.
const FOOT_VIEWER_3D_ENABLED = false;

// Certains navigateurs (Safari notamment) renvoient un MediaRecorder.mimeType
// avec des guillemets autour du paramètre codecs (ex. audio/mp4;codecs="mp4a.40.2").
// Cette valeur est ensuite réutilisée telle quelle comme en-tête Content-Type
// dans les fetch() d'upload (voir processAudio) — Safari rejette alors sa
// propre requête avec "TypeError: The string did not match the expected
// pattern." (observé en prod, uniquement sur ce navigateur). On retire les
// guillemets pour rester une valeur d'en-tête HTTP valide dans tous les cas.
function sanitizeMimeType(mime) {
  const cleaned = (mime || "").replace(/"/g, "").trim();
  return cleaned || "audio/webm";
}

// --- UTILITAIRE : pré-charge les images GCS en base64 pour @react-pdf/renderer ---
// Passe par /api/image-proxy pour éviter les blocages CORS sur les URLs GCS.
async function resolveImages(branding) {
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
        } catch {
          // En cas d'erreur réseau, on garde l'URL originale
        }
      }
    })
  );
  return result;
}

// --- HEADER ---
export function WelcomeHeader({ user }) {
  const cabinetNom = user?.cabinet?.nom;
  return (
    <div className="w-full max-w-5xl mb-8 text-center animate-in fade-in duration-300 mt-8">
      {cabinetNom && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-3 rounded-full bg-[#4931F7]/8 dark:bg-[#4931F7]/15 border border-[#4931F7]/15 dark:border-[#4931F7]/25">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#4931F7] dark:text-[#4ECDC4]"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          <span className="text-xs font-black text-[#4931F7] dark:text-[#4ECDC4] tracking-wide">{cabinetNom}</span>
        </div>
      )}
      <h1 className="text-4xl md:text-5xl font-extrabold text-[#001F3F] dark:text-white leading-tight tracking-tight">
        Bonjour, <span className="text-[#4ECDC4]">{user?.prenom || "Praticien"}</span>
      </h1>
      <p className="text-lg text-slate-500 dark:text-gray-400 mt-2">Prêt à attaquer vos consultations du bon pied ? 🦶🏽</p>
    </div>
  );
}

// --- MODAL PAIEMENT CONSULTATION NON FACTURÉE ---
const MODES_PAIEMENT = [
  { id: "especes",  label: "Espèces",       Icon: Banknote },
  { id: "cb",       label: "Carte bancaire", Icon: CreditCard },
  { id: "cheque",   label: "Chèque",         Icon: PenLine },
  { id: "virement", label: "Virement",       Icon: Receipt },
];

function PaymentMethodSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = MODES_PAIEMENT.find(o => o.id === value);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border text-sm font-bold transition-colors bg-slate-50 dark:bg-white/5 ${
          value ? "border-[#4931F7] text-[#001F3F] dark:text-white" : "border-slate-200 dark:border-white/10 text-slate-400"
        }`}
      >
        <span className="flex items-center gap-2">
          {selected ? <><selected.Icon size={14} />{selected.label}</> : "Mode de paiement"}
        </span>
        <ChevronDown size={14} className={`transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-20 w-full mt-1 bg-white dark:bg-[#1a2540] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden">
          {MODES_PAIEMENT.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onMouseDown={() => { onChange(id); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/5 ${
                value === id ? "text-[#4931F7]" : "text-[#001F3F] dark:text-white"
              }`}
            >
              <Icon size={14} className="shrink-0" />{label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PaymentModal({ show, patientName, onConfirm, onSkip }) {
  const [montant, setMontant] = useState("");
  const [modePaiement, setModePaiement] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (show) { setMontant(""); setModePaiement(""); }
  }, [show]);

  if (!show) return null;

  const canSubmit = modePaiement && montant && !isNaN(parseFloat(montant)) && parseFloat(montant) > 0;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    await onConfirm({ montant: parseFloat(montant), modePaiement });
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#151e32] rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100 dark:border-white/10 animate-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
            <Receipt size={18} className="text-amber-500" />
          </div>
          <div>
            <h2 className="text-sm font-black text-[#001F3F] dark:text-white">Consultation non facturée</h2>
            {patientName && <p className="text-xs text-slate-400 font-medium">{patientName}</p>}
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Aucune facture générée pour cette consultation. Souhaitez-vous enregistrer le paiement reçu ?
        </p>

        <div className="relative mb-3">
          <input
            type="number"
            min="0"
            step="0.50"
            placeholder="Montant reçu"
            value={montant}
            onChange={e => setMontant(e.target.value)}
            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 pr-10 text-sm font-black text-[#001F3F] dark:text-white focus:outline-none focus:border-[#4931F7] transition-colors"
          />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">€</span>
        </div>

        <div className="mb-4">
          <PaymentMethodSelect value={modePaiement} onChange={setModePaiement} />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onSkip}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
          >
            Passer
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canSubmit || isSubmitting}
            className="flex-1 py-2.5 rounded-xl bg-[#4931F7] text-white text-xs font-black hover:bg-[#3b26c6] transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

// --- BLOC SÉLECTION PATIENT ---
export function PatientSelector({ patients, selectedPatient, onPatientChange, searchTerm, setSearchTerm, disabled, setShowNewPatientModal }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const filteredPatients = patients?.filter(p => `${p.nom} ${p.prenom}`.toLowerCase().includes(searchTerm.toLowerCase()) || `${p.prenom} ${p.nom}`.toLowerCase().includes(searchTerm.toLowerCase()) || (p.telephone && p.telephone.includes(searchTerm))) || [];
  const selectedPatientObj = patients?.find(p => String(p.id) === String(selectedPatient));
  const isSelected = !!selectedPatient && !!selectedPatientObj;

  return (
    <div className="w-full max-w-5xl mb-6 relative z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col items-center w-full">
        <div className="w-full relative">

          {/* ── Patient sélectionné : carte proéminente ── */}
          {isSelected ? (
            <div className="flex items-center gap-4 bg-[#4931F7] rounded-3xl px-5 py-4 shadow-xl shadow-[#4931F7]/20 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-11 h-11 rounded-2xl bg-white/20 text-white flex items-center justify-center font-black text-base shrink-0">
                {selectedPatientObj.prenom?.charAt(0).toUpperCase()}{selectedPatientObj.nom?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-white/60 uppercase tracking-widest">Patient sélectionné</p>
                <p className="text-lg font-black text-white truncate">
                  {formatPrenom(selectedPatientObj.prenom)} <span className="uppercase">{selectedPatientObj.nom}</span>
                </p>
              </div>
              <button
                onClick={() => { onPatientChange?.(""); setSearchTerm(""); }}
                disabled={disabled}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/15 text-white hover:bg-white/25 transition-colors disabled:opacity-50"
                title="Changer de patient"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            /* ── Aucun patient : input avec signal d'alerte ── */
            <div>
              <div className="relative flex items-center">
                <Search className="absolute left-4 text-amber-400 pointer-events-none z-10" size={18} />
                <input
                  type="text" placeholder="Rechercher un patient…" value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)} onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  disabled={disabled}
                  className="w-full bg-white dark:bg-[#0b1121] border-2 border-amber-300 dark:border-amber-400/50 rounded-4xl px-4 py-3.5 pl-11 pr-44 text-sm font-bold text-[#001F3F] dark:text-white focus:outline-none focus:border-amber-400 transition-colors disabled:opacity-50 shadow-sm shadow-amber-100 dark:shadow-amber-400/10"
                />
                <button
                  onMouseDown={(e) => { e.preventDefault(); setShowNewPatientModal(true); }}
                  disabled={disabled}
                  className="absolute right-2 flex items-center gap-1.5 px-4 py-2 bg-[#4931F7] text-white rounded-3xl text-xs font-extrabold hover:bg-[#3b26c6] transition-colors disabled:opacity-50 shrink-0"
                >
                  <UserPlus size={14} /> Nouveau patient
                </button>
              </div>
              {!showDropdown && (
                <p className="text-xs text-amber-500 dark:text-amber-400 font-bold text-center mt-2.5">
                  Sélectionnez un patient avant de commencer
                </p>
              )}
            </div>
          )}

          {showDropdown && !isSelected && (
            <div className="absolute w-full mt-2 bg-white dark:bg-[#151e32] border border-slate-200 dark:border-white/10 rounded-4xl shadow-2xl max-h-60 overflow-y-auto z-50 custom-scrollbar">
              {filteredPatients.length > 0 ? filteredPatients.map(p => (
                <div key={p.id} onMouseDown={() => { onPatientChange?.(String(p.id)); setSearchTerm(`${p.prenom} ${p.nom}`); setShowDropdown(false); }} className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-[#0b1121] cursor-pointer text-sm font-bold text-[#001F3F] dark:text-white transition-colors border-b border-slate-100 dark:border-white/5 last:border-0 text-left flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#4931F7]/10 text-[#4931F7] flex items-center justify-center text-xs">{p.prenom?.charAt(0).toUpperCase()}{p.nom?.charAt(0).toUpperCase()}</div>
                  <div>{formatPrenom(p.prenom)} <span className="uppercase">{p.nom}</span></div>
                </div>
              )) : <div className="px-4 py-6 text-sm font-medium text-slate-400 italic text-center">Aucun patient trouvé.</div>}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// --- BLOC ENREGISTREMENT ---
const MIC_QUALITY = {
  mauvais: { label: 'Mauvais', hint: 'Signal insuffisant — vérifiez le micro', dot: 'bg-red-500', text: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20' },
  moyen:   { label: 'Moyen',   hint: 'Signal faible — rapprochez-vous',         dot: 'bg-amber-400', text: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20' },
  bon:     { label: 'Bon',     hint: 'Qualité correcte',                         dot: 'bg-emerald-500', text: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20' },
};

// --- VUE CONSULTATION EN DIRECT ---
export function LiveConsultationView({
  patientName, isRecording, isPaused, recordingTime, formatTime,
  liveTranscript, interimTranscript, liveReport,
  isGeneratingLiveCR, isFinalizingLive, isFinalized,
  assistantQuestions, isLoadingAssistant,
  canvasRef, speechApiActive,
  onStop, onPause, onResume, onGenerateNow, onViewDossier, renderValue,
  assistantEnabled,
  liveText,
}) {
  const transcriptRef = useRef(null);
  const [dismissedIdxs, setDismissedIdxs] = useState(new Set());

  const liveDetectedZones = useMemo(() => detectZones(liveText || ""), [liveText]);
  const liveDetectedSide = useMemo(() => detectSide(liveText || ""), [liveText]);

  // Reset dismissed questions when new suggestions arrive
  useEffect(() => { setDismissedIdxs(new Set()); }, [assistantQuestions]);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [liveTranscript, interimTranscript]);

  const crEntries = liveReport ? Object.entries(liveReport).filter(([, v]) => v) : [];
  const visibleQuestions = assistantQuestions.filter((_, i) => !dismissedIdxs.has(i));

  return (
    <div className="w-full max-w-[1400px] animate-in fade-in duration-300 flex flex-col gap-3">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isFinalized ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 rounded-full">
              <CheckCircle size={12} className="text-emerald-500" />
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Terminée</span>
            </div>
          ) : isFinalizingLive ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4931F7]/10 rounded-full">
              <Loader2 size={12} className="text-[#4931F7] animate-spin" />
              <span className="text-xs font-black text-[#4931F7] uppercase tracking-widest">Finalisation…</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 rounded-full">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-black text-red-500 uppercase tracking-widest">En direct</span>
            </div>
          )}
          {patientName && <span className="text-base font-black text-slate-700 dark:text-slate-200">{patientName}</span>}
          {isRecording && (
            <canvas ref={canvasRef} width={120} height={32} className="w-30 h-8" />
          )}
          {!isFinalized && <span className="text-sm font-mono font-bold text-slate-400">{formatTime(recordingTime)}</span>}
        </div>
        {isFinalized ? (
          <button onClick={onViewDossier} className="flex items-center gap-2 px-5 py-2.5 bg-[#4931F7] hover:bg-[#3b26c6] text-white rounded-full text-sm font-black transition-colors shadow-lg shadow-[#4931F7]/25">
            Voir le dossier <ChevronRight size={15} />
          </button>
        ) : isFinalizingLive ? (
          <button disabled className="flex items-center gap-2 px-5 py-2.5 bg-[#4931F7]/60 text-white rounded-full text-sm font-black cursor-not-allowed">
            <Loader2 size={13} className="animate-spin" /> Finalisation…
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {isRecording && (
              <button
                onClick={isPaused ? onResume : onPause}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-600 dark:text-slate-300 rounded-full text-sm font-black transition-colors"
              >
                {isPaused
                  ? <><Play size={13} className="fill-current" /> Reprendre</>
                  : <><Pause size={13} className="fill-current" /> Pause</>}
              </button>
            )}
            <button
              onClick={onStop}
              title="Terminer"
              className="w-11 h-11 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 transition-colors shadow-lg shadow-red-500/30"
            >
              <Square size={16} fill="white" strokeWidth={0} />
            </button>
          </div>
        )}
      </div>


      {/* ── Corps : colonne gauche (transcript + CR) + colonne droite (pied 3D + assistant) ── */}
      <div className="grid gap-4 items-start grid-cols-1 lg:grid-cols-[3fr_2fr]">

        {/* Colonne gauche */}
        <div className="flex flex-col gap-3 min-w-0">

          {/* Transcription — bande compacte */}
          <div className="bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/8 rounded-2xl px-4 pt-3 pb-2 flex flex-col" style={{ height: 110 }}>
            <div className="flex items-center gap-1.5 mb-1.5 shrink-0">
              <Mic size={11} className={isRecording ? "text-red-500" : "text-slate-400"} />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Transcription</span>
              {isRecording && (
                <div
                  title={speechApiActive ? "Micro actif" : "Reconnexion micro…"}
                  className={`w-1.5 h-1.5 rounded-full ml-1 transition-colors ${speechApiActive ? "bg-emerald-500" : "bg-amber-400 animate-pulse"}`}
                />
              )}
            </div>
            <div ref={transcriptRef} className="flex-1 overflow-y-auto text-xs text-slate-600 dark:text-slate-400 leading-relaxed pr-1">
              {liveTranscript || interimTranscript ? (
                <span>
                  {liveTranscript}
                  {interimTranscript && isRecording && (
                    <span className="text-slate-400/60 dark:text-slate-600"> {interimTranscript}</span>
                  )}
                </span>
              ) : (
                <span className="text-slate-400/60 italic">En attente de parole…</span>
              )}
            </div>
          </div>

          {/* Compte rendu */}
          <div className="bg-white dark:bg-[#151e32] border border-slate-200 dark:border-white/8 rounded-2xl p-5 flex flex-col" style={{ minHeight: 380 }}>
            <div className="flex items-center justify-between mb-4 shrink-0 border-b border-slate-100 dark:border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Compte Rendu Médical</span>
                {(isGeneratingLiveCR || isFinalizingLive) && (
                  <Loader2 size={11} className="text-[#4931F7] animate-spin" />
                )}
              </div>
              {!isFinalizingLive && !isFinalized && (
                <button onClick={onGenerateNow} disabled={isGeneratingLiveCR || !liveTranscript}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black text-[#4ECDC4] bg-[#4ECDC4]/10 hover:bg-[#4ECDC4]/20 rounded-lg transition-colors disabled:opacity-40">
                  <RefreshCw size={10} className={isGeneratingLiveCR ? "animate-spin" : ""} />
                  Actualiser
                </button>
              )}
            </div>

            <div className={`space-y-3 overflow-y-auto pr-1 flex-1 ${isFinalizingLive ? "opacity-50" : ""}`}>
              {isFinalizingLive && crEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 py-12">
                  <Loader2 size={28} className="animate-spin text-[#4931F7]" />
                  <p className="text-sm text-slate-400 font-medium">Génération du compte rendu final…</p>
                </div>
              ) : crEntries.length > 0 ? (
                crEntries.map(([key, value]) => (
                  <div key={key} className="p-5 rounded-2xl border bg-slate-50 dark:bg-[#0b1121] border-slate-100 dark:border-white/5">
                    <div className="flex items-center mb-3 border-b border-[#4931F7]/10 pb-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#4931F7]">{key.replace(/_/g, " ")}</p>
                    </div>
                    <div className="text-sm text-[#001F3F] dark:text-white font-medium">{renderValue(value)}</div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400 py-12">
                  <BrainCircuit size={28} className="opacity-25" />
                  <p className="text-xs text-center">Le compte rendu se construira<br />au fil de la consultation</p>
                </div>
              )}
            </div>

            {isFinalizingLive && crEntries.length > 0 && (
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-400 shrink-0 pt-3 border-t border-slate-100 dark:border-white/5">
                <Loader2 size={12} className="animate-spin" /> Finalisation en cours…
              </div>
            )}
          </div>
        </div>

        {/* Colonne droite — Assistant IA + Pied 3D (feature groupée) */}
        {assistantEnabled && (
          <div className="flex flex-col gap-3 sticky top-6">

            {/* Assistant IA — au-dessus */}
            <div className="bg-[#4931F7]/5 dark:bg-[#4931F7]/8 border border-[#4931F7]/15 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-[#4931F7]/15 flex items-center justify-center shrink-0">
                  <BrainCircuit size={12} className="text-[#4931F7]" />
                </div>
                <span className="text-[10px] font-black text-[#4931F7] uppercase tracking-widest">À vérifier</span>
                {isLoadingAssistant && <Loader2 size={10} className="text-[#4931F7]/50 animate-spin ml-auto" />}
              </div>

              {visibleQuestions.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {visibleQuestions.map((q) => {
                    const realIdx = assistantQuestions.indexOf(q);
                    return (
                      <div key={realIdx} className="flex items-start justify-between gap-2 bg-white/70 dark:bg-white/5 rounded-xl px-3 py-2.5">
                        <div className="flex items-start gap-1.5 min-w-0">
                          <span className="text-[#4931F7] text-sm mt-0.5 shrink-0">›</span>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-snug">{q}</span>
                        </div>
                        <button
                          onClick={() => setDismissedIdxs(prev => new Set([...prev, realIdx]))}
                          className="shrink-0 text-slate-300 hover:text-slate-500 transition-colors mt-0.5"
                          title="Marquer comme traité"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : isLoadingAssistant ? (
                <p className="text-xs text-slate-400 italic">Analyse en cours…</p>
              ) : (
                <p className="text-xs text-slate-400/70 italic">Les suggestions apparaîtront après la première analyse du CR.</p>
              )}
            </div>

            {/* Cartographie podologique 3D — en dessous */}
            {FOOT_VIEWER_3D_ENABLED && (
              <FootViewer3D
                detectedZoneIds={liveDetectedZones}
                side={liveDetectedSide}
                compact
              />
            )}

          </div>
        )}

      </div>
    </div>
  );
}

export function RecordingBlock({ isRecording, isPaused, isProcessing, startRecording, stopRecording, pauseRecording, resumeRecording, canvasRef, recordingTime, formatTime, error, canRetry = false, uploadAttempt = 0, onRetry, onImportAudio }) {
  const importInputRef = useRef(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [micQuality, setMicQuality] = useState(null); // null | 'testing' | 'mauvais' | 'moyen' | 'bon'
  const [testCountdown, setTestCountdown] = useState(null);

  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then(all => {
      const mics = all.filter(d => d.kind === 'audioinput');
      setDevices(mics);
      if (mics.length > 0) setSelectedDeviceId(prev => prev || mics[0].deviceId);
    }).catch(() => {});
  }, []);

  const testMic = async () => {
    setMicQuality('testing');
    setTestCountdown(3);
    try {
      const constraint = selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: constraint });
      const audioCtx = new AudioContext();
      const analyser = audioCtx.createAnalyser();
      audioCtx.createMediaStreamSource(stream).connect(analyser);
      analyser.fftSize = 256;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let maxRms = 0;

      const countInterval = setInterval(() => setTestCountdown(p => (p > 1 ? p - 1 : (clearInterval(countInterval), null))), 1000);
      const measureInterval = setInterval(() => {
        analyser.getByteTimeDomainData(dataArray);
        const rms = Math.sqrt(dataArray.reduce((s, v) => s + (v - 128) ** 2, 0) / dataArray.length);
        if (rms > maxRms) maxRms = rms;
      }, 80);

      await new Promise(r => setTimeout(r, 3000));
      clearInterval(measureInterval);
      stream.getTracks().forEach(t => t.stop());
      audioCtx.close();

      // Re-énumération post-permission pour obtenir les labels
      const all = await navigator.mediaDevices.enumerateDevices();
      const mics = all.filter(d => d.kind === 'audioinput');
      setDevices(mics);

      setMicQuality(maxRms < 10 ? 'mauvais' : maxRms < 35 ? 'moyen' : 'bon');
      setTestCountdown(null);
    } catch {
      setMicQuality('mauvais');
      setTestCountdown(null);
    }
  };

  const handleStartRecording = () => startRecording(selectedDeviceId || null);
  const isTesting = micQuality === 'testing';
  const qualityResult = micQuality && micQuality !== 'testing' ? MIC_QUALITY[micQuality] : null;

  return (
    <div className="w-full max-w-5xl bg-white dark:bg-[#151e32] rounded-2xl p-8 md:p-12 border border-slate-200/60 dark:border-transparent flex flex-col items-center text-center animate-in fade-in zoom-in">
      <h1 className="text-2xl font-black text-[#001F3F] dark:text-white mb-2">{isProcessing ? "Analyse en cours..." : "Prêt à dicter ?"}</h1>
      <div className="flex flex-col items-center justify-center gap-6 w-full h-10">
        {isProcessing ? <p className="text-sm font-bold text-[#4931F7] animate-pulse uppercase tracking-widest">Kemer rédige le compte rendu...</p> : (
          <div className={`flex items-center gap-4 transition-all duration-300 ${isRecording ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}>
            <canvas ref={canvasRef} width={160} height={40} className={`w-40 h-10 transition-opacity ${isPaused ? 'opacity-30' : 'opacity-100'}`} />
            <span className={`text-sm font-bold tabular-nums w-auto text-left ${isPaused ? 'text-slate-400' : 'text-red-500'}`}>
              {formatTime(recordingTime)}{isPaused ? ' — pause' : ''}
            </span>
          </div>
        )}
      </div>
      {error && (
        <div className="mt-4 w-full max-w-md space-y-2">
          <div className="flex items-start gap-2 text-red-500 bg-red-50 dark:bg-red-500/10 px-4 py-2.5 rounded-xl text-sm font-bold">
            <AlertCircle size={16} className="shrink-0 mt-0.5" /> <span>{error}</span>
          </div>
          {canRetry && (
            <button
              onClick={onRetry}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#4931F7] text-white rounded-xl text-sm font-bold hover:bg-[#3b26c6] transition-colors shadow-md shadow-[#4931F7]/20"
            >
              <RotateCcw size={15} />
              Réessayer l'envoi{uploadAttempt > 1 ? ` (tentative ${uploadAttempt}/3 épuisée)` : ""}
            </button>
          )}
        </div>
      )}
      <button onClick={isRecording ? stopRecording : handleStartRecording} disabled={isProcessing} className={`group relative mt-6 flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 shadow-xl ${isProcessing ? "bg-slate-100 text-[#4931F7] shadow-none cursor-not-allowed" : isRecording ? "bg-red-50 text-red-500 hover:bg-red-100 animate-pulse" : "bg-[#4931F7] text-white hover:bg-[#3b26c6] hover:scale-105"}`}>
        {isProcessing ? <Loader2 size={32} className="animate-spin" /> : isRecording ? <Square size={28} className="fill-current" /> : <Mic size={32} />}
      </button>
      {isRecording && !isProcessing && (
        <button
          onClick={isPaused ? resumeRecording : pauseRecording}
          className={`mt-4 flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            isPaused
              ? 'bg-[#4931F7] text-white hover:bg-[#3b26c6]'
              : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/20'
          }`}
        >
          {isPaused ? <><Play size={13} className="fill-current" /> Reprendre</> : <><Pause size={13} className="fill-current" /> Pause</>}
        </button>
      )}

      {/* ── Sélecteur de microphone ── */}
      {!isRecording && !isProcessing && (
        <div className="mt-8 w-full max-w-md border-t border-slate-100 dark:border-white/5 pt-6 space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
            <Mic size={10} /> Microphone
          </p>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <select
                value={selectedDeviceId}
                onChange={e => { setSelectedDeviceId(e.target.value); setMicQuality(null); }}
                disabled={isTesting}
                className="w-full appearance-none bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-3 pr-8 py-2.5 text-xs font-bold text-[#001F3F] dark:text-white focus:outline-none focus:border-[#4931F7] transition-colors disabled:opacity-50 cursor-pointer"
              >
                {devices.length === 0 && <option value="">Microphone par défaut</option>}
                {devices.map((d, i) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Microphone ${i + 1}`}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            <button
              onClick={testMic}
              disabled={isTesting}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-white/20 disabled:opacity-50 transition-colors"
            >
              {isTesting
                ? <><Loader2 size={12} className="animate-spin" /> {testCountdown ?? '…'}</>
                : 'Tester'}
            </button>
          </div>

          {isTesting && (
            <p className="text-[11px] text-slate-400 font-medium animate-pulse">
              Parlez normalement pendant {testCountdown ?? 0}s…
            </p>
          )}

          {qualityResult && (
            <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${qualityResult.bg}`}>
              <div className={`w-2 h-2 rounded-full shrink-0 ${qualityResult.dot}`} />
              <span className={`text-xs font-black ${qualityResult.text}`}>{qualityResult.label}</span>
              <span className="text-[10px] text-slate-400 ml-auto">{qualityResult.hint}</span>
            </div>
          )}

          {/* ── Réimport audio sauvegardé ── */}
          {onImportAudio && (
            <div className="pt-4 border-t border-slate-100 dark:border-white/5">
              <input
                ref={importInputRef}
                type="file"
                accept="audio/*,.webm,.mp4,.ogg,.mp3,.wav,.m4a"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onImportAudio(file);
                  e.target.value = "";
                }}
              />
              <button
                onClick={() => importInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-white/15 text-slate-500 dark:text-slate-400 text-xs font-bold hover:border-[#4931F7] hover:text-[#4931F7] dark:hover:border-[#4931F7] dark:hover:text-[#4931F7] transition-colors"
              >
                <Upload size={13} /> Recharger le CR (importer audio sauvegardé)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- BLOC PÉDICURIE ---
const WAVEFORM_BARS = [6, 16, 24, 12, 28, 18, 8, 26, 14, 22, 8, 16];

export function PedicurieBlock({ selectedPatientObj, user, onNewPatient, onSaved, onGoToFacturation }) {
  const [phase, setPhase]               = useState('form'); // 'form' | 'saved'
  const [isRecording, setIsRecording]   = useState(false);
  const [isPaused, setIsPaused]         = useState(false);
  const [transcript, setTranscript]     = useState('');
  const [interimText, setInterimText]   = useState('');
  const [micError, setMicError]         = useState('');
  const [isSaving, setIsSaving]         = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime]   = useState(0);
  const [draftBanner, setDraftBanner]       = useState(null); // { text, savedAt }
  const [consultationId, setConsultationId] = useState(null);
  const [modePaiement, setModePaiement]     = useState(null); // null | 'cb' | 'especes' | 'cheque'
  const recognitionRef    = useRef(null);
  const mediaRecorderRef  = useRef(null);
  const audioChunksRef    = useRef([]);
  const timerRef          = useRef(null);
  const { showModal } = useCustomModal();

  const speechAvailable = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const draftKey = `kemer_ped_draft_${user?.id || 'anon'}_${selectedPatientObj?.id || 'none'}`;

  // Récupérer un éventuel brouillon au montage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft?.text) setDraftBanner(draft);
      }
    } catch {}
  }, [draftKey]);

  // Auto-sauvegarder le transcript en localStorage dès qu'il change
  useEffect(() => {
    if (!transcript) return;
    try {
      localStorage.setItem(draftKey, JSON.stringify({ text: transcript, savedAt: Date.now() }));
    } catch {}
  }, [transcript, draftKey]);

  // Bloquer la fermeture de page si enregistrement ou transcript non sauvegardé
  useEffect(() => {
    const handle = (e) => {
      if (isRecording || transcript) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handle);
    return () => window.removeEventListener('beforeunload', handle);
  }, [isRecording, transcript]);

  const clearDraft = () => { try { localStorage.removeItem(draftKey); } catch {} setDraftBanner(null); };

  // ── Dictée live (Chrome/Edge) ──────────────────────────────────────────────
  const startSpeech = () => {
    setMicError('');
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = 'fr-FR';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let finalPart = '';
      let interimPart = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalPart += e.results[i][0].transcript;
        else interimPart += e.results[i][0].transcript;
      }
      if (finalPart) setTranscript(prev => prev ? `${prev} ${finalPart.trim()}` : finalPart.trim());
      setInterimText(interimPart);
    };
    rec.onerror = (e) => {
      setMicError(e.error === 'not-allowed' ? 'Accès au microphone refusé.' : 'Erreur microphone.');
      setIsRecording(false);
    };
    rec.onend = () => { setIsRecording(false); setInterimText(''); };
    recognitionRef.current = rec;
    rec.start();
    setIsRecording(true);
  };
  const stopSpeech = () => recognitionRef.current?.stop();

  // ── Enregistrement audio (Firefox/Safari) ─────────────────────────────────
  const startMediaRecording = async () => {
    setMicError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
      const detectedMime = MIME_CANDIDATES.find(t => MediaRecorder.isTypeSupported(t));
      const mr = new MediaRecorder(stream, detectedMime ? { mimeType: detectedMime } : undefined);
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      setMicError('Accès au microphone refusé.');
    }
  };
  const stopMediaRecording = () => {
    clearInterval(timerRef.current);
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    setIsRecording(false);
  };
  const transcribeAudio = async () => {
    const actualMime = sanitizeMimeType(mediaRecorderRef.current?.mimeType);
    const blob = new Blob(audioChunksRef.current, { type: actualMime });
    setIsTranscribing(true);
    try {
      const fd = new FormData();
      fd.append('audio', blob, `note.${actualMime.includes('mp4') ? 'mp4' : actualMime.includes('ogg') ? 'ogg' : 'webm'}`);
      const res = await fetch('/api/pedicurie-transcribe', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.transcript) setTranscript(data.transcript);
      else setMicError('Transcription vide, veuillez réessayer.');
    } catch {
      setMicError('Erreur lors de la transcription.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const startRecording = () => { setIsPaused(false); speechAvailable ? startSpeech() : startMediaRecording(); };
  const stopRecording  = () => { setIsPaused(false); speechAvailable ? stopSpeech()  : stopMediaRecording(); };

  const pauseRecording = () => {
    setIsPaused(true);
    if (speechAvailable) {
      recognitionRef.current?.stop(); // onend mettra isRecording=false, on override
      setIsRecording(true); // on reste "en cours" mais pausé
    } else {
      mediaRecorderRef.current?.pause();
      clearInterval(timerRef.current);
    }
  };

  const resumeRecording = () => {
    setIsPaused(false);
    if (speechAvailable) {
      // Redémarre la reconnaissance — le transcript accumulé est conservé
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SR();
      rec.lang = 'fr-FR'; rec.continuous = true; rec.interimResults = true;
      rec.onresult = (e) => {
        let finalPart = ''; let interimPart = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) finalPart += e.results[i][0].transcript;
          else interimPart += e.results[i][0].transcript;
        }
        if (finalPart) setTranscript(prev => prev ? `${prev} ${finalPart.trim()}` : finalPart.trim());
        setInterimText(interimPart);
      };
      rec.onerror = () => { setMicError('Erreur microphone.'); setIsRecording(false); setIsPaused(false); };
      rec.onend = () => { if (!isPaused) { setIsRecording(false); setInterimText(''); } };
      recognitionRef.current = rec;
      rec.start();
    } else {
      mediaRecorderRef.current?.resume();
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    }
  };

  const resetNote = () => {
    setTranscript(''); setInterimText(''); setMicError(''); setIsPaused(false);
    audioChunksRef.current = [];
    clearDraft();
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;

  const handleValidate = async () => {
    if (!selectedPatientObj?.id) {
      await showModal({ type: 'alert', title: 'Patient manquant', message: "Sélectionnez d'abord un patient." });
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/pedicurie-facture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: selectedPatientObj.id, transcription: transcript.trim() || null }),
      });
      if (res.ok) {
        const data = await res.json();
        setConsultationId(data.consultationId);
        clearDraft();
        setPhase('saved');
        onSaved?.();
      }
      else await showModal({ type: 'alert', title: 'Erreur', message: "Impossible de sauvegarder la consultation." });
    } catch {
      await showModal({ type: 'alert', title: 'Erreur serveur', message: "Une erreur est survenue." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetModePaiement = async (mode) => {
    if (!consultationId) return;
    const newMode = modePaiement === mode ? null : mode; // toggle off si même valeur
    setModePaiement(newMode);
    try {
      await fetch(`/api/consultations/${consultationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devisData: { modePaiement: newMode } }),
      });
    } catch {
      // rollback silencieux — on laisse la valeur locale
    }
  };

  // ── Rendu du bloc note vocale ──────────────────────────────────────────────
  const renderNoteBlock = () => {
    if (isTranscribing) return (
      <div className="flex flex-col items-center gap-3 py-4">
        <Loader2 size={28} className="animate-spin text-[#4931F7]" />
        <p className="text-xs font-bold text-slate-400">Transcription en cours...</p>
      </div>
    );

    if (!isRecording && !transcript) return (
      <div className="flex flex-col items-center gap-3 py-1">
        <button onClick={startRecording}
          className="w-16 h-16 rounded-full bg-[#4931F7] text-white flex items-center justify-center shadow-lg shadow-[#4931F7]/30 hover:bg-[#3b26c6] hover:scale-105 transition-all">
          <Mic size={26} />
        </button>
        <p className="text-xs font-bold text-slate-400">Dicter des observations</p>
      </div>
    );

    if (isRecording) return (
      <div className="flex flex-col items-center gap-4 w-full">
        {/* Waveform — figée si pausé */}
        <div className="flex items-center gap-1.5 h-8">
          {WAVEFORM_BARS.map((h, i) => (
            <div key={i} className={`w-1.5 rounded-full bg-[#4931F7] ${isPaused ? 'opacity-30' : 'animate-bounce'}`}
              style={{ height: `${h}px`, animationDelay: `${i * 60}ms`, animationDuration: '0.7s' }} />
          ))}
        </div>
        {/* Texte live (Web Speech) ou chrono (MediaRecorder) */}
        {speechAvailable && (transcript || interimText) ? (
          <p className="text-sm text-[#001F3F] dark:text-white text-left w-full leading-relaxed">
            {transcript} <span className="text-slate-400 italic">{interimText}</span>
          </p>
        ) : !speechAvailable ? (
          <span className={`text-sm font-black tabular-nums ${isPaused ? 'text-slate-400' : 'text-red-500'}`}>{formatTime(recordingTime)}{isPaused ? ' — en pause' : ''}</span>
        ) : null}
        {isPaused && speechAvailable && transcript && (
          <p className="text-xs text-slate-400 italic">En pause — dictée suspendue</p>
        )}
        <div className="flex items-center gap-2">
          {isPaused ? (
            <button onClick={resumeRecording} className="flex items-center gap-2 px-5 py-2.5 bg-[#4931F7] text-white rounded-xl text-xs font-bold hover:bg-[#3b26c6] transition-colors">
              <Play size={13} className="fill-current" /> Reprendre
            </button>
          ) : (
            <button onClick={pauseRecording} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-white/20 transition-colors">
              <Pause size={13} className="fill-current" /> Pause
            </button>
          )}
          <button onClick={stopRecording} className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-colors">
            <Square size={13} className="fill-current" /> Arrêter
          </button>
        </div>
      </div>
    );

    // Après enregistrement MediaRecorder : proposer de transcrire
    if (!speechAvailable && audioChunksRef.current.length > 0 && !transcript) return (
      <div className="flex flex-col items-center gap-3 w-full">
        <p className="text-xs font-bold text-slate-500">Enregistrement terminé — {formatTime(recordingTime)}</p>
        <div className="flex gap-2">
          <button onClick={transcribeAudio}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#4931F7] text-white rounded-xl text-xs font-bold hover:bg-[#3b26c6] transition-colors shadow-md shadow-[#4931F7]/20">
            <Mic size={13} /> Transcrire
          </button>
          <button onClick={resetNote}
            className="px-4 py-2.5 bg-slate-100 dark:bg-white/5 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors">
            Recommencer
          </button>
        </div>
      </div>
    );

    // Transcript éditable
    return (
      <div className="w-full space-y-3">
        <textarea value={transcript} onChange={e => setTranscript(e.target.value)}
          className="w-full min-h-[100px] bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm text-[#001F3F] dark:text-white resize-none focus:outline-none focus:border-[#4931F7] transition-colors"
          placeholder="Observations..." />
        <button onClick={resetNote} className="text-xs font-bold text-slate-400 hover:text-[#4931F7] transition-colors flex items-center gap-1">
          <Mic size={11} /> Recommencer la dictée
        </button>
      </div>
    );
  };

  // ── Phase : saisie ──────────────────────────────────────────────────────────
  if (phase === 'form') {
    return (
      <div className="w-full max-w-5xl bg-white dark:bg-[#151e32] rounded-2xl p-8 md:p-12 border border-slate-200/60 dark:border-transparent flex flex-col items-center animate-in fade-in zoom-in gap-8">

        {/* Bannière de reprise de brouillon */}
        {draftBanner && !transcript && (
          <div className="w-full max-w-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-2xl px-5 py-4 flex items-start gap-3">
            <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-amber-700 dark:text-amber-400">Brouillon non sauvegardé retrouvé</p>
              <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5 line-clamp-2">{draftBanner.text}</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => { setTranscript(draftBanner.text); setDraftBanner(null); }}
                className="text-xs font-black text-amber-700 dark:text-amber-400 hover:underline">Reprendre</button>
              <button onClick={clearDraft} className="text-xs font-bold text-amber-500/70 hover:text-amber-700 dark:hover:text-amber-400">Ignorer</button>
            </div>
          </div>
        )}

        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center">
            <Scissors size={28} className="text-amber-500" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#001F3F] dark:text-white">Pédicurie</h2>
            {selectedPatientObj?.id
              ? <p className="text-sm font-bold text-slate-400 mt-0.5">{formatPrenom(selectedPatientObj.prenom)} <span className="uppercase">{selectedPatientObj.nom}</span></p>
              : <p className="text-sm text-slate-400 mt-0.5">Sélectionnez un patient</p>}
          </div>
        </div>

        <div className="w-full max-w-xl">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Mic size={10} /> Note vocale
          </p>
          <div className="bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 p-6 flex flex-col items-center gap-4">
            {renderNoteBlock()}
            {micError && <p className="text-xs font-bold text-red-500 flex items-center gap-1.5"><AlertCircle size={13} /> {micError}</p>}
          </div>
        </div>

        <button onClick={handleValidate} disabled={isSaving || !selectedPatientObj?.id}
          className="w-full max-w-xl py-4 bg-[#4931F7] text-white rounded-2xl font-bold text-sm shadow-lg shadow-[#4931F7]/30 hover:bg-[#3b26c6] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all">
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
          Valider la consultation
        </button>
      </div>
    );
  }

  // ── Phase : enregistrée ─────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-5xl bg-white dark:bg-[#151e32] rounded-2xl p-8 md:p-12 border border-slate-200/60 dark:border-transparent flex flex-col items-center animate-in fade-in zoom-in gap-8">

      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center">
          <CheckCircle size={28} className="text-green-500" />
        </div>
        <div>
          <h2 className="text-xl font-black text-[#001F3F] dark:text-white">Consultation enregistrée</h2>
          <p className="text-sm font-bold text-slate-400 mt-0.5">
            {formatPrenom(selectedPatientObj.prenom)} <span className="uppercase">{selectedPatientObj.nom}</span>
          </p>
        </div>
      </div>

      {transcript && (
        <div className="w-full max-w-xl text-left">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5"><Mic size={10} /> Note vocale</p>
          <div className="bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 p-4">
            <p className="text-sm text-[#001F3F] dark:text-white leading-relaxed">{transcript}</p>
          </div>
        </div>
      )}

      {/* Mode de paiement */}
      <div className="w-full max-w-xl">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Mode de paiement</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'cb',      label: 'CB',       Icon: CreditCard },
            { id: 'especes', label: 'Espèces',  Icon: Banknote   },
            { id: 'cheque',  label: 'Chèque',   Icon: PenLine    },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => handleSetModePaiement(id)}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-bold transition-all ${
                modePaiement === id
                  ? 'border-[#4931F7] bg-[#4931F7]/5 text-[#4931F7]'
                  : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-[#4931F7]/30'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {onGoToFacturation && (
          <button onClick={onGoToFacturation}
            className="text-xs font-bold uppercase tracking-wide text-slate-500 bg-transparent border border-slate-300 px-4 py-2 rounded-xl hover:bg-[#4ECDC4] hover:text-white hover:border-transparent transition-all">
            Nouvelle facture
          </button>
        )}
        <button onClick={onNewPatient}
          className="text-xs font-bold uppercase tracking-wide text-slate-500 bg-transparent border border-slate-300 px-4 py-2 rounded-xl hover:bg-[#4ECDC4] hover:text-white hover:border-transparent transition-all">
          Nouveau patient
        </button>
      </div>
    </div>
  );
}

// --- NOMENCLATURE SELECTOR ---
function NomenclatureSelector({ initialNomenclatures, selectedNomenclature, setSelectedNomenclature, praticienId }) {
  const [nomenclatures, setNomenclatures] = useState(initialNomenclatures || []);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(selectedNomenclature || "");
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setEditingIndex(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredNomenclatures = nomenclatures.filter(n =>
    n.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const isNewTerm = searchTerm.trim() !== "" && !nomenclatures.some(n => n.toLowerCase() === searchTerm.trim().toLowerCase());

  const persistNomenclatures = async (newList) => {
    if (!praticienId) return;
    setIsSaving(true);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ praticienId, nomenclatures: newList }),
      });
    } catch (_) {}
    setIsSaving(false);
  };

  const handleSelect = (code) => {
    setSelectedNomenclature(code);
    setSearchTerm(code);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    setSearchTerm("");
    setSelectedNomenclature("");
  };

  const handleAdd = async () => {
    const val = searchTerm.trim();
    if (!val) return;
    const newList = [...nomenclatures, val];
    setNomenclatures(newList);
    setSelectedNomenclature(val);
    setIsOpen(false);
    await persistNomenclatures(newList);
  };

  const handleDelete = async (e, index) => {
    e.stopPropagation();
    const removed = nomenclatures[index];
    const newList = nomenclatures.filter((_, i) => i !== index);
    setNomenclatures(newList);
    if (selectedNomenclature === removed) {
      setSelectedNomenclature("");
      setSearchTerm("");
    }
    await persistNomenclatures(newList);
  };

  const handleEditStart = (e, index) => {
    e.stopPropagation();
    setEditingIndex(index);
    setEditValue(nomenclatures[index]);
  };

  const handleEditSave = async (index) => {
    const val = editValue.trim();
    if (!val) { setEditingIndex(null); return; }
    const newList = [...nomenclatures];
    if (selectedNomenclature === nomenclatures[index]) {
      setSelectedNomenclature(val);
      setSearchTerm(val);
    }
    newList[index] = val;
    setNomenclatures(newList);
    setEditingIndex(null);
    await persistNomenclatures(newList);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
        <input
          type="text"
          placeholder="Rechercher ou saisir une nomenclature..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setIsOpen(true); if (!e.target.value) setSelectedNomenclature(""); }}
          onFocus={() => setIsOpen(true)}
          className="w-full bg-white border border-blue-200 rounded-lg pl-8 pr-8 py-2 text-sm font-mono font-bold text-[#001F3F] focus:outline-none focus:border-[#4931F7]"
        />
        {searchTerm && (
          <button onMouseDown={handleClear} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
            <X size={13} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
          {filteredNomenclatures.map((code, i) =>
            editingIndex === i ? (
              <div key={i} className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-100" onMouseDown={(e) => e.stopPropagation()}>
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleEditSave(i); if (e.key === 'Escape') setEditingIndex(null); }}
                  className="flex-1 text-xs font-mono border border-[#4931F7] rounded px-2 py-1 focus:outline-none"
                />
                <button onMouseDown={() => handleEditSave(i)} className="p-1 text-[#4931F7] hover:text-[#3b26c6] shrink-0"><Check size={13} /></button>
                <button onMouseDown={() => setEditingIndex(null)} className="p-1 text-slate-400 hover:text-slate-600 shrink-0"><X size={13} /></button>
              </div>
            ) : (
              <div key={i} onMouseDown={() => handleSelect(code)} className={`flex items-center justify-between px-3 py-2.5 cursor-pointer border-b border-slate-100 last:border-0 text-sm font-mono font-bold transition-colors ${selectedNomenclature === code ? 'bg-blue-50 text-[#4931F7]' : 'text-[#001F3F] hover:bg-slate-50'}`}>
                <span className="truncate flex-1">{code}</span>
                <div className="flex items-center gap-0.5 ml-2 shrink-0" onMouseDown={(e) => e.stopPropagation()}>
                  <button onMouseDown={(e) => handleEditStart(e, i)} className="p-1.5 text-slate-300 hover:text-[#4931F7] rounded-md hover:bg-blue-50 transition-colors"><Pencil size={12} /></button>
                  <button onMouseDown={(e) => handleDelete(e, i)} className="p-1.5 text-slate-300 hover:text-red-500 rounded-md hover:bg-red-50 transition-colors"><Trash2 size={12} /></button>
                </div>
              </div>
            )
          )}

          {isNewTerm && (
            <div onMouseDown={handleAdd} className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-blue-50 text-sm font-bold text-[#4931F7] border-t border-slate-100">
              {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              Ajouter &quot;{searchTerm.trim()}&quot;
            </div>
          )}

          {filteredNomenclatures.length === 0 && !isNewTerm && (
            <div className="px-3 py-4 text-xs text-slate-400 italic text-center">Aucune nomenclature enregistrée.</div>
          )}
        </div>
      )}
    </div>
  );
}

// --- BLOC FACTURATION STANDALONE ---
export function FacturationBlock({ selectedPatientObj, user, linkedConsultationId = null, linkedConsultationPatientId = null, onNewPatient, onGoToOrdonnance, onConsultationSaved }) {
  const { showModal } = useCustomModal();

  const [typeConsultation, setTypeConsultation] = useState(null); // 'podologie' | 'pedicurie'
  const [phase, setPhase] = useState('form'); // 'form' | 'saved'
  const [consultationId, setConsultationId] = useState(null);
  const [savedDevisData, setSavedDevisData] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [hasSigFacture, setHasSigFacture] = useState(false);
  const [modePaiement, setModePaiement] = useState(null); // null | 'cb' | 'especes' | 'cheque'

  // Podologie
  const [includeBilan, setIncludeBilan] = useState(false);
  const [prixBilan, setPrixBilan] = useState(String(user?.prixBilan || '50'));
  const [includeSemelles, setIncludeSemelles] = useState(false);
  const [prixSemelles, setPrixSemelles] = useState(String(user?.prixSemelles || '150'));
  const [selectedNomenclature, setSelectedNomenclature] = useState('');

  // Pédicurie
  const [prixPedicurie, setPrixPedicurie] = useState(String(user?.prixPedicurie || '35'));

  // Date de la facture (antidatage possible)
  const [factureDate, setFactureDate] = useState(() => new Date().toISOString().slice(0, 10));

  const savePrixDefaut = async (overrides = {}) => {
    if (!user?.id) return;
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        praticienId: user.id,
        prixBilan: overrides.prixBilan ?? prixBilan,
        prixSemelles: overrides.prixSemelles ?? prixSemelles,
        prixPedicurie: overrides.prixPedicurie ?? prixPedicurie,
      }),
    });
  };

  const buildDevisData = () => {
    if (typeConsultation === 'pedicurie') {
      // Pédicurie : pas de devis, facture directe
      return {
        status: 'AWAITING_SIGNATURE',
        items: [{ description: 'Soin de Pédicurie', quantity: 1, unitPrice: prixPedicurie }],
        totalAmount: `${prixPedicurie} €`,
        factureDate,
      };
    }
    const items = [];
    let total = 0;
    if (includeBilan) {
      items.push({ description: 'Bilan Podologique', quantity: 1, unitPrice: prixBilan });
      total += parseFloat(prixBilan) || 0;
    }
    if (includeSemelles) {
      items.push({ description: 'Semelles Orthopédiques', quantity: 1, unitPrice: prixSemelles });
      total += parseFloat(prixSemelles) || 0;
    }
    const semellePrice = parseFloat(prixSemelles) || 0;
    return {
      status: 'AWAITING_SIGNATURE',
      items,
      totalAmount: `${total.toFixed(2)} €`,
      factureDate,
      // devisItems = uniquement la ligne semelle (affichée dans le devis patient)
      // absent si pas de semelles → pas de devis généré
      ...(includeSemelles && {
        devisItems: [{ description: 'Semelles Orthopédiques', quantity: 1, unitPrice: prixSemelles }],
        devisTotalAmount: `${semellePrice.toFixed(2)} €`,
      }),
      ...(includeSemelles && selectedNomenclature && { nomenclatureSelected: selectedNomenclature }),
    };
  };

  const handleValider = async () => {
    if (!selectedPatientObj?.id) {
      await showModal({ type: 'alert', title: 'Patient manquant', message: "Sélectionnez d'abord un patient." });
      return;
    }
    if (typeConsultation === 'podologie' && !includeBilan && !includeSemelles) {
      await showModal({ type: 'alert', title: 'Action requise', message: "Sélectionnez au moins une prestation." });
      return;
    }
    setIsBusy(true);
    try {
      const devisData = buildDevisData();
      const canLink = linkedConsultationId && linkedConsultationPatientId &&
        String(selectedPatientObj.id) === String(linkedConsultationPatientId);
      let savedId;
      if (canLink) {
        const res = await fetch(`/api/consultations/${linkedConsultationId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ devisData, typeConsultation: "facturation" }),
        });
        if (!res.ok) { await showModal({ type: 'alert', title: 'Erreur', message: "Impossible de créer la facture." }); return; }
        savedId = linkedConsultationId;
      } else {
        const motif = typeConsultation === 'pedicurie' ? 'Soin de Pédicurie' : 'Facturation Podologie';
        const res = await fetch('/api/facturation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patientId: selectedPatientObj.id, devisData, typeConsultation, motif }),
        });
        if (!res.ok) { await showModal({ type: 'alert', title: 'Erreur', message: "Impossible de créer la facture." }); return; }
        const data = await res.json();
        savedId = data.consultationId;
      }
      setSavedDevisData(devisData);
      setConsultationId(savedId);
      onConsultationSaved?.(savedId, String(selectedPatientObj.id));
      // Ouvre la fenêtre QR de 10 min dès la création
      fetch(`/api/consultations/${savedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrAccessUntil: new Date(Date.now() + 10 * 60 * 1000).toISOString() }),
      });
      setPhase('saved');
    } catch {
      await showModal({ type: 'alert', title: 'Erreur serveur', message: "Une erreur est survenue." });
    } finally {
      setIsBusy(false);
    }
  };

  const handlePrint = async () => {
    setIsBusy(true);
    const win = window.open('', '_blank');
    try {
      const data = savedDevisData || buildDevisData();
      const cleanItems = (data.items || []).map(item => ({
        ...item,
        unitPrice: isNaN(parseFloat(item.unitPrice)) ? '0' : item.unitPrice,
      }));
      const total = cleanItems.reduce((acc, item) => acc + (parseFloat(item.unitPrice) * (parseInt(item.quantity) || 1)), 0);
      const finalData = { ...data, items: cleanItems, totalAmount: `${total.toFixed(2)} €` };
      const rawBranding = data.nomenclatureSelected ? { ...user, nomenclature: data.nomenclatureSelected } : user || {};
      const finalBranding = await resolveImages(rawBranding);
      const blob = await pdf(
        <InvoicePDF data={finalData} patient={selectedPatientObj} signature={null} type="facture" branding={finalBranding} />
      ).toBlob();
      if (win) win.location.href = URL.createObjectURL(blob);
    } catch {
      if (win) win.close();
      await showModal({ type: 'alert', title: 'Erreur', message: "Impossible de générer la facture." });
    } finally {
      setIsBusy(false);
    }
  };

  const handlePrintDevis = async () => {
    setIsBusy(true);
    const win = window.open('', '_blank');
    try {
      const rawBranding = selectedNomenclature ? { ...user, nomenclature: selectedNomenclature } : user || {};
      const finalBranding = await resolveImages(rawBranding);
      const devisData = {
        devisItems: [{ description: 'Semelles Orthopédiques', quantity: 1, unitPrice: prixSemelles }],
        ...(selectedNomenclature && { nomenclatureSelected: selectedNomenclature }),
      };
      const blob = await pdf(
        <InvoicePDF data={devisData} patient={selectedPatientObj} signature={null} type="devis" branding={finalBranding} />
      ).toBlob();
      if (win) win.location.href = URL.createObjectURL(blob);
    } catch {
      if (win) win.close();
      await showModal({ type: 'alert', title: 'Erreur', message: "Impossible de générer le devis." });
    } finally {
      setIsBusy(false);
    }
  };

  const handleShareQR = async () => {
    const qrAccessUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    await fetch(`/api/consultations/${consultationId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrAccessUntil }),
    });
    await showModal({
      type: 'alert',
      title: 'Facture disponible',
      message: `${selectedPatientObj?.prenom || ''} ${selectedPatientObj?.nom || ''} peut télécharger sa facture en scannant le QR code du cabinet.`,
    });
  };

  const marquerCommeSignePapier = async () => {
    const ok = await showModal({ type: 'confirm', title: 'Confirmation', message: "Confirmez-vous que le patient a signé la version papier ?" });
    if (!ok) return;
    setIsBusy(true);
    try {
      const newDevisData = { ...(savedDevisData || {}), status: 'SIGNED' };
      await fetch(`/api/consultations/${consultationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          devisData: newDevisData,
          signatureFacture: 'SIGNATURE_PAPIER_MANUELLE',
        }),
      });
      setSavedDevisData(newDevisData);
      setHasSigFacture(true);
    } catch {
      await showModal({ type: 'alert', title: 'Erreur', message: "Une erreur est survenue." });
    } finally {
      setIsBusy(false);
    }
  };

  const handleSetModePaiement = async (mode) => {
    if (!consultationId) return;
    const newMode = modePaiement === mode ? null : mode; // toggle off si même valeur
    const newDevisData = { ...(savedDevisData || {}), modePaiement: newMode };
    setModePaiement(newMode);
    setSavedDevisData(newDevisData);
    try {
      await fetch(`/api/consultations/${consultationId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devisData: newDevisData }),
      });
    } catch {
      // rollback silencieux — on laisse la valeur locale
    }
  };

  const resetForm = () => {
    setPhase('form');
    setConsultationId(null);
    setSavedDevisData(null);
    setHasSigFacture(false);
    setModePaiement(null);
    setTypeConsultation(null);
    setIncludeBilan(false);
    setIncludeSemelles(false);
    setSelectedNomenclature('');
    setFactureDate(new Date().toISOString().slice(0, 10));
  };

  // Polling signature via QR
  useEffect(() => {
    if (!consultationId || hasSigFacture) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/consultations/${consultationId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.signatureFacture) { setHasSigFacture(true); clearInterval(interval); }
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [consultationId, hasSigFacture]);

  const canValider = typeConsultation === 'pedicurie' ||
    (typeConsultation === 'podologie' && (includeBilan || includeSemelles));

  // ── Phase : facture créée ──────────────────────────────────────────────────
  if (phase === 'saved') {
    return (
      <div className="w-full max-w-5xl bg-white dark:bg-[#151e32] rounded-2xl p-8 md:p-12 border border-slate-200/60 dark:border-transparent flex flex-col items-center animate-in fade-in zoom-in gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center">
            <CheckCircle size={28} className="text-green-500" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#001F3F] dark:text-white">Facture créée</h2>
            <p className="text-sm font-bold text-slate-400 mt-0.5">
              {formatPrenom(selectedPatientObj?.prenom)} <span className="uppercase">{selectedPatientObj?.nom}</span>
            </p>
          </div>
        </div>

        <div className="w-full max-w-xl">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left mb-3">
            {typeConsultation === 'pedicurie'
              ? `Soin de Pédicurie — ${prixPedicurie} €`
              : `Total — ${savedDevisData?.totalAmount || '—'}`}
          </p>
          <div className="flex gap-3 mb-3">
            <button onClick={handlePrint} disabled={isBusy}
              className="flex-1 px-5 py-4 bg-[#001F3F] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-900 disabled:opacity-50 transition-colors">
              {isBusy ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />} Imprimer
            </button>
            <EmailButton
              patient={selectedPatientObj}
              type="facture"
              filename={`Facture_${selectedPatientObj?.nom || 'patient'}.pdf`}
              generatePdf={async () => {
                const data = savedDevisData || buildDevisData();
                const cleanItems = (data.items || []).map(item => ({
                  ...item,
                  unitPrice: isNaN(parseFloat(item.unitPrice)) ? '0' : item.unitPrice,
                }));
                const total = cleanItems.reduce((acc, item) => acc + (parseFloat(item.unitPrice) * (parseInt(item.quantity) || 1)), 0);
                const finalData = { ...data, items: cleanItems, totalAmount: `${total.toFixed(2)} €` };
                const rawBranding = data.nomenclatureSelected ? { ...user, nomenclature: data.nomenclatureSelected } : user || {};
                const finalBranding = await resolveImages(rawBranding);
                return pdf(<InvoicePDF data={finalData} patient={selectedPatientObj} signature={null} type="facture" branding={finalBranding} />).toBlob();
              }}
              className="flex-1"
            />
          </div>
          <button onClick={marquerCommeSignePapier} disabled={hasSigFacture || isBusy}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all ${hasSigFacture ? 'bg-green-100 text-green-600' : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/15'}`}>
            {hasSigFacture
              ? <><CheckCircle size={16} /> Validé manuellement</>
              : <><FileSignature size={16} /> Valider manuellement</>}
          </button>
          {!hasSigFacture && (
            <div className="flex items-center gap-1.5 justify-center mt-3">
              <Loader2 size={12} className="animate-spin text-orange-400" />
              <span className="text-xs text-slate-400 font-medium">En attente de signature via QR...</span>
            </div>
          )}

          {/* Mode de paiement */}
          <div className="mt-5 pt-5 border-t border-slate-100 dark:border-white/5">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Mode de paiement</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'cb',      label: 'CB',       Icon: CreditCard },
                { id: 'especes', label: 'Espèces',  Icon: Banknote   },
                { id: 'cheque',  label: 'Chèque',   Icon: PenLine    },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => handleSetModePaiement(id)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-bold transition-all ${
                    modePaiement === id
                      ? 'border-[#4931F7] bg-[#4931F7]/5 text-[#4931F7]'
                      : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-[#4931F7]/30'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {onGoToOrdonnance && (
            <button onClick={onGoToOrdonnance}
              className="text-xs font-bold uppercase tracking-wide text-slate-500 bg-transparent border border-slate-300 px-4 py-2 rounded-xl hover:bg-[#4ECDC4] hover:text-white hover:border-transparent transition-all">
              Créer l'ordonnance
            </button>
          )}
          <button onClick={onNewPatient}
            className="text-xs font-bold uppercase tracking-wide text-slate-500 bg-transparent border border-slate-300 px-4 py-2 rounded-xl hover:bg-[#4ECDC4] hover:text-white hover:border-transparent transition-all">
            Nouveau patient
          </button>
        </div>
      </div>
    );
  }

  // ── Phase : formulaire ────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-5xl bg-white dark:bg-[#151e32] rounded-2xl p-8 md:p-12 border border-slate-200/60 dark:border-transparent flex flex-col items-center animate-in fade-in zoom-in gap-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center">
          <Receipt size={28} className="text-[#4931F7]" />
        </div>
        <div>
          <h2 className="text-xl font-black text-[#001F3F] dark:text-white">Créer une facture</h2>
          {selectedPatientObj?.id
            ? <p className="text-sm font-bold text-slate-400 mt-0.5">{formatPrenom(selectedPatientObj.prenom)} <span className="uppercase">{selectedPatientObj.nom}</span></p>
            : <p className="text-sm text-slate-400 mt-0.5">Sélectionnez un patient</p>}
        </div>
      </div>

      {/* Sélection du type de consultation */}
      <div className="w-full max-w-xl space-y-3">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type de consultation</p>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setTypeConsultation('podologie')}
            className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all ${typeConsultation === 'podologie' ? 'border-[#4931F7] bg-[#4931F7]/5' : 'border-slate-200 dark:border-white/10 hover:border-[#4931F7]/30'}`}>
            <Footprints size={26} className={typeConsultation === 'podologie' ? 'text-[#4931F7]' : 'text-slate-400'} />
            <span className={`text-sm font-bold ${typeConsultation === 'podologie' ? 'text-[#4931F7]' : 'text-slate-500 dark:text-slate-400'}`}>Podologie</span>
          </button>
          <button onClick={() => setTypeConsultation('pedicurie')}
            className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all ${typeConsultation === 'pedicurie' ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-900/10' : 'border-slate-200 dark:border-white/10 hover:border-amber-300'}`}>
            <Scissors size={26} className={typeConsultation === 'pedicurie' ? 'text-amber-500' : 'text-slate-400'} />
            <span className={`text-sm font-bold ${typeConsultation === 'pedicurie' ? 'text-amber-600' : 'text-slate-500 dark:text-slate-400'}`}>Soins de Pédicurie</span>
          </button>
        </div>
        {/* Devis semelles — action distincte, pas de consultation créée */}
        <button onClick={() => setTypeConsultation('devis-semelle')}
          className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl border-2 transition-all ${typeConsultation === 'devis-semelle' ? 'border-[#4ECDC4] bg-[#4ECDC4]/5' : 'border-slate-200 dark:border-white/10 hover:border-[#4ECDC4]/50'}`}>
          <FileText size={20} className={typeConsultation === 'devis-semelle' ? 'text-[#4ECDC4]' : 'text-slate-400'} />
          <div className="text-left">
            <p className={`text-sm font-bold leading-tight ${typeConsultation === 'devis-semelle' ? 'text-[#4ECDC4]' : 'text-slate-500 dark:text-slate-400'}`}>Devis Semelles Orthopédiques</p>
            <p className="text-[10px] text-slate-400 font-medium">Génère un devis avec nomenclature, sans créer de consultation</p>
          </div>
          <ChevronRight size={16} className="ml-auto text-slate-300 shrink-0" />
        </button>
      </div>

      {/* Actes — Podologie */}
      {typeConsultation === 'podologie' && (
        <div className="w-full max-w-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Actes à facturer</p>
          <div className="flex flex-col gap-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
            {/* Bilan */}
            <div onClick={() => setIncludeBilan(!includeBilan)}
              className={`flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all bg-white ${includeBilan ? 'border-[#4931F7]' : 'border-slate-100 hover:border-blue-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${includeBilan ? 'bg-[#4931F7] border-[#4931F7]' : 'border-slate-300 bg-white'}`}>
                    {includeBilan && <Check size={14} className="text-white" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <Stethoscope size={18} className={includeBilan ? 'text-[#4931F7]' : 'text-slate-400'} />
                    <span className="text-sm font-bold text-[#001F3F]">Bilan Podologique</span>
                  </div>
                </div>
                {includeBilan && (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <input type="number" value={prixBilan}
                      onChange={(e) => setPrixBilan(e.target.value)}
                      onBlur={(e) => savePrixDefaut({ prixBilan: e.target.value })}
                      className="w-16 text-right border border-blue-200 bg-white rounded-md p-1 text-sm font-bold focus:outline-none focus:border-[#4931F7]" />
                    <span className="text-sm font-bold text-[#4931F7]">€</span>
                  </div>
                )}
              </div>
            </div>

            {/* Semelles */}
            <div onClick={() => setIncludeSemelles(!includeSemelles)}
              className={`flex flex-col p-4 rounded-xl border-2 cursor-pointer transition-all bg-white ${includeSemelles ? 'border-[#4931F7]' : 'border-slate-100 hover:border-blue-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${includeSemelles ? 'bg-[#4931F7] border-[#4931F7]' : 'border-slate-300 bg-white'}`}>
                    {includeSemelles && <Check size={14} className="text-white" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <Footprints size={18} className={includeSemelles ? 'text-[#4931F7]' : 'text-slate-400'} />
                    <span className="text-sm font-bold text-[#001F3F]">Semelles Orthopédiques</span>
                  </div>
                </div>
                {includeSemelles && (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <input type="number" value={prixSemelles}
                      onChange={(e) => setPrixSemelles(e.target.value)}
                      onBlur={(e) => savePrixDefaut({ prixSemelles: e.target.value })}
                      className="w-16 text-right border border-blue-200 bg-white rounded-md p-1 text-sm font-bold focus:outline-none focus:border-[#4931F7]" />
                    <span className="text-sm font-bold text-[#4931F7]">€</span>
                  </div>
                )}
              </div>
              {includeSemelles && (
                <div className="mt-3 pt-3 border-t border-[#4931F7]/10" onClick={(e) => e.stopPropagation()}>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Nomenclature LPP</label>
                  <NomenclatureSelector
                    initialNomenclatures={user?.nomenclatures || []}
                    selectedNomenclature={selectedNomenclature}
                    setSelectedNomenclature={setSelectedNomenclature}
                    praticienId={user?.id}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tarification — Pédicurie */}
      {typeConsultation === 'pedicurie' && (
        <div className="w-full max-w-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Tarification</p>
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4">
            <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Soin de Pédicurie</span>
            <div className="ml-auto flex items-center gap-1.5">
              <input type="number" value={prixPedicurie}
                onChange={(e) => setPrixPedicurie(e.target.value)}
                onBlur={(e) => savePrixDefaut({ prixPedicurie: e.target.value })}
                className="w-20 text-center text-xl font-black text-[#4931F7] bg-transparent border-b-2 border-[#4931F7] outline-none" />
              <span className="text-sm font-bold text-slate-400">€</span>
            </div>
          </div>
        </div>
      )}

      {/* Devis Semelles Orthopédiques */}
      {typeConsultation === 'devis-semelle' && (
        <div className="w-full max-w-xl animate-in fade-in slide-in-from-top-2 duration-200 space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Semelles Orthopédiques</p>

          {/* Prix */}
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-4">
            <span className="text-sm font-bold text-slate-500 dark:text-slate-400">Prix unitaire</span>
            <div className="ml-auto flex items-center gap-1.5">
              <input type="number" value={prixSemelles}
                onChange={(e) => setPrixSemelles(e.target.value)}
                onBlur={(e) => savePrixDefaut({ prixSemelles: e.target.value })}
                className="w-20 text-center text-xl font-black text-[#4ECDC4] bg-transparent border-b-2 border-[#4ECDC4] outline-none" />
              <span className="text-sm font-bold text-slate-400">€</span>
            </div>
          </div>

          {/* Nomenclature */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Nomenclature LPP</label>
            <NomenclatureSelector
              initialNomenclatures={user?.nomenclatures || []}
              selectedNomenclature={selectedNomenclature}
              setSelectedNomenclature={setSelectedNomenclature}
              praticienId={user?.id}
            />
          </div>

          {/* Actions — imprimer ou envoyer par mail */}
          <div className="flex gap-3 pt-1">
            <button onClick={handlePrintDevis} disabled={isBusy || !selectedPatientObj?.id}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-4 bg-[#001F3F] dark:bg-white/10 text-white rounded-2xl font-bold text-sm hover:bg-slate-900 dark:hover:bg-white/20 disabled:opacity-50 transition-colors">
              {isBusy ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />} Imprimer
            </button>
            <EmailButton
              patient={selectedPatientObj}
              type="devis"
              filename={`Devis_Semelles_${selectedPatientObj?.nom || 'patient'}.pdf`}
              generatePdf={async () => {
                const rawBranding = selectedNomenclature ? { ...user, nomenclature: selectedNomenclature } : user || {};
                const finalBranding = await resolveImages(rawBranding);
                return pdf(
                  <InvoicePDF
                    data={{ devisItems: [{ description: 'Semelles Orthopédiques', quantity: 1, unitPrice: prixSemelles }], ...(selectedNomenclature && { nomenclatureSelected: selectedNomenclature }) }}
                    patient={selectedPatientObj}
                    signature={null}
                    type="devis"
                    branding={finalBranding}
                  />
                ).toBlob();
              }}
              className="flex-1 py-4 rounded-2xl"
            />
          </div>
          {!selectedPatientObj?.id && (
            <p className="text-[11px] text-slate-400 text-center">Sélectionnez un patient pour imprimer ou envoyer</p>
          )}
        </div>
      )}

      {typeConsultation !== 'devis-semelle' && (
        <div className="w-full max-w-xl space-y-3">
          <div className="flex items-center gap-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-5 py-3">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Date de la facture</span>
            <input
              type="date"
              value={factureDate}
              onChange={e => setFactureDate(e.target.value)}
              className="ml-auto bg-transparent text-sm font-bold text-[#001F3F] dark:text-white focus:outline-none cursor-pointer"
            />
          </div>
          <div className="flex gap-3">
            {onNewPatient && (
              <button onClick={onNewPatient}
                className="px-5 py-4 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 rounded-2xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-all shrink-0">
                Nouveau patient
              </button>
            )}
            <button onClick={handleValider}
              disabled={isBusy || !selectedPatientObj?.id || !typeConsultation || !canValider}
              className="flex-1 py-4 bg-[#4931F7] text-white rounded-2xl font-bold text-sm shadow-lg shadow-[#4931F7]/30 hover:bg-[#3b26c6] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all">
              {isBusy ? <Loader2 size={18} className="animate-spin" /> : <Receipt size={18} />}
              Créer la facture
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

// --- BLOC PHOTOS ---
function PhotosBlock({ consultationId, initialPhotos, onPhotosChange, noHeader, photoBorderClass = "border-slate-100 dark:border-white/10" }) {
  const [photos, setPhotos] = useState(Array.isArray(initialPhotos) ? initialPhotos : []);
  const [isUploading, setIsUploading] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const onPaste = (e) => {
      if (!consultationId) return;
      const files = Array.from(e.clipboardData?.items || [])
        .filter(item => item.type.startsWith('image/'))
        .map(item => item.getAsFile())
        .filter(Boolean);
      if (files.length > 0) handleFiles(files);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [photos, consultationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const pasteFromClipboard = async () => {
    if (!navigator.clipboard?.read) return;
    try {
      const items = await navigator.clipboard.read();
      const files = [];
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            files.push(new File([blob], 'paste.png', { type }));
          }
        }
      }
      if (files.length > 0) await handleFiles(files);
    } catch {
      // Permission refusée — l'utilisateur peut utiliser Ctrl+V
    }
  };

  const compressImage = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1400;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height / width) * MAX); width = MAX; }
          else { width = Math.round((width / height) * MAX); height = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

  const save = (next) => fetch(`/api/consultations/${consultationId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photos: next }),
  });

  const handleFiles = async (files) => {
    setIsUploading(true);
    const next = [...photos];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      next.push(await compressImage(file));
    }
    setPhotos(next);
    await save(next);
    onPhotosChange?.(next);
    setIsUploading(false);
  };

  const removePhoto = async (i) => {
    const next = photos.filter((_, idx) => idx !== i);
    setPhotos(next);
    await save(next);
    onPhotosChange?.(next);
  };

  const photoGrid = (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
      {photos.map((src, i) => (
        <div key={i} onClick={() => setLightboxIdx(i)}
          className={`relative group rounded-2xl overflow-hidden border ${photoBorderClass} cursor-zoom-in`}>
          <img src={src} alt="" className="w-full h-auto block" />
          <button onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
            className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <X size={11} />
          </button>
        </div>
      ))}
      <button onClick={() => fileInputRef.current?.click()} disabled={isUploading || !consultationId}
        title={!consultationId ? "Disponible dès que le CR est prêt" : undefined}
        className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center gap-1.5 text-slate-300 dark:text-slate-600 hover:border-teal-500 hover:text-teal-500 transition-all group disabled:pointer-events-none disabled:opacity-50">
        {isUploading
          ? <Loader2 size={20} className="animate-spin text-teal-500" />
          : <><Plus size={20} className="group-hover:scale-110 transition-transform" /><span className="text-[10px] font-bold">{consultationId ? "Ajouter" : "En attente…"}</span></>}
      </button>
      <button onClick={pasteFromClipboard} disabled={isUploading || !consultationId}
        title={!consultationId ? "Disponible dès que le CR est prêt" : "Coller une image (Ctrl+V)"}
        className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 flex flex-col items-center justify-center gap-1.5 text-slate-300 dark:text-slate-600 hover:border-teal-400 hover:text-teal-400 transition-all group disabled:pointer-events-none disabled:opacity-50">
        <ClipboardPaste size={20} className="group-hover:scale-110 transition-transform" />
        <span className="text-[10px] font-bold">Coller</span>
      </button>
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => { handleFiles(e.target.files); e.target.value = ''; }} />
    </div>
  );

  return (
    <>
      {noHeader ? photoGrid : (
        <div className="w-full mb-8 text-left">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b pb-2 mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2"><Camera size={14} /> Pièces jointes</span>
            {photos.length > 0 && <span className="text-[10px] normal-case font-medium text-slate-300">{photos.length} photo{photos.length > 1 ? 's' : ''}</span>}
          </h3>
          {photoGrid}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div className="fixed inset-0 z-[300] bg-black/92 flex items-center justify-center p-4"
          onClick={() => setLightboxIdx(null)}>
          <img src={photos[lightboxIdx]} alt="" className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl" />
          <button onClick={() => setLightboxIdx(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
            <X size={20} />
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

// --- BLOC VALIDATION ---
export function ValidationBlock({ consultation, user, patientObj, onNewConsultation, renderValue, isGeneratingReport, generateStep, onGoToFacturation }) {
  const { showModal } = useCustomModal();
  const [localReportData, setLocalReportData] = useState(consultation?.reportData || {});
  const [editingKey, setEditingKey] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [isGeneratingConfrere, setIsGeneratingConfrere] = useState(false);
  const [confrereError, setConfrereError] = useState("");

  const [isGeneratingCourrier, setIsGeneratingCourrier] = useState(false);
  const [courrierError, setCourrierError] = useState("");
  const [editingCourrier, setEditingCourrier] = useState(false);
  const [courrierDraft, setCourrierDraft] = useState("");
  const [isSavingCourrier, setIsSavingCourrier] = useState(false);
  const [courrierSaved, setCourrierSaved] = useState(false);
  const [isSendingCourrier, setIsSendingCourrier] = useState(false);
  const [courrierSent, setCourrierSent] = useState(false);

  const handleGenerateCourrier = async () => {
    setIsGeneratingCourrier(true);
    setCourrierError("");
    try {
      const res = await fetch("/api/generate-courrier-adressage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationId: consultation.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur serveur");
      setLocalReportData(prev => ({ ...prev, courrier_adressage: data.courrier_adressage }));
      setEditingCourrier(false);
    } catch (e) {
      setCourrierError(e.message);
    } finally {
      setIsGeneratingCourrier(false);
    }
  };

  const handleSaveCourrier = async () => {
    setIsSavingCourrier(true);
    const updated = { ...localReportData, courrier_adressage: courrierDraft };
    try {
      await fetch(`/api/consultations/${consultation.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportData: updated }),
      });
      setLocalReportData(updated);
      setEditingCourrier(false);
      setCourrierSaved(true);
      setTimeout(() => setCourrierSaved(false), 2000);
    } catch {}
    setIsSavingCourrier(false);
  };

  const handleSendCourrier = async () => {
    const courrier = localReportData?.courrier_adressage;
    if (!courrier) return;
    const emailMedecin = await showModal({
      type: "prompt",
      title: "Envoyer au médecin",
      message: "Adresse email du médecin destinataire :",
    });
    if (!emailMedecin) return;
    const nomMedecin = await showModal({
      type: "prompt",
      title: "Nom du médecin (optionnel)",
      message: "Nom du médecin destinataire (ex : Dupont) :",
    });
    setIsSendingCourrier(true);
    try {
      const res = await fetch("/api/send-courrier-medecin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailMedecin,
          nomMedecin: nomMedecin || "",
          courrier,
          praticienPrenom: branding?.prenom || "",
          praticienNom: branding?.nom || "",
          cabinetName: branding?.cabinetName || "",
        }),
      });
      if (res.ok) {
        setCourrierSent(true);
        setTimeout(() => setCourrierSent(false), 4000);
      } else {
        const d = await res.json();
        await showModal({ type: "alert", title: "Erreur", message: d.error || "Erreur lors de l'envoi." });
      }
    } catch {
      await showModal({ type: "alert", title: "Erreur", message: "Impossible d'envoyer le courrier." });
    }
    setIsSendingCourrier(false);
  };

  const handleGenerateConfrere = async () => {
    setIsGeneratingConfrere(true);
    setConfrereError("");
    try {
      const res = await fetch("/api/generate-confrere-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationId: consultation.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur serveur");
      setLocalReportData(prev => ({ ...prev, resume_confreres: data.resume_confreres }));
    } catch (e) {
      setConfrereError(e.message);
    } finally {
      setIsGeneratingConfrere(false);
    }
  };

  const prevReportDataRef = useRef(null);
  const [animatingKeys, setAnimatingKeys] = useState(new Set());

  useEffect(() => {
    if (!consultation?.reportData || Object.keys(consultation.reportData).length === 0) return;
    const prev = prevReportDataRef.current;
    prevReportDataRef.current = consultation.reportData;
    if (!prev) {
      setLocalReportData(consultation.reportData);
      return;
    }
    const changed = new Set(
      Object.keys(consultation.reportData).filter(
        k => JSON.stringify(consultation.reportData[k]) !== JSON.stringify(prev[k])
      )
    );
    setLocalReportData(consultation.reportData);
    if (changed.size > 0) {
      setAnimatingKeys(changed);
      setTimeout(() => setAnimatingKeys(new Set()), 800);
    }
  }, [consultation?.reportData]);

  const [livePhotos, setLivePhotos] = useState(Array.isArray(consultation?.photos) ? consultation.photos : []);
  const [notes, setNotes] = useState(consultation?.notes || "");
  const notesTimerRef = useRef(null);
  const isFirstNotesRender = useRef(true);
  useEffect(() => {
    if (isFirstNotesRender.current) { isFirstNotesRender.current = false; return; }
    if (!consultation?.id) return;
    clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(() => {
      fetch(`/api/consultations/${consultation.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes }) });
    }, 800);
  }, [notes]);

  const [isSendingCR, setIsSendingCR] = useState(false);
  const [crSent, setCrSent] = useState(false);
  const [showSendPopup, setShowSendPopup] = useState(false);
  const [sendCR, setSendCR] = useState(true);
  const [sendSemelles, setSendSemelles] = useState(false);
  const sendPopupRef = useRef(null);
  const fileInputRef = useRef(null);
  const [localInstructions, setLocalInstructions] = useState((user || consultation?.praticien)?.instructionsSemelles || null);
  const [isUploadingInstructions, setIsUploadingInstructions] = useState(false);

  const parsedInstructions = (() => {
    if (!localInstructions) return null;
    try { return JSON.parse(localInstructions); } catch { return { name: 'Instructions semelles.pdf', data: localInstructions }; }
  })();

  const handleInstructionsUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingInstructions(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const fileData = JSON.stringify({ name: file.name, data: reader.result });
      try {
        await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ praticienId: branding.id, instructionsSemelles: fileData }),
        });
        setLocalInstructions(fileData);
      } catch { }
      setIsUploadingInstructions(false);
      e.target.value = '';
    };
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sendPopupRef.current && !sendPopupRef.current.contains(e.target)) setShowSendPopup(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentPatient = patientObj || consultation?.patient || {};
  const branding = user || consultation?.praticien || {};

  const handleEditClick = (key, originalValue) => {
    setEditingKey(key);
    if (Array.isArray(originalValue)) setEditValue(originalValue.join('\n'));
    else if (typeof originalValue === 'object') setEditValue(JSON.stringify(originalValue, null, 2));
    else setEditValue(String(originalValue));
  };

  const handleSaveEdit = async (key, originalValue) => {
    setIsSavingReport(true);
    let newValue = editValue;
    if (Array.isArray(originalValue)) newValue = editValue.split('\n').filter(line => line.trim() !== '');
    else if (typeof originalValue === 'object') { try { newValue = JSON.parse(editValue); } catch (e) { newValue = originalValue; } }
    const updatedReportData = { ...localReportData, [key]: newValue };
    try {
      await fetch(`/api/consultations/${consultation.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reportData: updatedReportData }) });
      setLocalReportData(updatedReportData);
      setEditingKey(null);
    } catch (error) { await showModal({ type: 'alert', title: 'Erreur', message: "Erreur lors de la sauvegarde." }); } finally { setIsSavingReport(false); }
  };

  const handleDeleteField = async (key) => {
    const confirmed = await showModal({ type: 'confirm', title: 'Supprimer cette section ?', message: `La section "${key.replace(/_/g, ' ')}" sera retirée du compte rendu. Cette action est irréversible.` });
    if (!confirmed) return;
    const updatedReportData = { ...localReportData };
    delete updatedReportData[key];
    try {
      await fetch(`/api/consultations/${consultation.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reportData: updatedReportData }) });
      setLocalReportData(updatedReportData);
    } catch { await showModal({ type: 'alert', title: 'Erreur', message: "Erreur lors de la suppression." }); }
  };


  const handleSendCR = async () => {
    let targetEmail = currentPatient?.email || currentPatient?.contactEmail;
    const emailWasMissing = !targetEmail;
    if (!targetEmail) {
      targetEmail = await showModal({ type: 'prompt', title: 'Email manquant', message: "L'email du patient n'est pas renseigné. À quelle adresse envoyer le document ?" });
      if (!targetEmail) return;
    }
    if (emailWasMissing && currentPatient?.id) {
      fetch(`/api/patients/${currentPatient.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      }).catch(() => {});
    }
    setIsSendingCR(true);
    try {
      const resolvedBranding = await resolveImages(branding);
      const blob = await blobCrPatient({ consultationId: consultation?.id, reportData: localReportData, branding: resolvedBranding, date: new Date() });
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64data = reader.result.split(',')[1];
        const res = await fetch(`/api/send-cr`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: targetEmail,
            nom: currentPatient?.nom || "Patient",
            prenom: currentPatient?.prenom || "",
            dateNaissance: currentPatient?.dateNaissance || null,
            pdfBase64: base64data,
            cabinetName: branding?.cabinetName || "Cabinet de Podologie",
            logoUrl: branding?.logo || null
          })
        });
        if (res.ok) { setCrSent(true); setTimeout(() => setCrSent(false), 4000); }
        else { await showModal({ type: 'alert', title: 'Erreur', message: "Erreur lors de l'envoi de l'email." }); }
        setIsSendingCR(false);
      };
    } catch (error) { await showModal({ type: 'alert', title: 'Erreur', message: "Impossible de préparer le PDF." }); setIsSendingCR(false); }
  };

  return (
    <div className="w-full max-w-5xl bg-white dark:bg-[#151e32] rounded-2xl p-8 md:p-12 border border-slate-200/60 dark:border-transparent flex flex-col items-center animate-in fade-in zoom-in">
      <h2 className="text-2xl font-black text-[#001F3F] dark:text-white mb-8 text-center">
        {isGeneratingReport ? "Analyse en cours…" : "Dossier validé ! 🎉"}
      </h2>

      <div className="w-full space-y-4 mb-8 text-left">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b pb-2 flex items-center justify-between">
          1. Compte Rendu Médical
          {isGeneratingReport && (
            <span className="flex items-center gap-1.5 text-[10px] font-bold normal-case tracking-normal text-slate-400 animate-pulse">
              <Loader2 size={11} className="animate-spin" />
              {generateStep === 'upload' ? 'Envoi audio…' : 'Analyse IA…'}
            </span>
          )}
        </h3>
        {(() => {
          const crEntries = localReportData
            ? Object.entries(localReportData).filter(([k]) => k !== "resume_confreres" && k !== "courrier_adressage" && localReportData[k])
            : [];

          if (isGeneratingReport && crEntries.length === 0) {
            // Pas de données preview — shimmer placeholders
            return (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="p-5 rounded-2xl border bg-slate-50 dark:bg-[#0b1121] border-slate-100 dark:border-white/5 animate-pulse">
                    <div className="h-2.5 w-28 bg-slate-200 dark:bg-white/10 rounded-full mb-4" />
                    <div className="space-y-2">
                      <div className="h-2.5 w-full bg-slate-200 dark:bg-white/10 rounded-full" />
                      <div className="h-2.5 w-4/5 bg-slate-200 dark:bg-white/10 rounded-full" />
                      <div className="h-2.5 w-3/5 bg-slate-200 dark:bg-white/10 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            );
          }

          return (
            <div className={`space-y-4 transition-opacity duration-500 ${isGeneratingReport ? 'opacity-40' : 'opacity-100'}`}>
              {crEntries.map(([key, value]) => {
                const isEditing = editingKey === key;
                const isNew = animatingKeys.has(key);
                return (
                  <div key={key} className={`p-5 rounded-2xl border relative group bg-slate-50 dark:bg-[#0b1121] border-slate-100 transition-all duration-500 ${isNew ? 'ring-2 ring-[#4931F7]/25 bg-[#4931F7]/[0.03] animate-in fade-in zoom-in-[0.98]' : ''}`}>
                    <div className="flex justify-between items-center mb-3 border-b border-[#4931F7]/10 pb-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[#4931F7]">{key.replace(/_/g, ' ')}</p>
                      {!isEditing && !isGeneratingReport && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEditClick(key, value)} className="text-slate-400 hover:text-[#4931F7]"><Edit3 size={16} /></button>
                        </div>
                      )}
                    </div>
              {isEditing ? (
                <div className="space-y-3">
                  <textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-full p-4 text-sm border-2 border-slate-200 rounded-xl focus:border-[#4931F7] min-h-[120px]" />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingKey(null)} className="p-2 text-slate-500 hover:bg-slate-200 rounded-xl"><X size={18} /></button>
                    <button onClick={() => handleSaveEdit(key, value)} disabled={isSavingReport} className="flex items-center gap-2 px-4 py-2 bg-[#4931F7] text-white rounded-xl text-xs font-bold hover:bg-[#3b26c6]">
                      {isSavingReport ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Enregistrer
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-[#001F3F] dark:text-white font-medium">{renderValue(value)}</div>
              )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-left">

          {/* Résumé confrère */}
          <div className="flex flex-col gap-3 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 bg-blue-50/60 dark:bg-blue-950/10">
            <h3 className="text-sm font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest border-b border-blue-100 dark:border-blue-900/30 pb-2 flex items-center gap-2">
              Résumé confrère
              <span className="text-[9px] font-medium normal-case text-slate-300 dark:text-slate-500">optionnel</span>
            </h3>
            {localReportData?.resume_confreres ? (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4 relative group flex-1">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Résumé destiné à un confrère</span>
                  <button
                    onClick={() => handleDeleteField("resume_confreres")}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-500 shrink-0"
                    title="Supprimer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-sm text-[#001F3F] dark:text-white font-medium leading-relaxed whitespace-pre-wrap">{localReportData.resume_confreres}</p>
              </div>
            ) : (
              <div className="flex-1 border border-dashed border-slate-200 dark:border-white/10 rounded-xl p-4 flex flex-col items-center justify-center gap-3">
                <p className="text-xs text-slate-400 font-medium text-center">Générez un résumé clinique synthétique à transmettre à un confrère.</p>
                {confrereError && <p className="text-xs text-red-500 font-medium">{confrereError}</p>}
                <button
                  onClick={handleGenerateConfrere}
                  disabled={isGeneratingConfrere}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white text-xs font-black hover:bg-blue-600 disabled:opacity-60 transition-colors shadow-sm shadow-blue-500/20"
                >
                  {isGeneratingConfrere
                    ? <><Loader2 size={13} className="animate-spin" /> Génération…</>
                    : <><FileText size={13} /> Générer</>}
                </button>
              </div>
            )}
          </div>

          {/* Courrier d'adressage */}
          <div className="flex flex-col gap-3 p-4 rounded-2xl border border-violet-100 dark:border-violet-900/30 bg-violet-50/60 dark:bg-violet-950/10">
            <h3 className="text-sm font-black text-violet-500 dark:text-violet-400 uppercase tracking-widest border-b border-violet-100 dark:border-violet-900/30 pb-2 flex items-center gap-2">
              Courrier d'adressage
              <span className="text-[9px] font-medium normal-case text-slate-300 dark:text-slate-500">optionnel</span>
            </h3>
            {localReportData?.courrier_adressage ? (
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 rounded-xl p-4 relative group flex-1">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="text-[9px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">Courrier destiné au médecin</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {!editingCourrier && (
                      <button
                        onClick={() => { setCourrierDraft(localReportData.courrier_adressage); setEditingCourrier(true); }}
                        className="text-slate-400 hover:text-[#4931F7] p-1 rounded-lg hover:bg-[#4931F7]/10 transition-colors"
                        title="Modifier"
                      >
                        <Edit3 size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteField("courrier_adressage")}
                      className="text-slate-400 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                {editingCourrier ? (
                  <div className="space-y-3">
                    <textarea
                      autoFocus
                      value={courrierDraft}
                      onChange={(e) => setCourrierDraft(e.target.value)}
                      className="w-full p-3 text-sm border-2 border-blue-200 dark:border-blue-800/40 rounded-xl focus:border-[#4931F7] focus:outline-none min-h-[220px] bg-white dark:bg-[#151e32] dark:text-white resize-none leading-relaxed"
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingCourrier(false)} className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                        Annuler
                      </button>
                      <button onClick={handleSaveCourrier} disabled={isSavingCourrier} className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-[#4931F7] text-white rounded-lg hover:bg-[#3b26c6] disabled:opacity-50 transition-colors">
                        {isSavingCourrier ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Enregistrer
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-[#001F3F] dark:text-white font-medium leading-relaxed whitespace-pre-wrap mb-4">{localReportData.courrier_adressage}</p>
                    <div className="flex items-center gap-2 pt-3 border-t border-blue-200 dark:border-blue-800/40">
                      <button
                        onClick={handleSendCourrier}
                        disabled={isSendingCourrier}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#4931F7] text-white text-xs font-black hover:bg-[#3b26c6] disabled:opacity-60 transition-colors shadow-sm shadow-[#4931F7]/20"
                      >
                        {isSendingCourrier ? <Loader2 size={12} className="animate-spin" /> : courrierSent ? <CheckCircle size={12} /> : <Mail size={12} />}
                        {courrierSent ? "Envoyé !" : "Envoyer au médecin"}
                      </button>
                      {courrierSaved && <span className="text-xs text-green-600 font-bold flex items-center gap-1"><CheckCircle size={12} /> Sauvegardé</span>}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex-1 border border-dashed border-slate-200 dark:border-white/10 rounded-xl p-4 flex flex-col items-center justify-center gap-3">
                <p className="text-xs text-slate-400 font-medium text-center">Générez un courrier d'adressage professionnel à transmettre au médecin de destination.</p>
                {courrierError && <p className="text-xs text-red-500 font-medium">{courrierError}</p>}
                <button
                  onClick={handleGenerateCourrier}
                  disabled={isGeneratingCourrier}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#4931F7] text-white text-xs font-black hover:bg-[#3b26c6] disabled:opacity-60 transition-colors shadow-sm shadow-[#4931F7]/20"
                >
                  {isGeneratingCourrier
                    ? <><Loader2 size={13} className="animate-spin" /> Génération…</>
                    : <><FileText size={13} /> Générer le courrier</>}
                </button>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-3 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/30 bg-orange-50/60 dark:bg-orange-950/10">
            <h3 className="text-sm font-black text-orange-500 dark:text-orange-400 uppercase tracking-widest border-b border-orange-100 dark:border-orange-900/30 pb-2">
              Notes
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ajouter des informations supplémentaires..."
              className="flex-1 w-full p-3 text-sm border border-orange-200 dark:border-orange-800/30 rounded-xl focus:border-orange-400 focus:outline-none min-h-[120px] bg-white dark:bg-[#0b1121] dark:text-white resize-none"
            />
          </div>

          {/* Pièces jointes */}
          <div className="flex flex-col gap-3 p-4 rounded-2xl border border-teal-100 dark:border-teal-900/30 bg-teal-50/60 dark:bg-teal-950/10">
            <h3 className="text-sm font-black text-teal-500 dark:text-teal-400 uppercase tracking-widest border-b border-teal-100 dark:border-teal-900/30 pb-2 flex items-center justify-between">
              <span className="flex items-center gap-2"><Camera size={14} /> Pièces jointes</span>
              {livePhotos.length > 0 && <span className="text-[10px] normal-case font-medium text-slate-300">{livePhotos.length} photo{livePhotos.length > 1 ? 's' : ''}</span>}
            </h3>
            <PhotosBlock
              noHeader
              photoBorderClass="border-teal-200 dark:border-teal-800/40"
              consultationId={consultation.id}
              initialPhotos={consultation.photos}
              onPhotosChange={setLivePhotos}
            />
          </div>

        </div>

      {/* ── Cartographie podologique 3D ────────────────────────────────── */}
      {FOOT_VIEWER_3D_ENABLED && consultation?.id && (
        <div className="w-full mb-8">
          <FootViewer3D
            detectedZoneIds={detectZones(extractConsultationText(consultation))}
            side={detectSide(extractConsultationText(consultation))}
          />
        </div>
      )}

      <div className="flex items-center justify-center md:justify-start gap-4 w-full mb-6">

        {/* Envoyer un document */}
        <div className="relative flex md:flex-1" ref={sendPopupRef}>
          {showSendPopup && (
            <div className="absolute top-full mt-3 left-1/2 -translate-x-1/2 w-56 bg-white dark:bg-[#151e32] rounded-2xl shadow-xl border border-slate-100 dark:border-white/10 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Sélectionner les documents</p>
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer" onClick={() => setSendCR(v => !v)}>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${sendCR ? 'bg-[#4931F7] border-[#4931F7]' : 'border-slate-300 bg-white dark:bg-white/5'}`}>
                    {sendCR && <Check size={10} className="text-white" />}
                  </div>
                  <span className="text-sm font-bold text-[#001F3F] dark:text-white">Compte-rendu</span>
                </label>
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-2.5 cursor-pointer" onClick={() => setSendSemelles(v => !v)}>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${sendSemelles ? 'bg-[#4931F7] border-[#4931F7]' : 'border-slate-300 bg-white dark:bg-white/5'}`}>
                      {sendSemelles && <Check size={10} className="text-white" />}
                    </div>
                    <span className="text-sm font-bold text-[#001F3F] dark:text-white">Instructions semelles</span>
                  </label>
                  {sendSemelles && (
                    <div className="w-full">
                      {parsedInstructions ? (
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl px-2.5 py-2">
                          <FileText size={13} className="text-red-400 shrink-0" />
                          <span className="text-[11px] font-bold text-[#001F3F] dark:text-white truncate flex-1">{parsedInstructions.name}</span>
                          <button onClick={() => fileInputRef.current?.click()} className="text-[10px] text-[#4931F7] font-bold hover:underline shrink-0 whitespace-nowrap">Remplacer</button>
                        </div>
                      ) : (
                        <button onClick={() => fileInputRef.current?.click()} disabled={isUploadingInstructions}
                          className="w-full py-2 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl text-[11px] font-bold text-slate-400 hover:border-[#4931F7] hover:text-[#4931F7] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50">
                          {isUploadingInstructions ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                          Importer le PDF
                        </button>
                      )}
                      <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleInstructionsUpload} />
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={async () => {
                  setShowSendPopup(false);
                  if (!sendCR && !sendSemelles) return;
                  let targetEmail = currentPatient?.email || currentPatient?.contactEmail;
                  const emailWasMissing = !targetEmail;
                  if (!targetEmail) {
                    targetEmail = await showModal({ type: 'prompt', title: 'Email manquant', message: "L'email du patient n'est pas renseigné. À quelle adresse envoyer le document ?" });
                    if (!targetEmail) return;
                  }
                  if (emailWasMissing && currentPatient?.id) {
                    fetch(`/api/patients/${currentPatient.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: targetEmail }) }).catch(() => {});
                  }
                  setIsSendingCR(true);
                  try {
                    const attachments = {};
                    const consultationPhotos = livePhotos;
                    const resolvedBranding = await resolveImages(branding);
                    if (sendCR) {
                      const crBlob = await blobCrPatient({ consultationId: consultation?.id, reportData: localReportData, branding: resolvedBranding, photos: consultationPhotos, date: new Date() });
                      attachments.pdfBase64 = await new Promise(res => { const r = new FileReader(); r.readAsDataURL(crBlob); r.onloadend = () => res(r.result.split(',')[1]); });
                    }
                    if (consultationPhotos.length) attachments.photos = consultationPhotos;
                    if (sendSemelles && parsedInstructions?.data) {
                      const raw = parsedInstructions.data;
                      attachments.semellePdfBase64 = raw.includes(',') ? raw.split(',')[1] : raw;
                      attachments.semelleFileName = parsedInstructions.name;
                    }
                    const res = await fetch('/api/send-cr', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: targetEmail, nom: currentPatient?.nom || "Patient", prenom: currentPatient?.prenom || "", dateNaissance: currentPatient?.dateNaissance || null, cabinetName: branding?.cabinetName || "Cabinet de Podologie", logoUrl: branding?.logo || null, praticienPrenom: branding?.prenom || "", praticienNom: branding?.nom || "", ...attachments }),
                    });
                    if (res.ok) { setCrSent(true); setTimeout(() => setCrSent(false), 4000); }
                    else { await showModal({ type: 'alert', title: 'Erreur', message: "Erreur lors de l'envoi." }); }
                  } catch { await showModal({ type: 'alert', title: 'Erreur', message: "Impossible de préparer les documents." }); }
                  setIsSendingCR(false);
                }}
                disabled={(!sendCR && !sendSemelles) || isSendingCR || (sendSemelles && !parsedInstructions)}
                className="w-full mt-4 py-2 bg-[#4931F7] text-white rounded-xl text-xs font-bold disabled:opacity-40 flex items-center justify-center gap-2 hover:bg-[#3b26c6] transition-colors"
              >
                {isSendingCR ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
                Envoyer
              </button>
            </div>
          )}
          <button
            onClick={() => setShowSendPopup(v => !v)}
            disabled={isGeneratingReport}
            className="flex-1 flex items-center justify-center px-2 md:px-4 py-3 md:py-2.5 rounded-full md:rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-white/20 transition-colors disabled:opacity-30 aspect-square md:aspect-auto gap-0 md:gap-2.5 text-[10px] md:text-sm font-bold"
          >
            {isSendingCR ? <Loader2 size={26} className="animate-spin" /> : crSent ? <CheckCircle size={26} className="text-green-500" /> : <Mail size={26} />}
            <span className="hidden md:inline whitespace-nowrap">{crSent ? "Envoyé" : "Envoyer un document"}</span>
          </button>
        </div>

        {/* Nouvelle Facture */}
        {onGoToFacturation && (
          <button
            onClick={onGoToFacturation}
            className="flex shrink-0 items-center justify-center w-12 h-12 md:flex-1 md:w-auto md:h-auto md:px-4 md:py-2.5 rounded-full md:rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-white/20 transition-colors md:gap-2.5 text-[10px] md:text-sm font-bold"
          >
            <Receipt size={26} />
            <span className="hidden md:inline whitespace-nowrap">Nouvelle facture</span>
          </button>
        )}

        {/* Nouveau patient */}
        <button
          onClick={onNewConsultation}
          className="flex shrink-0 items-center justify-center w-12 h-12 md:flex-1 md:w-auto md:h-auto md:px-4 md:py-2.5 rounded-full md:rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-white/20 transition-colors md:gap-2.5 text-[10px] md:text-sm font-bold"
        >
          <User size={26} />
          <span className="hidden md:inline whitespace-nowrap">Nouveau patient</span>
        </button>

      </div>
    </div>
  );
}

// --- COMPOSANT PRINCIPAL (HOME) ---
export default function Home({ user, recentConsultations, patients }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showModal } = useCustomModal();

  const [localPatients, setLocalPatients] = useState(patients || []);
  useEffect(() => { setLocalPatients(patients || []); }, [patients]);

  const [viewState, setViewState] = useState('recording');
  const [currentConsultation, setCurrentConsultation] = useState(null);
  const [error, setError] = useState("");
  const [consultationMode, setConsultationMode] = useState(null);
  const [showNewPatientModal, setShowNewPatientModal] = useState(false);

  // 🟢 AJOUT DE L'ADRESSE DANS L'ÉTAT INITIAL
  const [newPatientForm, setNewPatientForm] = useState({
    prenom: "", nom: "", email: "", telephone: "", adresse: ""
  });

  const [isSavingPatient, setIsSavingPatient] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedPatient, setSelectedPatient] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedConsultationId, setSelectedConsultationId] = useState(null);

  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showCRDoneNotif, setShowCRDoneNotif] = useState(false);
  const crNotifTimerRef = useRef(null);
  const [generateStep, setGenerateStep] = useState('upload'); // 'upload' | 'generate'
  const [showShortRecordingModal, setShowShortRecordingModal] = useState(false);
  const [canRetry, setCanRetry] = useState(false);
  const [uploadAttempt, setUploadAttempt] = useState(0);
  const [pendingUploads, setPendingUploads] = useState([]); // enregistrements en attente (IndexedDB)

  // Charge tous les enregistrements en attente depuis IndexedDB au montage
  useEffect(() => {
    if (!user?.id) return;
    getAllPendingAudios(user.id).then(all => { if (all.length) setPendingUploads(all); }).catch(() => {});
  }, [user?.id]);

  // Auto-retry dès que la connexion revient
  const [onlineRetryTriggered, setOnlineRetryTriggered] = useState(false);
  useEffect(() => {
    const handleOnline = () => setOnlineRetryTriggered(true);
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);
  // Cet effect utilise les valeurs fraîches (re-render) plutôt qu'une closure périmée
  useEffect(() => {
    if (!onlineRetryTriggered || pendingUploads.length === 0 || isGeneratingReport || isRecording) return;
    setOnlineRetryTriggered(false);
    const first = pendingUploads[0];
    const timer = setTimeout(() => handleRetryPending(first), 2000);
    return () => clearTimeout(timer);
  // handleRetryPending est recréé chaque render — pas besoin de le mettre en dep
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onlineRetryTriggered, pendingUploads, isGeneratingReport, isRecording]);
  const pendingAudioRef = useRef(null);
  const recoveryBlobRef = useRef(null); // blob conservé après échec réseau
  const currentGcsPathRef = useRef(null); // gcsPath de l'enregistrement en cours
  const currentRecordingKeyRef = useRef(null); // clé IndexedDB de l'enregistrement en cours
  const [linkedConsultationId, setLinkedConsultationId] = useState(null);
  const [linkedConsultationPatientId, setLinkedConsultationPatientId] = useState(null);
  const linkedConsultationTimerRef = useRef(null);
  const [sessionHasFacture, setSessionHasFacture] = useState(false);
  const [sessionHasPedicurieSoin, setSessionHasPedicurieSoin] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const pendingActionRef = useRef(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const actionOnStopRef    = useRef("process"); // "process" | "confirm"
  const recordingDurationRef = useRef(0);

  // Live consultation state
  const [liveTranscript, setLiveTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [liveReport, setLiveReport] = useState(null);
  const [isGeneratingLiveCR, setIsGeneratingLiveCR] = useState(false);
  const [isFinalizingLive, setIsFinalizingLive] = useState(false);
  const [showLiveConsultationView, setShowLiveConsultationView] = useState(false);
  const [assistantQuestions, setAssistantQuestions] = useState([]);
  const [isLoadingAssistant, setIsLoadingAssistant] = useState(false);
  const speechRecRef = useRef(null);
  const lastCRWordCountRef = useRef(0);
  const liveCRDebounceRef = useRef(null);
  const isGeneratingLiveCRRef = useRef(false);
  const finalizingFromLiveRef = useRef(false);
  const liveDraftIdRef = useRef(null);
  const liveTranscriptRef = useRef("");
  const [speechApiActive, setSpeechApiActive] = useState(false);
  const [recoveredTranscript, setRecoveredTranscript] = useState(null);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const generateLiveCR = async (transcript) => {
    if (!transcript?.trim() || isGeneratingLiveCRRef.current) return;
    isGeneratingLiveCRRef.current = true;
    setIsGeneratingLiveCR(true);
    try {
      const res = await fetch("/api/generate-live-cr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const data = await res.json();
      if (data.reportData && Object.keys(data.reportData).length > 0) {
        setLiveReport(data.reportData);
        fetchAssistantQuestions(transcript, data.reportData);
        // Auto-save live CR so the patient record is safe even if finalization fails
        try {
          if (liveDraftIdRef.current) {
            fetch(`/api/consultations/${liveDraftIdRef.current}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reportData: data.reportData, transcription: transcript }),
            }).catch(() => {});
          } else {
            // Await the initial save so currentConsultation is set before doFinalize runs
            const saveRes = await fetch("/api/save-live-cr", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ patientId: selectedPatient, reportData: data.reportData, transcription: transcript }),
            });
            const saved = await saveRes.json();
            if (saved.success && saved.data?.id) {
              liveDraftIdRef.current = saved.data.id;
              setCurrentConsultation(saved.data);
            }
          }
        } catch { }
      }
    } catch {
      // Ignore network errors during live generation
    } finally {
      isGeneratingLiveCRRef.current = false;
      setIsGeneratingLiveCR(false);
    }
  };

  // Activé par défaut pour tous — le flag features sert désormais à désactiver au cas par cas.
  const assistantEnabled = !Array.isArray(user?.features) || !user.features.includes("live_assistant_disabled");

  const fetchAssistantQuestions = async (transcript, reportData) => {
    if (!assistantEnabled || !transcript?.trim()) return;
    setIsLoadingAssistant(true);
    try {
      const res = await fetch("/api/live-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, reportData }),
      });
      const data = await res.json();
      if (Array.isArray(data.questions)) setAssistantQuestions(data.questions);
    } catch {
      // Ignore — assistant is non-blocking
    } finally {
      setIsLoadingAssistant(false);
    }
  };

  // Auto-trigger live CR every ~40 new words
  useEffect(() => {
    if (!isRecording || consultationMode !== "podologie" || !liveTranscript) return;
    const wordCount = liveTranscript.trim().split(/\s+/).length;
    const newWords = wordCount - lastCRWordCountRef.current;
    if (newWords < 20) return;
    clearTimeout(liveCRDebounceRef.current);
    liveCRDebounceRef.current = setTimeout(() => {
      lastCRWordCountRef.current = wordCount;
      generateLiveCR(liveTranscript);
    }, 800);
    return () => clearTimeout(liveCRDebounceRef.current);
  }, [liveTranscript, isRecording, consultationMode]);

  // localStorage key for live transcript recovery (per user)
  const liveStorageKey = user?.id ? `kemer_live_${user.id}` : null;

  // On mount: check for a transcript saved from a previous crashed session
  useEffect(() => {
    if (!liveStorageKey) return;
    try {
      const raw = localStorage.getItem(liveStorageKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      const age = Date.now() - (saved.timestamp || 0);
      if (age < 12 * 3600 * 1000 && saved.transcript?.trim()) {
        setRecoveredTranscript(saved);
      } else {
        localStorage.removeItem(liveStorageKey);
      }
    } catch { }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save transcript to localStorage every 10s during live recording
  useEffect(() => {
    if (!isRecording || !showLiveConsultationView || !liveStorageKey) return;
    const timer = setInterval(() => {
      if (liveTranscriptRef.current.trim()) {
        try {
          localStorage.setItem(liveStorageKey, JSON.stringify({
            transcript: liveTranscriptRef.current,
            patientId: selectedPatient,
            timestamp: Date.now(),
          }));
        } catch { }
      }
    }, 10000);
    return () => clearInterval(timer);
  }, [isRecording, showLiveConsultationView, selectedPatient]);

  // Relance le dessin de la waveform sur le canvas de LiveConsultationView
  // après que React l'a monté (drawWaveform est appelé avant le commit du DOM)
  useEffect(() => {
    if (showLiveConsultationView && isRecording && analyserRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      drawWaveform();
    }
  }, [showLiveConsultationView]);

  const handleSavePatient = async (e) => {
    e.preventDefault();
    setIsSavingPatient(true);
    const prenomSaisi = newPatientForm.prenom;
    const nomSaisi = newPatientForm.nom;
    try {
      const res = await fetch('/api/patients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newPatientForm) });
      if (res.ok) {
        const newP = await res.json();
        const createdPatient = newP.patient;
        setLocalPatients(prev => [createdPatient, ...prev]);
        setShowNewPatientModal(false);
        setSearchTerm(`${prenomSaisi} ${nomSaisi}`);
        setSelectedPatient(String(createdPatient.id));

        // 🟢 RESET AVEC L'ADRESSE
        setNewPatientForm({ prenom: "", nom: "", email: "", telephone: "", adresse: "" });
        router.refresh();
      } else { await showModal({ type: 'alert', title: 'Erreur', message: "Erreur lors de la création du patient." }); }
    } catch (error) { await showModal({ type: 'alert', title: 'Erreur serveur', message: "Une erreur serveur est survenue." }); }
    setIsSavingPatient(false);
  };

  const drawWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserRef.current) return;
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, width, height);
      const numberOfBars = 32; const barGap = 2; const barWidth = (width - ((numberOfBars - 1) * barGap)) / numberOfBars;
      const usefulLength = Math.floor(bufferLength / 3);
      let globalSum = 0; for (let i = 0; i < usefulLength; i++) globalSum += dataArray[i];
      const globalAverage = globalSum / usefulLength;
      for (let i = 0; i < numberOfBars; i++) {
        const dataIndex = Math.floor(i * (usefulLength / numberOfBars)); 
        let val = dataArray[dataIndex]; val = Math.min(255, (val * 0.8) + (globalAverage * 0.05));
        const barHeight = Math.max(2, (val / 255) * height);
        const x = i * (barWidth + barGap); const y = (height - barHeight) / 2; 
        ctx.fillStyle = '#4931F7'; ctx.beginPath(); ctx.roundRect(x, y, barWidth, barHeight, 4); ctx.fill();
      }
    }; draw();
  };

  const startRecording = async (deviceId = null) => {
    if (!selectedPatient) { setError("Veuillez sélectionner un patient."); return; }
    try {
      setError("");
      const audioConstraint = deviceId ? { deviceId: { exact: deviceId } } : true;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraint });
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioCtx.createAnalyser(); const source = audioCtx.createMediaStreamSource(stream); source.connect(analyser);
      analyser.fftSize = 128; analyser.smoothingTimeConstant = 0.7; 
      audioContextRef.current = audioCtx; analyserRef.current = analyser;
      const MIME_CANDIDATES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
      const detectedMime = MIME_CANDIDATES.find(t => MediaRecorder.isTypeSupported(t));
      const mediaRecorder = new MediaRecorder(stream, detectedMime ? { mimeType: detectedMime } : undefined); mediaRecorderRef.current = mediaRecorder; audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        const actualMime = sanitizeMimeType(mediaRecorder.mimeType || detectedMime);
        const audioBlob = new Blob(audioChunksRef.current, { type: actualMime });
        const action = actionOnStopRef.current;
        actionOnStopRef.current = "process";
        if (action === "confirm") {
          pendingAudioRef.current = audioBlob;
          setViewState("recording");
          setShowShortRecordingModal(true);
        } else if (action === "skip") {
          // Live mode finalization — generateLiveCR already triggered in stopRecording
        } else {
          // En mode live, on passe le brouillon existant pour un update-in-place (évite les doublons)
          const draftId = finalizingFromLiveRef.current ? liveDraftIdRef.current : null;
          await processAudio(audioBlob, 1, null, null, draftId);
        }
      };
      mediaRecorder.start(); setIsRecording(true); setIsPaused(false); setRecordingTime(0);
      timerIntervalRef.current = setInterval(() => setRecordingTime((prev) => prev + 1), 1000);
      drawWaveform();

      // Reset live consultation state
      setLiveTranscript("");
      setInterimTranscript("");
      setLiveReport(null);
      setIsFinalizingLive(false);
      setShowLiveConsultationView(true);
      setAssistantQuestions([]);
      finalizingFromLiveRef.current = false;
      liveDraftIdRef.current = null;
      lastCRWordCountRef.current = 0;

      // Start Web Speech API for live transcription (podologie only)
      if (consultationMode === "podologie") {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SR) {
          const rec = new SR();
          rec.lang = "fr-FR";
          rec.continuous = true;
          rec.interimResults = true;
          rec.onresult = (e) => {
            let finalText = "";
            let interimText = "";
            for (let i = e.resultIndex; i < e.results.length; i++) {
              const t = e.results[i][0].transcript;
              if (e.results[i].isFinal) finalText += t + " ";
              else interimText += t;
            }
            if (finalText) setLiveTranscript((prev) => {
              const next = (prev + finalText).trimStart();
              liveTranscriptRef.current = next;
              return next;
            });
            setInterimTranscript(interimText);
          };
          const PERMANENT_ERRORS = new Set(["not-allowed", "audio-capture", "service-not-allowed"]);
          const attachHandlers = (recognition) => {
            recognition.onresult = (e) => {
              let finalText = "";
              let interimText = "";
              for (let i = e.resultIndex; i < e.results.length; i++) {
                const t = e.results[i][0].transcript;
                if (e.results[i].isFinal) finalText += t + " ";
                else interimText += t;
              }
              if (finalText) setLiveTranscript((prev) => {
                const next = (prev + finalText).trimStart();
                liveTranscriptRef.current = next;
                return next;
              });
              setInterimTranscript(interimText);
            };
            recognition.onstart = () => setSpeechApiActive(true);
            recognition.onend = () => {
              setSpeechApiActive(false);
              if (speechRecRef.current !== null) {
                // Create a fresh instance to restart — avoids Chrome InvalidStateError on reuse
                setTimeout(() => {
                  if (speechRecRef.current !== null) {
                    const SR2 = window.SpeechRecognition || window.webkitSpeechRecognition;
                    const newRec = new SR2();
                    newRec.lang = "fr-FR";
                    newRec.continuous = true;
                    newRec.interimResults = true;
                    attachHandlers(newRec);
                    speechRecRef.current = newRec;
                    try { newRec.start(); } catch { speechRecRef.current = null; }
                  }
                }, 150);
              }
            };
            recognition.onerror = (e) => {
              if (PERMANENT_ERRORS.has(e.error)) {
                speechRecRef.current = null;
              }
            };
          };
          attachHandlers(rec);
          speechRecRef.current = rec;
          try { rec.start(); } catch { }
        }
      }
    } catch (err) { setError("Accès au microphone refusé."); }
  };

  const stopRecording = () => {
    if (speechRecRef.current) {
      const rec = speechRecRef.current;
      speechRecRef.current = null;
      try { rec.stop(); } catch { }
    }
    setSpeechApiActive(false);
    setInterimTranscript("");
    clearTimeout(liveCRDebounceRef.current);
    recordingDurationRef.current = recordingTime;

    if (finalizingFromLiveRef.current && recordingTime >= 15) {
      // Live mode finalization: process the full audio via Gemini for a complete CR.
      // The live transcript is only a partial preview — full audio analysis gives all sections.
      actionOnStopRef.current = "process";
      if (liveStorageKey) { try { localStorage.removeItem(liveStorageKey); } catch { } }
      setIsFinalizingLive(false);
      setShowLiveConsultationView(false);
      setCurrentConsultation(prev => prev ?? { patient: currentSelectedPatientObj });
      setIsGeneratingReport(true);
      setViewState('validated');
    } else {
      actionOnStopRef.current = recordingTime < 15 ? "confirm" : "process";
      if (recordingTime >= 15) {
        setCurrentConsultation({ patient: currentSelectedPatientObj });
        setIsGeneratingReport(true);
        setViewState('validated');
      }
    }

    if (mediaRecorderRef.current) { mediaRecorderRef.current.stop(); mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop()); }
    if (audioContextRef.current) audioContextRef.current.close();
    clearInterval(timerIntervalRef.current); cancelAnimationFrame(animationFrameRef.current);
    setIsRecording(false);
    setIsPaused(false);
  };

  const pauseRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') return;
    mediaRecorderRef.current.pause();
    clearInterval(timerIntervalRef.current);
    cancelAnimationFrame(animationFrameRef.current);
    setIsPaused(true);
  };

  const resumeRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'paused') return;
    mediaRecorderRef.current.resume();
    timerIntervalRef.current = setInterval(() => setRecordingTime((prev) => prev + 1), 1000);
    drawWaveform();
    setIsPaused(false);
  };

  const MAX_UPLOAD_ATTEMPTS = 5;

  // Timeout d'upload adaptatif : un fichier plus gros a besoin de plus de temps,
  // un timeout fixe pénalisait les enregistrements longs sur connexion lente.
  // Base 3 min + 2 min par 5 Mo, plafonné à 25 min.
  const computeUploadTimeoutMs = (sizeBytes) => {
    const BASE_MS = 3 * 60 * 1000;
    const PER_5MB_MS = 2 * 60 * 1000;
    const MAX_MS = 25 * 60 * 1000;
    const sizeMB = (sizeBytes || 0) / (1024 * 1024);
    return Math.min(MAX_MS, BASE_MS + (sizeMB / 5) * PER_5MB_MS);
  };

  /**
   * Traitement audio en 2 étapes indépendantes :
   *   1. Upload du blob → GCS via /api/audio-upload (streaming direct vers Cloud Run)
   *   2. Génération du CR → /api/generate-report avec { gcsPath } (petit JSON)
   *
   * Si l'étape 1 réussit, les retries suivants sautent l'upload et réessaient
   * uniquement l'étape 2. L'audio est en sécurité sur GCS même si Gemini échoue.
   *
   * @param {Blob|null} audioBlob - null si on repart d'un gcsPath déjà connu
   * @param {number} attempt
   * @param {string|null} existingGcsPath - fourni lors d'un retry depuis IndexedDB
   * @param {string|null} patientIdOverride - évite la closure périmée lors des retries post-reload
   */
  const processAudio = async (audioBlob, attempt = 1, existingGcsPath = null, patientIdOverride = null, existingConsultationId = null) => {
    if (audioBlob) recoveryBlobRef.current = audioBlob;
    if (attempt === 1) {
      currentGcsPathRef.current = existingGcsPath;
      currentRecordingKeyRef.current = user?.id ? `${user.id}_${Date.now()}` : null;
      setGenerateStep(existingGcsPath ? 'generate' : 'upload');
    }
    if (attempt > 1) setUploadAttempt(attempt);
    const effectivePatientId = patientIdOverride ?? selectedPatient;
    // Filet de sécurité supplémentaire : même si le blob vient d'IndexedDB
    // (audio en attente rechargé après une session précédente), on repart
    // d'une valeur de Content-Type toujours valide comme en-tête HTTP.
    const safeMimeType = audioBlob ? sanitizeMimeType(audioBlob.type) : "audio/webm";

    try {
      // ── Étape 1 : Upload audio → GCS (sautée si déjà uploadé) ──
      if (!currentGcsPathRef.current) {
        setGenerateStep('upload');
        // Priorité : signed URL → browser PUT directement vers GCS
        // Fallback  : proxy streaming Cloud Run si la génération de signed URL échoue
        let gcsPath = null;

        try {
          // 1a. Obtenir une signed URL (requête vers Cloud Run)
          const urlRes = await fetch("/api/audio-upload-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mimeType: safeMimeType }),
          });
          if (!urlRes.ok) throw new Error(`signed-url ${urlRes.status}`);
          const { uploadUrl, gcsPath: path } = await urlRes.json();

          // 1b. PUT directement vers GCS — Cloud Run n'est plus dans la boucle pour le binaire
          const putController = new AbortController();
          const putTimeout = setTimeout(() => putController.abort(), computeUploadTimeoutMs(audioBlob.size));
          try {
            const putRes = await fetch(uploadUrl, {
              method: "PUT",
              headers: { "Content-Type": safeMimeType },
              body: audioBlob,
              signal: putController.signal,
            });
            if (!putRes.ok) throw new Error(`GCS PUT ${putRes.status}`);
          } finally {
            clearTimeout(putTimeout);
          }
          gcsPath = path;
        } catch (signedErr) {
          // Fallback : proxy streaming via Cloud Run
          // Nettoyé pour rester une valeur d'en-tête HTTP valide (même raison
          // que safeMimeType ci-dessus) — un message d'erreur imbriqué pourrait
          // contenir des guillemets ou caractères de contrôle.
          const _signedErrMsg = (signedErr?.message || "signed-url-unknown").replace(/["\r\n]/g, "");
          const uploadController = new AbortController();
          const uploadTimeout = setTimeout(() => uploadController.abort(), computeUploadTimeoutMs(audioBlob.size));
          try {
            const uploadRes = await fetch("/api/audio-upload", {
              method: "POST",
              headers: { "Content-Type": safeMimeType, "x-upload-fallback-reason": _signedErrMsg.slice(0, 100) },
              body: audioBlob,
              signal: uploadController.signal,
            });
            if (!uploadRes.ok) throw new Error(`proxy-upload ${uploadRes.status} (après ${_signedErrMsg})`);
            const data = await uploadRes.json();
            gcsPath = data.gcsPath;
          } finally {
            clearTimeout(uploadTimeout);
          }
        }

        currentGcsPathRef.current = gcsPath;
      }

      // Audio en sécurité sur GCS → basculer l'indicateur visuel
      setGenerateStep('generate');

      // ── Étape 2 : Génération du CR (petit JSON, pas de binaire) ──
      // Si l'audio est déjà sur GCS, on limite les retries automatiques (2 max) :
      // l'audio est sauvegardé, l'admin peut régénérer depuis le dashboard.
      const audioAlreadySafe = !!currentGcsPathRef.current;
      const maxGenRetries = audioAlreadySafe ? 2 : MAX_UPLOAD_ATTEMPTS;

      // Doit rester au-dessus de REQUEST_DEADLINE_MS (570s) côté /api/generate-report,
      // sinon le client abandonne avant que le serveur ait fini (et incite à un retry inutile).
      const genController = new AbortController();
      const genTimeout = setTimeout(() => genController.abort(), 10 * 60 * 1000);
      let response;
      try {
        response = await fetch("/api/generate-report/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gcsPath: currentGcsPathRef.current,
            patientId: effectivePatientId,
            consultationMode: consultationMode || "podologie",
            dureeEnregistrement: recordingDurationRef.current,
            ...(existingConsultationId && { existingConsultationId }),
          }),
          signal: genController.signal,
        });
      } finally {
        clearTimeout(genTimeout);
      }
      const result = await response.json();

      if (result.success) {
        setCurrentConsultation(result.data);
        setLinkedConsultationId(result.data.id);
        setLinkedConsultationPatientId(String(selectedPatient));
        setSessionHasFacture(false);
        clearTimeout(linkedConsultationTimerRef.current);
        linkedConsultationTimerRef.current = setTimeout(() => {
          setLinkedConsultationId(null);
          setLinkedConsultationPatientId(null);
        }, 5 * 60 * 1000);

        if (finalizingFromLiveRef.current) {
          // Le brouillon live a été mis à jour côté serveur (update-in-place) — pas de DELETE nécessaire
          liveDraftIdRef.current = null;
          finalizingFromLiveRef.current = false;
          setIsFinalizingLive(false);
          if (result.data?.reportData) setLiveReport(result.data.reportData);
        }
        setIsGeneratingReport(false);
        if (!result.isEmpty) {
          clearTimeout(crNotifTimerRef.current);
          setShowCRDoneNotif(true);
          crNotifTimerRef.current = setTimeout(() => setShowCRDoneNotif(false), 6000);
        }

        if (result.isEmpty) {
          setError("Audio inaudible ou vide — aucun compte rendu n'a pu être généré. Vérifiez le micro et réenregistrez.");
        }
        recoveryBlobRef.current = null;
        currentGcsPathRef.current = null;
        setCanRetry(false);
        setUploadAttempt(0);
        if (currentRecordingKeyRef.current) {
          deletePendingAudioByKey(currentRecordingKeyRef.current).catch(() => {});
          setPendingUploads(prev => prev.filter(p => p.key !== currentRecordingKeyRef.current));
          currentRecordingKeyRef.current = null;
        }
      } else {
        // Erreur serveur 5xx → retry automatique (limité si audio déjà sur GCS)
        if (response.status >= 500 && attempt < maxGenRetries) {
          await new Promise(r => setTimeout(r, Math.min(3000 * attempt, 24000)));
          return processAudio(audioBlob, attempt + 1, null, patientIdOverride, existingConsultationId);
        }
        if (finalizingFromLiveRef.current) {
          finalizingFromLiveRef.current = false;
          setIsFinalizingLive(false);
          // Re-fetch depuis la DB : le CR complet a peut-être été sauvé avant l'erreur
          const draftId = liveDraftIdRef.current;
          if (draftId) {
            fetch(`/api/consultations/${draftId}`).then(r => r.ok ? r.json() : null).then(data => {
              if (data?.reportData && Object.keys(data.reportData).length > 0) {
                setCurrentConsultation(data);
              }
              setIsGeneratingReport(false);
            }).catch(() => setIsGeneratingReport(false));
          } else {
            setIsGeneratingReport(false);
          }
        } else {
          setIsGeneratingReport(false);
          setViewState('recording');
        }
        setError(result.error || "Erreur lors de la génération.");
        setCanRetry(true);
        setUploadAttempt(attempt);
      }
    } catch (uploadErr) {
      // Erreur réseau / timeout
      const audioAlreadySafe = !!currentGcsPathRef.current;
      const maxRetries = audioAlreadySafe ? 2 : MAX_UPLOAD_ATTEMPTS;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, Math.min(3000 * attempt, 24000)));
        return processAudio(audioBlob, attempt + 1, null, patientIdOverride, existingConsultationId);
      }
      if (finalizingFromLiveRef.current) {
        finalizingFromLiveRef.current = false;
        setIsFinalizingLive(false);
        // Re-fetch depuis la DB : le CR complet a peut-être été sauvé avant la coupure réseau
        const draftId = liveDraftIdRef.current;
        if (draftId) {
          fetch(`/api/consultations/${draftId}`).then(r => r.ok ? r.json() : null).then(data => {
            if (data?.reportData && Object.keys(data.reportData).length > 0) {
              setCurrentConsultation(data);
            }
            setIsGeneratingReport(false);
          }).catch(() => setIsGeneratingReport(false));
        } else {
          setIsGeneratingReport(false);
        }
      } else {
        setIsGeneratingReport(false);
        setGenerateStep('upload');
        setViewState('recording');
      }
      const audioSafeOnGcs = !!currentGcsPathRef.current;
      setError(audioSafeOnGcs
        ? "L'analyse a échoué — votre audio est sauvegardé. Réessayez dans quelques minutes ou contactez le support."
        : "Connexion interrompue — l'enregistrement est conservé. Cliquez Réessayer dès que le réseau est rétabli."
      );
      setCanRetry(true);
      setUploadAttempt(attempt);

      // Persister dans IndexedDB pour survie après rechargement
      const currentPatientObj = localPatients.find(p => String(p.id) === String(selectedPatient));
      const patientName = currentPatientObj ? `${currentPatientObj.prenom} ${currentPatientObj.nom}` : "Patient";
      const ts = Date.now();
      const key = currentRecordingKeyRef.current || (user?.id ? `${user.id}_${ts}` : null);

      if (user?.id && key) {
        const pendingData = {
          // Si l'upload GCS a réussi, on ne stocke que le chemin (pas le blob)
          blob: currentGcsPathRef.current ? null : (audioBlob ?? null),
          mimeType: audioBlob?.type ?? null,
          gcsPath: currentGcsPathRef.current ?? null,
          patientId: selectedPatient,
          patientName,
          timestamp: ts,
        };
        savePendingAudio(user.id, { ...pendingData, timestamp: parseInt(key.split("_")[1]) || ts })
          .then(() => setPendingUploads(prev => {
            const alreadyExists = prev.some(p => p.key === key);
            return alreadyExists ? prev : [{ ...pendingData, key }, ...prev];
          }))
          .catch(() => {});
      }

      // Si hors-ligne : télécharger le fichier audio sur le PC
      if (!navigator.onLine && audioBlob) {
        const ext = audioBlob.type.includes('mp4') ? 'mp4' : audioBlob.type.includes('ogg') ? 'ogg' : 'webm';
        const safeName = currentPatientObj ? `${currentPatientObj.prenom}_${currentPatientObj.nom}` : "patient";
        const dateStr = new Date().toISOString().slice(0, 10);
        const url = URL.createObjectURL(audioBlob);
        const a = document.createElement("a");
        a.href = url; a.download = `consultation_${safeName}_${dateStr}.${ext}`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setError("Pas de connexion — l'enregistrement a été téléchargé sur votre PC. Reconnectez-vous puis utilisez le bouton \"Recharger le CR\" pour l'importer.");
      }

      // Reporter l'échec au serveur pour le dashboard admin
      fetch("/api/report-failed-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient,
          errorMessage: `Connexion interrompue après ${MAX_UPLOAD_ATTEMPTS} tentatives${uploadErr?.message ? ` — ${uploadErr.message}` : ""}`,
          attempt,
          audioSizeKb: audioBlob ? Math.round(audioBlob.size / 1024) : null,
          gcsUploadSuccess: !!currentGcsPathRef.current,
        }),
      }).catch(() => {});
    }
  };

  const handleRetry = () => {
    if (!recoveryBlobRef.current) return;
    // Conserver le gcsPath si l'upload avait réussi avant l'échec de génération
    const existingGcsPath = currentGcsPathRef.current;
    setError("");
    setCanRetry(false);
    setUploadAttempt(1);
    setCurrentConsultation({ patient: currentSelectedPatientObj });
    setIsGeneratingReport(true);
    setViewState('validated');
    processAudio(recoveryBlobRef.current, 1, existingGcsPath);
  };

  const resetPage = () => {
    clearTimeout(linkedConsultationTimerRef.current);
    setLinkedConsultationId(null);
    setLinkedConsultationPatientId(null);
    recoveryBlobRef.current = null;
    setCanRetry(false);
    setUploadAttempt(0);
    setViewState('recording'); setCurrentConsultation(null); setError(""); setRecordingTime(0);
    setSelectedPatient(""); setSearchTerm(""); setConsultationMode(null); setIsGeneratingReport(false);
    setSessionHasFacture(false); setSessionHasPedicurieSoin(false);
    setLiveTranscript(""); setLiveReport(null); setInterimTranscript("");
    setIsFinalizingLive(false); setShowLiveConsultationView(false);
    setAssistantQuestions([]); setIsLoadingAssistant(false); setSpeechApiActive(false);
    finalizingFromLiveRef.current = false;
    liveDraftIdRef.current = null;
    liveTranscriptRef.current = "";
    lastCRWordCountRef.current = 0;
    if (liveStorageKey) { try { localStorage.removeItem(liveStorageKey); } catch { } }
    router.refresh();
  };

  const goToFacturation = () => {
    setViewState('recording');
    setCurrentConsultation(null);
    setIsGeneratingReport(false);
    setConsultationMode('facturation');
  };

  const goToOrdonnance = () => {
    setViewState('recording');
    setCurrentConsultation(null);
    setIsGeneratingReport(false);
    setConsultationMode('ordonnance');
  };

  const handleFacturationSaved = (consultationId, patientId) => {
    clearTimeout(linkedConsultationTimerRef.current);
    setLinkedConsultationId(consultationId);
    setLinkedConsultationPatientId(patientId);
    setSessionHasFacture(true);
    linkedConsultationTimerRef.current = setTimeout(() => {
      setLinkedConsultationId(null);
      setLinkedConsultationPatientId(null);
    }, 5 * 60 * 1000);
  };

  // Warn before page close if recording is active or a consultation was done but not invoiced
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isRecording || (selectedPatient && linkedConsultationId && !sessionHasFacture)) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRecording, selectedPatient, linkedConsultationId, sessionHasFacture]);

  const showPaymentModalGuard = (onAfter) => {
    pendingActionRef.current = onAfter;
    setShowPaymentModal(true);
  };

  // Guard patient changes: show payment modal when needed
  const handlePatientChange = (newId) => {
    const needsModal = selectedPatient && linkedConsultationId && !sessionHasFacture;
    if (needsModal && newId === "") {
      showPaymentModalGuard(() => {
        setSelectedPatient("");
        setSearchTerm("");
        setSessionHasFacture(false);
      });
    } else {
      setSelectedPatient(newId ? String(newId) : "");
      if (!newId) setSearchTerm("");
      setSessionHasFacture(false);
    }
  };

  // Guard "Nouveau patient" buttons that call resetPage
  const handleNewPatient = () => {
    const needsModal = (linkedConsultationId || sessionHasPedicurieSoin) && !sessionHasFacture;
    if (needsModal) {
      showPaymentModalGuard(() => resetPage());
    } else {
      resetPage();
    }
  };

  const executePaymentAction = () => {
    setShowPaymentModal(false);
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    action?.();
  };

  const handlePaymentConfirm = async ({ montant, modePaiement }) => {
    try {
      await fetch("/api/consultation/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: selectedPatient, montant, modePaiement }),
      });
    } catch {
      // Fail silently — don't block the patient change
    }
    executePaymentAction();
  };

  const handlePaymentSkip = () => executePaymentAction();

  const renderValue = (val) => {
    if (val === null || val === undefined) return "Non précisé";
    if (Array.isArray(val)) return <ul className="list-disc ml-4 space-y-1">{val.map((item, i) => <li key={i}>{typeof item === 'object' ? renderValue(item) : String(item)}</li>)}</ul>;
    if (typeof val === 'object') return <div className="space-y-2">{Object.entries(val).map(([subKey, subVal]) => (<div key={subKey} className="flex flex-col"><span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{subKey.replace(/_/g, ' ')}</span><div className="text-sm">{renderValue(subVal)}</div></div>))}</div>;
    return String(val);
  };

  // Import d'un fichier audio sauvegardé (mode hors-ligne ou récupération manuelle)
  const handleImportAudio = (file) => {
    if (!file || !selectedPatient) return;
    const blob = new Blob([file], { type: file.type || "audio/webm" });
    recoveryBlobRef.current = blob;
    setError("");
    setCanRetry(false);
    setCurrentConsultation({ patient: currentSelectedPatientObj });
    setIsGeneratingReport(true);
    setViewState('validated');
    processAudio(blob, 1);
  };

  // Renvoi d'un audio persisté dans IndexedDB après rechargement de page
  const handleRetryPending = (pending) => {
    setPendingUploads(prev => prev.filter(p => p.key !== pending.key));
    deletePendingAudioByKey(pending.key).catch(() => {});
    setSelectedPatient(String(pending.patientId));
    setSearchTerm(pending.patientName);
    setError("");
    setCurrentConsultation({ patient: { id: pending.patientId } });
    setIsGeneratingReport(true);
    setViewState('validated');

    if (pending.gcsPath) {
      // Audio déjà sur GCS : on saute l'étape d'upload
      recoveryBlobRef.current = null;
      processAudio(null, 1, pending.gcsPath, String(pending.patientId));
    } else {
      const blob = new Blob([pending.blob], { type: pending.mimeType });
      recoveryBlobRef.current = blob;
      processAudio(blob, 1, null, String(pending.patientId));
    }
  };

  const handleDismissPending = (pending) => {
    setPendingUploads(prev => prev.filter(p => p.key !== pending.key));
    deletePendingAudioByKey(pending.key).catch(() => {});
  };

  // Retry depuis la page /recuperation via ?retry=<key>
  useEffect(() => {
    const retryKey = searchParams.get("retry");
    if (!retryKey || pendingUploads.length === 0 || isRecording || isGeneratingReport) return;
    const item = pendingUploads.find(p => p.key === retryKey);
    if (!item) return;
    router.replace("/"); // nettoie le param de l'URL
    handleRetryPending(item);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, pendingUploads]);

  // Objet complet du patient actuellement sélectionné
  const currentSelectedPatientObj = localPatients.find(p => String(p.id) === String(selectedPatient)) || currentConsultation?.patient || {};

  return (
    <main className="min-h-[calc(100vh-5rem)] flex flex-col items-center p-6 bg-slate-50/50 dark:bg-[#0b1121] transition-colors duration-300 pb-24 md:pb-6 relative">
      <WelcomeHeader user={user} />

      {/* ── Qualité connexion ── */}
      <div className="w-full max-w-5xl mb-3 flex flex-col gap-2 items-start">
        <ConnectionQuality />
      </div>

      {/* ── Bannières enregistrements en attente (survie page refresh) ── */}
      {pendingUploads.map(pending => (
        <div key={pending.key} className="w-full max-w-5xl mb-2 flex items-center gap-3 px-5 py-3.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
            <Mic size={15} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-amber-700 dark:text-amber-400">Enregistrement non envoyé</p>
            <p className="text-xs text-amber-600/80 dark:text-amber-400/70 truncate">
              {pending.patientName} · {new Date(pending.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <button
            onClick={() => handleRetryPending(pending)}
            disabled={isRecording || isGeneratingReport}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition-colors disabled:opacity-50"
          >
            <RotateCcw size={13} /> Renvoyer
          </button>
          <button onClick={() => handleDismissPending(pending)} className="p-1.5 text-amber-400 hover:text-amber-600 transition-colors">
            <X size={14} />
          </button>
        </div>
      ))}

      <PatientSelector
        patients={localPatients}
        selectedPatient={selectedPatient}
        onPatientChange={handlePatientChange}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        disabled={isRecording}
        setShowNewPatientModal={setShowNewPatientModal}
      />

      {/* Blocs toujours montés → état préservé au changement de mode */}
      {selectedPatient ? (
        <>
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6 w-full max-w-5xl">
            <button
              onClick={() => { setConsultationMode('podologie'); setViewState(currentConsultation ? 'validated' : 'recording'); }}
              disabled={isRecording}
              className={`px-5 py-2.5 rounded-[2rem] text-sm font-extrabold transition-all flex items-center gap-2 disabled:opacity-50 ${consultationMode === 'podologie' ? 'bg-[#4ECDC4] text-white dark:text-[#0b1121] shadow-lg shadow-[#4ECDC4]/25' : 'bg-slate-200 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-white/10'}`}
            >
              <Footprints size={16} /> Podologie
            </button>
            <button
              onClick={() => { setConsultationMode('pedicurie'); setViewState('recording'); }}
              disabled={isRecording}
              className={`px-5 py-2.5 rounded-[2rem] text-sm font-extrabold transition-all flex items-center gap-2 disabled:opacity-50 ${consultationMode === 'pedicurie' ? 'bg-[#4ECDC4] text-white dark:text-[#0b1121] shadow-lg shadow-[#4ECDC4]/25' : 'bg-slate-200 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-white/10'}`}
            >
              <Scissors size={16} /> Pédicurie
            </button>
            <button
              onClick={() => { setConsultationMode('facturation'); setViewState('recording'); }}
              disabled={isRecording}
              className={`px-5 py-2.5 rounded-[2rem] text-sm font-extrabold transition-all flex items-center gap-2 disabled:opacity-50 ${consultationMode === 'facturation' ? 'bg-[#4ECDC4] text-white dark:text-[#0b1121] shadow-lg shadow-[#4ECDC4]/25' : 'bg-slate-200 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-white/10'}`}
            >
              <Receipt size={16} /> Facturation
            </button>
            <button
              onClick={() => { setConsultationMode('ordonnance'); setViewState('recording'); }}
              disabled={isRecording}
              className={`px-5 py-2.5 rounded-[2rem] text-sm font-extrabold transition-all flex items-center gap-2 disabled:opacity-50 ${consultationMode === 'ordonnance' ? 'bg-[#4ECDC4] text-white dark:text-[#0b1121] shadow-lg shadow-[#4ECDC4]/25' : 'bg-slate-200 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-white/10'}`}
            >
              <FileSignature size={16} /> Ordonnance
            </button>
          </div>

          {viewState === 'recording' && user?.cabinetRole === 'secretaire' ? (
            <div className="w-full max-w-xl mx-auto mt-8 bg-white dark:bg-[#151e32] rounded-3xl border border-slate-100 dark:border-white/5 p-8 text-center space-y-4">
              <div className="w-14 h-14 bg-[#4931F7]/10 rounded-2xl flex items-center justify-center mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#4931F7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
              </div>
              <h2 className="text-lg font-black text-[#001F3F] dark:text-white">Accès secrétaire</h2>
              <p className="text-sm text-slate-500">L'enregistrement et la génération de CR sont réservés aux praticiens. Vous pouvez accéder aux dossiers patients et à la facturation via le menu ci-dessus.</p>
            </div>
          ) : viewState === 'recording' ? (
            <>
              {recoveredTranscript && !isRecording && (
                <div className="w-full max-w-xl mx-auto mb-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <RotateCcw size={14} className="text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-amber-700 dark:text-amber-400">Session précédente détectée</p>
                    <p className="text-xs text-amber-600 dark:text-amber-500">
                      Transcript sauvegardé à {new Date(recoveredTranscript.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const t = recoveredTranscript.transcript;
                      const pid = recoveredTranscript.patientId;
                      if (pid) {
                        const patient = localPatients.find(p => String(p.id) === String(pid));
                        if (patient) { setSelectedPatient(String(patient.id)); setSearchTerm(`${patient.prenom} ${patient.nom}`); }
                      }
                      setConsultationMode("podologie");
                      setLiveTranscript(t);
                      liveTranscriptRef.current = t;
                      setShowLiveConsultationView(true);
                      generateLiveCR(t);
                      if (liveStorageKey) { try { localStorage.removeItem(liveStorageKey); } catch { } }
                      setRecoveredTranscript(null);
                    }}
                    className="text-xs font-black text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 whitespace-nowrap transition-colors"
                  >
                    Reprendre →
                  </button>
                  <button
                    onClick={() => {
                      setRecoveredTranscript(null);
                      if (liveStorageKey) { try { localStorage.removeItem(liveStorageKey); } catch { } }
                    }}
                    className="text-amber-400 hover:text-amber-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              <div className={consultationMode === 'podologie' ? 'w-full flex justify-center animate-in fade-in slide-in-from-bottom-2 duration-200' : 'hidden'}>
                {showLiveConsultationView ? (
                  <LiveConsultationView
                    patientName={currentSelectedPatientObj ? `${formatPrenom(currentSelectedPatientObj.prenom) || ""} ${(currentSelectedPatientObj.nom || "").toUpperCase()}`.trim() : ""}
                    isRecording={isRecording}
                    isPaused={isPaused}
                    recordingTime={recordingTime}
                    formatTime={formatTime}
                    liveTranscript={liveTranscript}
                    interimTranscript={interimTranscript}
                    liveReport={liveReport}
                    isGeneratingLiveCR={isGeneratingLiveCR}
                    isFinalizingLive={isFinalizingLive}
                    isFinalized={!isRecording && !isFinalizingLive && !!currentConsultation?.id && showLiveConsultationView}
                    assistantQuestions={assistantQuestions}
                    isLoadingAssistant={isLoadingAssistant}
                    canvasRef={canvasRef}
                    speechApiActive={speechApiActive}
                    onStop={() => { finalizingFromLiveRef.current = true; stopRecording(); }}
                    onPause={pauseRecording}
                    onResume={resumeRecording}
                    onGenerateNow={() => generateLiveCR(liveTranscript)}
                    onViewDossier={() => { setShowLiveConsultationView(false); setViewState('validated'); }}
                    renderValue={renderValue}
                    assistantEnabled={assistantEnabled}
                    liveText={`${liveTranscript} ${liveReport ? Object.values(liveReport).filter(v => typeof v === "string").join(" ") : ""}`}
                  />
                ) : (
                  <RecordingBlock isRecording={isRecording} isPaused={isPaused} isProcessing={false} startRecording={startRecording} stopRecording={stopRecording} pauseRecording={pauseRecording} resumeRecording={resumeRecording} canvasRef={canvasRef} recordingTime={recordingTime} formatTime={formatTime} error={error} canRetry={canRetry} uploadAttempt={uploadAttempt} onRetry={handleRetry} onImportAudio={selectedPatient ? handleImportAudio : null} />
                )}
              </div>
              <div className={consultationMode === 'pedicurie' ? 'w-full flex justify-center animate-in fade-in slide-in-from-bottom-2 duration-200' : 'hidden'}>
                <PedicurieBlock key={`ped-${selectedPatient}`} selectedPatientObj={currentSelectedPatientObj} user={user} onNewPatient={handleNewPatient} onSaved={() => setSessionHasPedicurieSoin(true)} onGoToFacturation={goToFacturation} />
              </div>
              <div className={consultationMode === 'facturation' ? 'w-full flex justify-center animate-in fade-in slide-in-from-bottom-2 duration-200' : 'hidden'}>
                <FacturationBlock key={`fact-${selectedPatient}`} selectedPatientObj={currentSelectedPatientObj} user={user} linkedConsultationId={linkedConsultationId} linkedConsultationPatientId={linkedConsultationPatientId} onNewPatient={handleNewPatient} onGoToOrdonnance={goToOrdonnance} onConsultationSaved={handleFacturationSaved} />
              </div>
              <div className={consultationMode === 'ordonnance' ? 'w-full flex justify-center animate-in fade-in slide-in-from-bottom-2 duration-200' : 'hidden'}>
                <OrdonnanceBlock key={`ord-${selectedPatient}`} selectedPatientObj={currentSelectedPatientObj} user={user} linkedConsultationId={linkedConsultationId} linkedConsultationPatientId={linkedConsultationPatientId} />
              </div>
            </>
          ) : (
            <ValidationBlock
              consultation={currentConsultation}
              user={user}
              patientObj={currentSelectedPatientObj}
              onNewConsultation={handleNewPatient}
              renderValue={renderValue}
              isGeneratingReport={isGeneratingReport}
              generateStep={generateStep}
              onGoToFacturation={goToFacturation}
            />
          )}
        </>
      ) : null}

      {/* --- PILL NOTIFICATION CR GÉNÉRÉ --- */}
      {showCRDoneNotif && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[999] animate-in slide-in-from-top-3 fade-in duration-300 pointer-events-auto">
          <button
            onClick={() => { setShowCRDoneNotif(false); setViewState('validated'); }}
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-[#001F3F] dark:bg-white text-white dark:text-[#001F3F] text-sm font-black shadow-2xl hover:scale-105 active:scale-95 transition-transform"
          >
            <CheckCircle size={15} className="text-emerald-400 dark:text-emerald-600 shrink-0" />
            CR généré
            <span className="text-xs font-medium opacity-50 ml-0.5">Voir →</span>
          </button>
        </div>
      )}

      {/* --- MODALE NOUVEAU PATIENT MISE À JOUR --- */}
      {showNewPatientModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0b1121]/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#151e32] w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
              <h3 className="text-xl font-black text-[#001F3F] dark:text-white">Créer un patient</h3>
              <button onClick={() => setShowNewPatientModal(false)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleSavePatient} className="p-6 space-y-4">
              
              {/* Identité (Obligatoire) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Prénom *</label>
                  <input required autoFocus value={newPatientForm.prenom} onChange={e => { const v = e.target.value; setNewPatientForm({...newPatientForm, prenom: v.length ? v.charAt(0).toUpperCase() + v.slice(1) : v}); }} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm focus:border-[#4931F7] outline-none dark:text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">Nom *</label>
                  <input required value={newPatientForm.nom} onChange={e => setNewPatientForm({...newPatientForm, nom: e.target.value.toUpperCase()})} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm focus:border-[#4931F7] outline-none dark:text-white" />
                </div>
              </div>

              {/* Contact (Optionnel) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Téléphone</label>
                  <input type="tel" value={newPatientForm.telephone} onChange={e => setNewPatientForm({...newPatientForm, telephone: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm focus:border-[#4931F7] outline-none dark:text-white" placeholder="06..." />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Email</label>
                  <input type="email" value={newPatientForm.email} onChange={e => setNewPatientForm({...newPatientForm, email: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm focus:border-[#4931F7] outline-none dark:text-white" placeholder="exemple@mail.com" />
                </div>
              </div>

              {/* Adresse (Optionnel) */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Adresse postale</label>
                <input value={newPatientForm.adresse} onChange={e => setNewPatientForm({...newPatientForm, adresse: e.target.value})} className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm focus:border-[#4931F7] outline-none dark:text-white" placeholder="N°, rue, ville..." />
              </div>

              <button type="submit" disabled={isSavingPatient} className="w-full py-4 mt-2 bg-[#4931F7] text-white font-bold rounded-xl shadow-lg shadow-[#4931F7]/30 hover:bg-[#3b26c6] transition-all flex items-center justify-center gap-2 active:scale-95">
                {isSavingPatient ? <Loader2 size={18} className="animate-spin" /> : <><Check size={18} /> Enregistrer le patient</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL CONFIRMATION ENREGISTREMENT COURT --- */}
      {showShortRecordingModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0b1121]/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#151e32] w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 pb-4 text-center">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <Mic size={22} className="text-amber-500" />
              </div>
              <h3 className="text-lg font-black text-[#001F3F] dark:text-white mb-2">Enregistrement court</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Votre enregistrement est inférieur à 15 secondes. Voulez-vous recommencer ?</p>
            </div>
            <div className="flex gap-3 p-6 pt-2">
              <button
                onClick={() => {
                  pendingAudioRef.current = null;
                  finalizingFromLiveRef.current = false;
                  setShowLiveConsultationView(false);
                  setShowShortRecordingModal(false);
                  setViewState("recording");
                }}
                className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
              >
                Oui, recommencer
              </button>
              <button
                onClick={async () => {
                  setShowShortRecordingModal(false);
                  const blob = pendingAudioRef.current;
                  pendingAudioRef.current = null;
                  if (blob) {
                    if (finalizingFromLiveRef.current) {
                      // Live mode: finalize in place
                      setIsFinalizingLive(true);
                      await processAudio(blob);
                    } else {
                      setCurrentConsultation({ patient: currentSelectedPatientObj });
                      setIsGeneratingReport(true);
                      setViewState("validated");
                      await processAudio(blob);
                    }
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-[#4931F7] text-white text-sm font-bold shadow-lg shadow-[#4931F7]/30 hover:bg-[#3b26c6] transition-colors active:scale-95"
              >
                Non, continuer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- RÉCENTS --- */}
      {(() => {
        if (!recentConsultations?.length) return (
          <div className="w-full max-w-5xl mt-14 mb-8">
            <p className="text-sm text-slate-400 text-center py-6 italic font-medium">Aucun document récent.</p>
          </div>
        );

        const today = new Date();
        const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
        const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

        const groups = {};
        recentConsultations.forEach(c => {
          const d = new Date(c.createdAt);
          const key = sameDay(d, today) ? "__today" : sameDay(d, yesterday) ? "__yesterday" : d.toDateString();
          if (!groups[key]) groups[key] = { label: null, date: d, items: [] };
          if (!groups[key].label) {
            if (key === "__today") groups[key].label = "Aujourd'hui";
            else if (key === "__yesterday") groups[key].label = "Hier";
            else groups[key].label = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
          }
          groups[key].items.push(c);
        });

        const DocBadge = ({ icon, label, color }) => (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${color}`}>
            {icon} {label}
          </span>
        );

        const getDocBadges = (c) => {
          const badges = [];
          if (c.reportData) badges.push(<DocBadge key="cr" icon={<FileText size={9} />} label="CR" color="bg-[#4ECDC4]/10 text-[#4ECDC4]" />);
          if (c.ordonnanceData) badges.push(<DocBadge key="ordo" icon={<FileSignature size={9} />} label="Ordonnance" color="bg-violet-100 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400" />);
          if (c.devisData) badges.push(<DocBadge key="facture" icon={<Receipt size={9} />} label={c.typeConsultation === 'facturation' ? 'Facture' : 'Devis'} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" />);
          if (c.typeConsultation === 'pedicurie' && c.transcription) badges.push(<DocBadge key="pedi" icon={<Scissors size={9} />} label="Pédicurie" color="bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" />);
          return badges;
        };

        const getTypeIcon = (c) => {
          if (c.typeConsultation === 'facturation') return <Receipt size={16} className="text-emerald-500" />;
          if (c.typeConsultation === 'pedicurie') return <Scissors size={16} className="text-amber-500" />;
          return <FileText size={16} className="text-[#4ECDC4]" />;
        };

        return (
          <div className="w-full max-w-5xl mt-14 mb-8 animate-in fade-in duration-500 delay-200 space-y-8">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Récents</h3>
              <button onClick={() => router.push('/patients')} className="text-xs font-bold text-[#4931F7] hover:underline">Tout voir</button>
            </div>

            {Object.values(groups).map((group) => (
              <div key={group.label}>
                <div className="flex items-center gap-3 mb-3 px-1">
                  <span className="text-xs font-black text-[#4931F7] capitalize">{group.label}</span>
                  <div className="flex-1 h-px bg-slate-100 dark:bg-white/5" />
                </div>
                <div className="flex flex-col gap-2">
                  {group.items.map((consult) => {
                    const badges = getDocBadges(consult);
                    return (
                      <div key={consult.id} onClick={() => setSelectedConsultationId(consult.id)} className="bg-white dark:bg-[#151e32] border border-slate-200/60 dark:border-white/5 rounded-2xl p-4 flex items-center gap-4 group cursor-pointer hover:border-[#4931F7]/50 hover:shadow-lg transition-all">
                        <div className="w-10 h-10 bg-slate-50 dark:bg-white/5 rounded-xl flex items-center justify-center shrink-0">
                          {getTypeIcon(consult)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[#001F3F] dark:text-white truncate">
                            {formatPrenom(consult.patient?.prenom) || ""} {consult.patient?.nom ? formatNom(consult.patient.nom) : "Patient inconnu"}
                          </p>
                          {badges.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-1">{badges}</div>
                          ) : (
                            <p className="text-xs text-slate-400 mt-0.5 truncate">{consult.motif || "Consultation"}</p>
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 shrink-0">
                          {new Date(consult.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <ChevronRight size={18} className="text-slate-300 group-hover:text-[#4931F7] group-hover:translate-x-0.5 transition-all shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      <ConsultationModal consultationId={selectedConsultationId} onClose={() => setSelectedConsultationId(null)} />

      <PaymentModal
        show={showPaymentModal}
        patientName={currentSelectedPatientObj ? `${formatPrenom(currentSelectedPatientObj.prenom) || ''} ${(currentSelectedPatientObj.nom || '').toUpperCase()}`.trim() : ""}
        onConfirm={handlePaymentConfirm}
        onSkip={handlePaymentSkip}
      />
    </main>
  );
}