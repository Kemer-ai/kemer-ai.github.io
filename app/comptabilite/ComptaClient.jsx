"use client";
import React, { useState, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Search, Wallet, TrendingUp, ChevronLeft, ChevronRight,
  CheckCircle, Stethoscope, Footprints, Scissors, SlidersHorizontal, X,
  CreditCard, Banknote, PenLine, Plus, Receipt, Loader2, Check,
  ChevronDown, Calendar, FileText, Pencil, Trash2, Users, Crown
} from "lucide-react";
import { useCustomModal } from "@/components/ModalProvider";
import { avatarColor } from "@/lib/avatarColor";

const ResponsiveContainer = dynamic(() => import("recharts").then(m => m.ResponsiveContainer), { ssr: false });
const LineChart        = dynamic(() => import("recharts").then(m => m.LineChart),        { ssr: false });
const Line             = dynamic(() => import("recharts").then(m => m.Line),             { ssr: false });
const XAxis            = dynamic(() => import("recharts").then(m => m.XAxis),            { ssr: false });
const YAxis            = dynamic(() => import("recharts").then(m => m.YAxis),            { ssr: false });
const CartesianGrid    = dynamic(() => import("recharts").then(m => m.CartesianGrid),    { ssr: false });
const Tooltip          = dynamic(() => import("recharts").then(m => m.Tooltip),          { ssr: false });

// Le corps d'une réponse en échec n'est pas toujours du JSON — une session
// expirée ou un crash serveur peuvent rendre un corps vide, et (await
// res.json()).error plante alors sur "Unexpected end of JSON input" au lieu
// du message d'erreur attendu. Constaté en production le 22 septembre 2026.
async function messageErreur(res) {
  try {
    const data = await res.json();
    return data?.error || `Erreur (${res.status})`;
  } catch {
    return `Erreur (${res.status})`;
  }
}

const MONTHS = ["Janv","Févr","Mars","Avr","Mai","Juin","Juil","Août","Sept","Oct","Nov","Déc"];
const MONTHS_LONG = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DAYS = ["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];

const TYPE_CONFIG = {
  bilan:    { label: "Séance Bilan",           color: "#4931F7", icon: Stethoscope },
  semelles: { label: "Semelles Orthopédiques", color: "#4ECDC4", icon: Footprints },
  pedicurie:{ label: "Pédicurie",              color: "#f59e0b", icon: Scissors },
  autre:    { label: "Autre",                  color: "#94a3b8", icon: Stethoscope },
};

const PAIEMENT_CONFIG = {
  cb:      { label: "CB",      Icon: CreditCard, color: "text-[#4931F7] bg-[#4931F7]/10 dark:bg-[#4931F7]/20" },
  especes: { label: "Espèces", Icon: Banknote,   color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10" },
  cheque:  { label: "Chèque",  Icon: PenLine,    color: "text-amber-600 bg-amber-50 dark:bg-amber-500/10" },
};

// ── Modes de paiement partagés ──────────────────────────────────────────────
const MODES_PAIEMENT = [
  { id: "especes",  label: "Espèces",        Icon: Banknote },
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
        <div className="absolute z-[210] w-full mt-1 bg-white dark:bg-[#1a2540] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden">
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

// ── Modale ajout manuel de règlement ────────────────────────────────────────
function AddPaymentModal({ show, patients, onClose, onSaved }) {
  const [search, setSearch]           = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [consultations, setConsultations]     = useState([]);
  const [loadingCRs, setLoadingCRs]           = useState(false);
  const [selectedCR, setSelectedCR]           = useState(null);
  const [dateTime, setDateTime]               = useState("");
  const [montant, setMontant]                 = useState("");
  const [modePaiement, setModePaiement]       = useState("");
  const [saving, setSaving]                   = useState(false);
  const [error, setError]                     = useState("");

  // Reset on open
  useEffect(() => {
    if (show) {
      setSearch(""); setSelectedPatient(null); setConsultations([]);
      setSelectedCR(null); setMontant(""); setModePaiement(""); setError("");
      // Default datetime = now (local)
      const now = new Date();
      now.setSeconds(0, 0);
      setDateTime(now.toISOString().slice(0, 16));
    }
  }, [show]);

  const filtered = (patients || []).filter(p =>
    `${p.prenom} ${p.nom}`.toLowerCase().includes(search.toLowerCase()) ||
    `${p.nom} ${p.prenom}`.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelectPatient = async (p) => {
    setSelectedPatient(p);
    setSearch(`${p.prenom} ${p.nom.toUpperCase()}`);
    setShowDropdown(false);
    setSelectedCR(null);
    setLoadingCRs(true);
    try {
      const res = await fetch(`/api/patients/${p.id}/consultations`);
      const data = await res.json();
      setConsultations(Array.isArray(data) ? data : []);
    } catch { setConsultations([]); }
    setLoadingCRs(false);
  };

  const handleSelectCR = (cr) => {
    setSelectedCR(cr);
    const d = new Date(cr.createdAt);
    d.setSeconds(0, 0);
    setDateTime(d.toISOString().slice(0, 16));
  };

  const canSubmit = selectedPatient && modePaiement && montant &&
    !isNaN(parseFloat(montant)) && parseFloat(montant) > 0;

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/consultation/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          montant: parseFloat(montant),
          modePaiement,
          date: dateTime ? new Date(dateTime).toISOString() : undefined,
          // Rattache le règlement au compte rendu choisi au lieu d'en créer
          // un nouveau (voir la sélection "Consultation (optionnel)" ci-dessous).
          consultationId: selectedCR?.id,
        }),
      });
      if (!res.ok) throw new Error(await messageErreur(res));
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!show) return null;

  const typeLabel = (t) => t === "pedicurie" ? "Pédicurie" : "Podologie";

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 pt-8 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white dark:bg-[#151e32] rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 dark:border-white/10 animate-in zoom-in-95 duration-150 my-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-green-100 dark:bg-green-500/10 flex items-center justify-center shrink-0">
              <Plus size={18} className="text-green-600" />
            </div>
            <h2 className="text-sm font-black text-[#001F3F] dark:text-white">Ajouter un règlement</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">

          {/* Sélection patient */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Patient</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Rechercher un patient…"
                value={search}
                onChange={e => { setSearch(e.target.value); setShowDropdown(true); setSelectedPatient(null); setConsultations([]); setSelectedCR(null); }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm font-bold text-[#001F3F] dark:text-white focus:outline-none focus:border-[#4931F7] transition-colors"
              />
              {showDropdown && filtered.length > 0 && (
                <div className="absolute z-[210] w-full mt-1 bg-white dark:bg-[#1a2540] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                  {filtered.slice(0, 8).map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={() => handleSelectPatient(p)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-bold text-left hover:bg-slate-50 dark:hover:bg-white/5 text-[#001F3F] dark:text-white transition-colors border-b border-slate-100 dark:border-white/5 last:border-0"
                    >
                      <div className="w-7 h-7 rounded-lg bg-[#4931F7]/10 text-[#4931F7] flex items-center justify-center text-xs font-black shrink-0">
                        {p.prenom?.[0]}{p.nom?.[0]}
                      </div>
                      {p.prenom} <span className="uppercase ml-1">{p.nom}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sélection consultation (CR) */}
          {selectedPatient && (
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block flex items-center gap-1.5">
                <FileText size={10} /> Consultation (optionnel)
              </label>
              {loadingCRs ? (
                <div className="flex items-center gap-2 py-2 text-xs text-slate-400">
                  <Loader2 size={12} className="animate-spin" /> Chargement…
                </div>
              ) : consultations.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Aucun compte rendu trouvé</p>
              ) : (
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {consultations.map(cr => {
                    const d = new Date(cr.createdAt);
                    const label = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) + " · " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
                    return (
                      <button
                        key={cr.id}
                        type="button"
                        onClick={() => handleSelectCR(selectedCR?.id === cr.id ? null : cr)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border text-xs font-bold text-left transition-all ${
                          selectedCR?.id === cr.id
                            ? "border-[#4931F7] bg-[#4931F7]/5 text-[#4931F7]"
                            : "border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-[#4931F7]/30"
                        }`}
                      >
                        <FileText size={12} className="shrink-0" />
                        <span className="truncate">{label}</span>
                        <span className="ml-auto shrink-0 text-[10px] opacity-60">{typeLabel(cr.typeConsultation)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Date / heure */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Calendar size={10} /> Date et heure
            </label>
            <input
              type="datetime-local"
              value={dateTime}
              onChange={e => { setDateTime(e.target.value); setSelectedCR(null); }}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-[#001F3F] dark:text-white focus:outline-none focus:border-[#4931F7] transition-colors"
            />
          </div>

          {/* Montant */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Montant</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.50"
                placeholder="0,00"
                value={montant}
                onChange={e => setMontant(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 pr-10 text-sm font-black text-[#001F3F] dark:text-white focus:outline-none focus:border-[#4931F7] transition-colors"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">€</span>
            </div>
          </div>

          {/* Mode de paiement */}
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Mode de paiement</label>
            <PaymentMethodSelect value={modePaiement} onChange={setModePaiement} />
          </div>

          {error && <p className="text-xs text-red-500 font-bold">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={!canSubmit || saving}
              className="flex-1 py-2.5 rounded-xl bg-[#4931F7] text-white text-xs font-black hover:bg-[#3b26c6] transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Modale édition règlement (montant + mode de paiement) ──────────────────
function EditPaymentModal({ tx, onClose, onSaved }) {
  const [montant, setMontant]         = useState("");
  const [modePaiement, setModePaiement] = useState("");
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");

  useEffect(() => {
    if (tx) {
      setMontant(String(tx.amount ?? ""));
      setModePaiement(tx.modePaiement || "");
      setError("");
    }
  }, [tx]);

  if (!tx) return null;

  const canSubmit = modePaiement && montant &&
    !isNaN(parseFloat(montant)) && parseFloat(montant) > 0;

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      // devisData est la source principale (voir parseAmount) ; on ne
      // retombe sur factureData que si devisData est vide, pour ne pas
      // perdre le reste des champs (items, status...) déjà présents.
      const field = tx.devisData ? "devisData" : "factureData";
      const current = (typeof tx[field] === "string" ? tryParse(tx[field]) : tx[field]) || {};
      const updated = { ...current, totalAmount: parseFloat(montant), modePaiement };
      const res = await fetch(`/api/consultations/${tx.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: updated }),
      });
      if (!res.ok) throw new Error(await messageErreur(res));
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center p-4 pt-8 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white dark:bg-[#151e32] rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 dark:border-white/10 animate-in zoom-in-95 duration-150 my-auto">

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#4931F7]/10 flex items-center justify-center shrink-0">
              <Pencil size={16} className="text-[#4931F7]" />
            </div>
            <div>
              <h2 className="text-sm font-black text-[#001F3F] dark:text-white">Modifier le règlement</h2>
              <p className="text-xs text-slate-400 font-bold">{tx.patient?.prenom} {tx.patient?.nom?.toUpperCase()}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Montant</label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.50"
                placeholder="0,00"
                value={montant}
                onChange={e => setMontant(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 pr-10 text-sm font-black text-[#001F3F] dark:text-white focus:outline-none focus:border-[#4931F7] transition-colors"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-400">€</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Mode de paiement</label>
            <PaymentMethodSelect value={modePaiement} onChange={setModePaiement} />
          </div>

          {error && <p className="text-xs text-red-500 font-bold">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={!canSubmit || saving}
              className="flex-1 py-2.5 rounded-xl bg-[#4931F7] text-white text-xs font-black hover:bg-[#3b26c6] transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function detectType(c) {
  // Soin pédicurie enregistré via PedicurieBlock
  if (c.typeConsultation === "pedicurie") return "pedicurie";

  // Seuls les records de facturation (typeConsultation="facturation") ont un devisData fiable.
  // Les CRs audio (typeConsultation=null) n'ont pas de devisData → on les exclut des stats
  // pour éviter de les comptabiliser comme des bilans à tort.
  if (c.typeConsultation !== "facturation") return null;

  const devis = typeof c.devisData === "string" ? tryParse(c.devisData) : c.devisData;
  if (!devis?.items?.length) return null;
  const desc = devis.items.map(i => (i.description || "").toLowerCase()).join(" ");
  if (desc.includes("semelle") || desc.includes("orthèse") || desc.includes("orthopéd")) return "semelles";
  if (desc.includes("bilan")) return "bilan";
  if (desc.includes("pédicurie") || desc.includes("pedicurie")) return "pedicurie";
  return "bilan";
}

// Compte les types dans un slice en évitant le double-comptage pédicurie :
// si un patient a un record PedicurieBlock ET un record FacturationBlock pédicurie le même jour,
// on ne compte qu'une seule occurrence.
function countTypes(slice) {
  const pedicurieDays = new Set();
  slice.forEach(t => {
    if (t.typeConsultation === "pedicurie") {
      const d = new Date(t.createdAt);
      pedicurieDays.add(`${t.patientId}-${d.toDateString()}`);
    }
  });
  let bilan = 0, semelles = 0, pedicurie = 0;
  slice.forEach(t => {
    if (!t.type) return;
    if (t.type === "bilan")    { bilan++;    return; }
    if (t.type === "semelles") { semelles++; return; }
    if (t.type === "pedicurie") {
      if (t.typeConsultation === "pedicurie") {
        pedicurie++;
      } else {
        // Record FacturationBlock pédicurie → ne compter que s'il n'y a pas déjà
        // un enregistrement PedicurieBlock pour le même patient ce jour-là
        const d = new Date(t.createdAt);
        if (!pedicurieDays.has(`${t.patientId}-${d.toDateString()}`)) pedicurie++;
      }
    }
  });
  return { bilan, semelles, pedicurie };
}
function tryParse(v) { try { return JSON.parse(v); } catch { return null; } }
function toNum(str) {
  return parseFloat(String(str || "").replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
}
function parseAmount(devis, facture) {
  // Try devisData first, then factureData as fallback
  const src = (typeof devis === "string" ? tryParse(devis) : devis)
           || (typeof facture === "string" ? tryParse(facture) : facture);
  if (!src) return 0;
  // Try totalAmount
  const fromTotal = toNum(src.totalAmount);
  if (fromTotal > 0) return fromTotal;
  // Fallback: sum items (handles "Tarif standard" or missing totalAmount)
  if (Array.isArray(src.items)) {
    return src.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 1) * toNum(item.unitPrice), 0);
  }
  return 0;
}
function formatEuro(v) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v);
}

// ── Avatar praticien — initiales, couleur stable par praticien ─────────────
function PraticienAvatar({ praticien }) {
  if (!praticien) return null;
  const initials = `${praticien.prenom?.[0] || ""}${praticien.nom?.[0] || ""}`.toUpperCase();
  const { bg, text } = avatarColor(praticien.id);
  return (
    <div
      title={`${praticien.prenom} ${praticien.nom}`}
      className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-xs font-black ${bg} ${text}`}
    >
      {initials}
    </div>
  );
}

// Répartition responsable / collaborateur selon le pourcentage de reversement
// défini sur le praticien qui a réalisé la consultation (page gestion du cabinet).
function computeSplit(amount, praticien) {
  const isCollaborateur = praticien && praticien.cabinetRole !== "responsable";
  const pct = praticien?.pourcentageReversement;
  if (!isCollaborateur || pct === null || pct === undefined) {
    return { montantResponsable: null, montantCollaborateur: null };
  }
  const montantResponsable = amount * (pct / 100);
  return { montantResponsable, montantCollaborateur: amount - montantResponsable };
}

// ── Mini calendrier ──────────────────────────────────────────────────────────
function MiniCalendar({ calYear, calMonth, setCalYear, setCalMonth, hasData, onSelectDay }) {
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const startOffset = (firstDay + 6) % 7;
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today = new Date();

  const prev = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const next = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-black text-[#001F3F] dark:text-white capitalize">
          {MONTHS_LONG[calMonth]} {calYear}
        </span>
        <div className="flex gap-1">
          <button onClick={prev} className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors">
            <ChevronLeft size={13} />
          </button>
          <button onClick={next} className="p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-lg transition-colors">
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
        {["L","M","M","J","V","S","D"].map((d, i) => (
          <span key={i} className="text-[9px] font-black text-slate-300 dark:text-slate-600">{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {Array(startOffset).fill(null).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const isToday = day === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear();
          const active = hasData(calYear, calMonth, day);
          return (
            <button
              key={day}
              onClick={() => active && onSelectDay(calYear, calMonth, day)}
              className={`h-7 w-7 text-[10px] font-bold rounded-lg transition-all mx-auto flex items-center justify-center
                ${isToday ? "bg-[#4931F7] text-white shadow-sm shadow-[#4931F7]/30" :
                  active ? "bg-[#4931F7]/10 text-[#4931F7] hover:bg-[#4931F7]/20 cursor-pointer" :
                  "text-slate-400 dark:text-slate-600 cursor-default"}`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Graphique statistiques ───────────────────────────────────────────────────
function StatsChart({ data, xKey, title, subtitle }) {
  if (!data?.length) return null;
  return (
    <div className="bg-white dark:bg-[#151e32] rounded-[2rem] border border-slate-100 dark:border-white/5 p-4 md:p-6 mt-6 md:mt-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm font-black text-[#001F3F] dark:text-white">{title}</h3>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {Object.entries(TYPE_CONFIG).filter(([k]) => k !== "autre").map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ width: "100%", height: 200, minWidth: 0 }}>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 700 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", fontSize: 12 }}
              labelStyle={{ fontWeight: 700, color: "#001F3F" }}
            />
            <Line type="monotone" dataKey="bilan"     name="Séance Bilan" stroke="#4931F7" strokeWidth={2.5} dot={{ r: 3, fill: "#4931F7" }}  activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="semelles"  name="Semelles"     stroke="#4ECDC4" strokeWidth={2.5} dot={{ r: 3, fill: "#4ECDC4" }}  activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="pedicurie" name="Pédicurie"    stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3, fill: "#f59e0b" }}  activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Carte d'une transaction ──────────────────────────────────────────────────
function TxCard({ tx, onEdit, onDelete, isDeleting, showPraticien }) {
  const type = detectType(tx);
  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.autre;
  const Icon = cfg.icon;
  const paiement = tx.modePaiement ? PAIEMENT_CONFIG[tx.modePaiement] : null;
  const hasSplit = tx.montantResponsable !== null && tx.montantResponsable !== undefined;
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#151e32] border border-slate-100 dark:border-white/5 rounded-2xl hover:border-[#4931F7]/20 transition-all">
      {showPraticien && <PraticienAvatar praticien={tx.praticien} />}
      <div className="w-9 h-9 shrink-0 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${cfg.color}15`, color: cfg.color }}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-black text-[#001F3F] dark:text-white truncate">
          {tx.patient?.prenom} <span className="uppercase">{tx.patient?.nom}</span>
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <p className="text-[10px] font-bold text-slate-400">{cfg.label}</p>
          {paiement && (
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black ${paiement.color}`}>
              <paiement.Icon size={9} />
              {paiement.label}
            </span>
          )}
        </div>
        {hasSplit && (
          <p className="text-[9px] font-bold text-slate-400 mt-1">
            Collaborateur : <span className="text-emerald-600 dark:text-emerald-400">{formatEuro(tx.montantCollaborateur)}</span>
            {" · "}Responsable : <span className="text-[#4931F7]">{formatEuro(tx.montantResponsable)}</span>
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-0.5 shrink-0">
        <span className="text-sm font-black text-[#001F3F] dark:text-white">{formatEuro(tx.amount)}</span>
        <span className="text-[10px] font-bold text-slate-400">{new Date(tx.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0 ml-1">
        <button
          onClick={() => onEdit?.(tx)}
          disabled={isDeleting}
          title="Modifier le règlement"
          className="p-1.5 rounded-lg text-slate-400 hover:text-[#4931F7] hover:bg-[#4931F7]/10 transition-colors disabled:opacity-40"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => onDelete?.(tx)}
          disabled={isDeleting}
          title="Supprimer le règlement"
          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-40"
        >
          {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
        </button>
      </div>
    </div>
  );
}

// ── Bloc "journée" ───────────────────────────────────────────────────────────
function DayBlock({ dateKey, dayData, onEdit, onDelete, deletingId, showPraticien }) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const label = `${DAYS[date.getDay()]} ${date.getDate()} ${MONTHS_LONG[date.getMonth()]}`;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-xs font-black text-[#4931F7] bg-[#4931F7]/10 px-3 py-1.5 rounded-full capitalize">{label}</span>
        <div className="flex-1 h-px bg-slate-100 dark:bg-white/5" />
        <span className="text-sm font-black text-slate-500 dark:text-slate-400">{formatEuro(dayData.total)}</span>
      </div>
      <div className="space-y-2">
        {dayData.transactions.map(tx => (
          <TxCard key={tx.id} tx={tx} onEdit={onEdit} onDelete={onDelete} isDeleting={deletingId === tx.id} showPraticien={showPraticien} />
        ))}
      </div>
    </div>
  );
}

// ── Contenu de la sidebar (partagé desktop + mobile sheet) ──────────────────
function SidebarContent({ searchQuery, setSearchQuery, filterType, setFilterType, filterPaiement, setFilterPaiement, calYear, calMonth, setCalYear, setCalMonth, hasData, onSelectDay, cabinetMembres, selectedMembreIds, toggleMembre }) {
  return (
    <div className="flex flex-col gap-6">
      {/* Recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
        <input
          type="text"
          placeholder="Rechercher un patient..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl py-2.5 pl-9 pr-4 text-xs font-bold text-[#001F3F] dark:text-white outline-none focus:border-[#4931F7] transition-colors"
        />
      </div>

      {/* Filtre par type */}
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <SlidersHorizontal size={10} /> Type de consultation
        </p>
        <div className="flex flex-col gap-1.5">
          {[
            { id: "all", label: "Tous", color: "#4931F7" },
            ...Object.entries(TYPE_CONFIG).filter(([k]) => k !== "autre").map(([k, v]) => ({ id: k, label: v.label, color: v.color }))
          ].map(({ id, label, color }) => (
            <button
              key={id}
              onClick={() => setFilterType(id)}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${filterType === id ? "text-white" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"}`}
              style={filterType === id ? { backgroundColor: color } : {}}
            >
              <span>{label}</span>
              {filterType === id && <CheckCircle size={12} />}
            </button>
          ))}
        </div>
      </div>

      {/* Filtre par mode de paiement */}
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <CreditCard size={10} /> Mode de paiement
        </p>
        <div className="flex flex-col gap-1.5">
          {[
            { id: "all",           label: "Tous",          Icon: null,        active: "bg-[#4931F7] text-white" },
            { id: "cb",            label: "CB",            Icon: CreditCard,  active: "bg-[#4931F7] text-white" },
            { id: "especes",       label: "Espèces",       Icon: Banknote,    active: "bg-emerald-500 text-white" },
            { id: "cheque",        label: "Chèque",        Icon: PenLine,     active: "bg-amber-500 text-white" },
            { id: "non-renseigne", label: "Non renseigné", Icon: null,        active: "bg-slate-500 text-white" },
          ].map(({ id, label, Icon, active }) => (
            <button
              key={id}
              onClick={() => setFilterPaiement(id)}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                filterPaiement === id
                  ? active
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"
              }`}
            >
              <span className="flex items-center gap-2">
                {Icon && <Icon size={12} />}
                {label}
              </span>
              {filterPaiement === id && <CheckCircle size={12} />}
            </button>
          ))}
        </div>
      </div>

      {/* Filtre par membre du cabinet */}
      {cabinetMembres?.length > 1 && (
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
            <Users size={10} /> Membres du cabinet
          </p>
          <div className="flex flex-col gap-1.5">
            {cabinetMembres.map(m => {
              const active = selectedMembreIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleMembre(m.id)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    active ? "bg-[#4931F7] text-white" : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5"
                  }`}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    {m.prenom} {m.nom}
                    {m.cabinetRole === "responsable" && <Crown size={10} />}
                  </span>
                  {active && <CheckCircle size={12} className="shrink-0" />}
                </button>
              );
            })}
          </div>
          {selectedMembreIds.length === 0 && (
            <p className="text-[10px] text-slate-400 mt-2">Aucune sélection = tous les membres</p>
          )}
        </div>
      )}

      {/* Mini calendrier */}
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Calendrier rapide</p>
        <MiniCalendar
          calYear={calYear} calMonth={calMonth}
          setCalYear={setCalYear} setCalMonth={setCalMonth}
          hasData={hasData} onSelectDay={onSelectDay}
        />
      </div>
    </div>
  );
}

function getMonday(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Composant principal ──────────────────────────────────────────────────────
export default function ComptaClient({ initialData = [], patients = [], cabinetMembres = [] }) {
  const today = new Date();
  const router = useRouter();
  const { showModal } = useCustomModal();
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const handleDeleteTx = async (tx) => {
    const ok = await showModal({
      type: "confirm",
      title: "Supprimer ce règlement ?",
      message: `${tx.patient?.prenom} ${tx.patient?.nom?.toUpperCase()} — ${formatEuro(tx.amount)}. Cette action est irréversible.`,
    });
    if (!ok) return;
    setDeletingId(tx.id);
    try {
      const res = await fetch(`/api/consultations/${tx.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await messageErreur(res));
      router.refresh();
    } catch (e) {
      await showModal({ type: "alert", title: "Erreur", message: e.message || "Impossible de supprimer ce règlement." });
    } finally {
      setDeletingId(null);
    }
  };

  const [navMode, setNavMode] = useState("month");
  const [navDate, setNavDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [calYear, setCalYear]   = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterPaiement, setFilterPaiement] = useState("all");
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [selectedMembreIds, setSelectedMembreIds] = useState([]); // vide = tous les membres

  const toggleMembre = (id) => {
    setSelectedMembreIds(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const switchMode = (mode) => {
    setNavMode(mode);
    if (mode === "month") setNavDate(new Date(today.getFullYear(), today.getMonth(), 1));
    else if (mode === "week") setNavDate(getMonday(today));
    else setNavDate(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  };

  const enriched = useMemo(() => initialData.map(c => {
    const devisObj = typeof c.devisData === "string" ? tryParse(c.devisData) : c.devisData;
    const amount = parseAmount(c.devisData, c.factureData);
    const { montantResponsable, montantCollaborateur } = computeSplit(amount, c.praticien);
    return {
      ...c,
      amount,
      isPaid: devisObj?.status === "SIGNED" || !!c.signatureFacture,
      type: detectType(c),
      modePaiement: devisObj?.modePaiement ?? null,
      montantResponsable,
      montantCollaborateur,
    };
  }), [initialData]);

  const filtered = useMemo(() => enriched.filter(tx => {
    const name = `${tx.patient?.prenom} ${tx.patient?.nom}`.toLowerCase();
    if (searchQuery && !name.includes(searchQuery.toLowerCase())) return false;
    if (filterType !== "all" && tx.type !== filterType) return false;
    if (filterPaiement !== "all") {
      if (filterPaiement === "non-renseigne") { if (tx.modePaiement) return false; }
      else if (tx.modePaiement !== filterPaiement) return false;
    }
    if (selectedMembreIds.length > 0 && !selectedMembreIds.includes(tx.praticienId)) return false;
    return true;
  }), [enriched, searchQuery, filterType, filterPaiement, selectedMembreIds]);

  const byDay = useMemo(() => {
    const map = {};
    for (const tx of filtered) {
      const d = new Date(tx.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      if (!map[key]) map[key] = { total: 0, transactions: [] };
      map[key].total += tx.amount;
      map[key].transactions.push(tx);
    }
    return map;
  }, [filtered]);

  const visibleDays = useMemo(() => {
    const keys = Object.keys(byDay).sort((a, b) => b.localeCompare(a));
    if (navMode === "month") {
      return keys.filter(k => {
        const [y, m] = k.split("-").map(Number);
        return y === navDate.getFullYear() && m === navDate.getMonth() + 1;
      });
    }
    if (navMode === "day") {
      const key = `${navDate.getFullYear()}-${String(navDate.getMonth() + 1).padStart(2,"0")}-${String(navDate.getDate()).padStart(2,"0")}`;
      return keys.filter(k => k === key);
    }
    const monday = getMonday(navDate);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return keys.filter(k => {
      const d = new Date(k.replace(/-/g, "/"));
      return d >= monday && d <= sunday;
    });
  }, [byDay, navMode, navDate]);

  const navPrev = () => {
    const d = new Date(navDate);
    if (navMode === "month") d.setMonth(d.getMonth() - 1);
    else if (navMode === "week") d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setNavDate(d);
  };
  const navNext = () => {
    const d = new Date(navDate);
    if (navMode === "month") d.setMonth(d.getMonth() + 1);
    else if (navMode === "week") d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setNavDate(d);
  };
  const navLabel = () => {
    if (navMode === "month") return `${MONTHS_LONG[navDate.getMonth()]} ${navDate.getFullYear()}`;
    if (navMode === "day") return `${DAYS[navDate.getDay()]} ${navDate.getDate()} ${MONTHS_LONG[navDate.getMonth()]}`;
    const monday = getMonday(navDate);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const sameMonth = monday.getMonth() === sunday.getMonth();
    const startStr = sameMonth ? String(monday.getDate()) : `${monday.getDate()} ${MONTHS_LONG[monday.getMonth()]}`;
    return `${startStr} – ${sunday.getDate()} ${MONTHS_LONG[sunday.getMonth()]} ${sunday.getFullYear()}`;
  };

  const totalVisible = visibleDays.reduce((s, k) => s + byDay[k].total, 0);

  const paiementStats = useMemo(() => {
    const stats = { cb: 0, especes: 0, cheque: 0, autre: 0 };
    visibleDays.forEach(k => byDay[k].transactions.forEach(tx => {
      const m = tx.modePaiement;
      if (m === 'cb' || m === 'especes' || m === 'cheque') stats[m] += tx.amount;
      else stats.autre += tx.amount;
    }));
    return stats;
  }, [visibleDays, byDay]);

  const hasData = (y, m, d) => {
    const key = `${y}-${String(m + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    return !!byDay[key];
  };
  const onSelectDay = (y, m, d) => {
    setNavDate(new Date(y, m, d));
    setNavMode("day");
    setMobileSheetOpen(false);
  };

  const monthChartData = useMemo(() => {
    const results = [];
    for (let i = 11; i >= 0; i--) {
      const ref = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const y = ref.getFullYear(); const m = ref.getMonth();
      const slice = enriched.filter(tx => {
        const d = new Date(tx.createdAt);
        return d.getFullYear() === y && d.getMonth() === m;
      });
      results.push({ month: MONTHS[m], ...countTypes(slice) });
    }
    return results;
  }, [enriched]);

  const weekChartData = useMemo(() => {
    const day = navDate.getDay();
    const monday = new Date(navDate);
    monday.setDate(navDate.getDate() - ((day + 6) % 7));
    return ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"].map((label, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const slice = enriched.filter(tx => {
        const t = new Date(tx.createdAt);
        return t.getFullYear() === d.getFullYear() && t.getMonth() === d.getMonth() && t.getDate() === d.getDate();
      });
      return { day: label, ...countTypes(slice) };
    });
  }, [enriched, navDate]);

  const dayChartData = useMemo(() => {
    const slice = enriched.filter(tx => {
      const t = new Date(tx.createdAt);
      return t.getFullYear() === navDate.getFullYear() && t.getMonth() === navDate.getMonth() && t.getDate() === navDate.getDate();
    });
    return Array.from({ length: 12 }, (_, i) => {
      const h = 8 + i;
      const hourSlice = slice.filter(tx => new Date(tx.createdAt).getHours() === h);
      return { hour: `${h}h`, ...countTypes(hourSlice) };
    });
  }, [enriched, navDate]);

  const splitTotals = useMemo(() => {
    let responsable = 0, collaborateur = 0, hasAny = false;
    visibleDays.forEach(k => byDay[k].transactions.forEach(tx => {
      if (tx.montantResponsable !== null && tx.montantResponsable !== undefined) {
        hasAny = true;
        responsable += tx.montantResponsable;
        collaborateur += tx.montantCollaborateur;
      }
    }));
    return { responsable, collaborateur, hasAny };
  }, [visibleDays, byDay]);

  // Recette d'un collaborateur précis — affichée quand un seul membre (non responsable) est filtré
  const collaborateurBox = useMemo(() => {
    if (selectedMembreIds.length !== 1) return null;
    const membre = cabinetMembres.find(m => m.id === selectedMembreIds[0]);
    if (!membre || membre.cabinetRole === "responsable") return null;
    let factures = 0, recetteFacturee = 0, recetteCollab = 0;
    visibleDays.forEach(k => byDay[k].transactions.forEach(tx => {
      if (tx.praticienId !== membre.id) return;
      factures += 1;
      recetteFacturee += tx.amount;
      recetteCollab += tx.montantCollaborateur ?? tx.amount;
    }));
    return { membre, factures, recetteFacturee, recetteCollab };
  }, [selectedMembreIds, cabinetMembres, visibleDays, byDay]);

  const sidebarProps = {
    searchQuery, setSearchQuery, filterType, setFilterType,
    filterPaiement, setFilterPaiement,
    calYear, calMonth, setCalYear, setCalMonth, hasData, onSelectDay,
    cabinetMembres, selectedMembreIds, toggleMembre,
  };

  return (
    <div className="h-[calc(100dvh-4rem)] md:h-[calc(100dvh-5rem)] w-full bg-[#f8fafc] dark:bg-[#0b1121] flex flex-col md:flex-row font-sans overflow-hidden">

      {/* ══ BARRE LATÉRALE — desktop uniquement ════════════════════════════ */}
      <aside className="hidden md:flex w-72 border-r border-gray-100 dark:border-white/5 bg-white dark:bg-[#0b1121] flex-col p-5 gap-6 overflow-y-auto custom-scrollbar shrink-0">
        <div className="flex items-center gap-3 pt-1">
          <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-xl text-green-600"><Wallet size={18} /></div>
          <h1 className="text-lg font-black text-[#001F3F] dark:text-white tracking-tighter">Comptabilité</h1>
        </div>
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* ══ ZONE PRINCIPALE ════════════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col overflow-hidden min-h-0">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="px-4 md:px-8 py-3 md:py-4 bg-white/90 dark:bg-[#0b1121]/90 backdrop-blur-md border-b border-gray-100 dark:border-white/5 flex flex-col gap-3 shrink-0 z-10">

          {/* Ligne mobile : titre + bouton filtres */}
          <div className="flex items-center justify-between md:hidden">
            <div className="flex items-center gap-2">
              <div className="bg-green-100 dark:bg-green-900/30 p-1.5 rounded-xl text-green-600"><Wallet size={15} /></div>
              <h1 className="text-base font-black text-[#001F3F] dark:text-white tracking-tighter">Comptabilité</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddPayment(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4931F7] text-white rounded-xl text-xs font-black hover:bg-[#3b26c6] transition-colors shadow-md shadow-[#4931F7]/20"
              >
                <Plus size={13} /> Ajouter
              </button>
              <button
                onClick={() => setMobileSheetOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-white/5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300"
              >
                <SlidersHorizontal size={13} />
                Filtres
                {(filterType !== "all" || filterPaiement !== "all") && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4931F7]" />
                )}
              </button>
            </div>
          </div>

          {/* Ligne : mode + nav + total */}
          <div className="flex items-center justify-between gap-3">

            {/* Mode mois / semaine / jour */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl shrink-0">
              {[["month","Mois"],["week","Sem."],["day","Jour"]].map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => switchMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${navMode === mode ? "bg-white dark:bg-[#151e32] text-[#4931F7] shadow-sm" : "text-slate-500 hover:text-[#001F3F]"}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Navigation période */}
            <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-center">
              <button onClick={navPrev} className="w-7 h-7 shrink-0 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                <ChevronLeft size={15} />
              </button>
              <span className="text-xs md:text-sm font-black text-[#001F3F] dark:text-white text-center truncate capitalize">
                {navLabel()}
              </span>
              <button onClick={navNext} className="w-7 h-7 shrink-0 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                <ChevronRight size={15} />
              </button>
            </div>

            {/* Total période + bouton desktop */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setShowAddPayment(true)}
                className="hidden md:flex items-center gap-1.5 px-4 py-2 bg-[#4931F7] text-white rounded-xl text-xs font-black hover:bg-[#3b26c6] transition-colors shadow-md shadow-[#4931F7]/20"
              >
                <Plus size={13} /> Ajouter un règlement
              </button>
              <div className="text-right">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest hidden md:block">Total période</p>
                <p className="text-sm md:text-lg font-black text-[#4931F7]">{formatEuro(totalVisible)}</p>
              </div>
            </div>
          </div>

          {/* Recette collaborateur — visible quand un seul collaborateur est filtré */}
          {collaborateurBox && (
            <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#151e32] border border-slate-100 dark:border-white/5 rounded-2xl">
              <PraticienAvatar praticien={collaborateurBox.membre} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-[#001F3F] dark:text-white truncate">
                  Recette collaborateur — {collaborateurBox.membre.prenom} {collaborateurBox.membre.nom}
                </p>
                <p className="text-xs text-slate-400">
                  {collaborateurBox.factures} facture{collaborateurBox.factures !== 1 ? "s" : ""} · {formatEuro(collaborateurBox.recetteFacturee)} facturés
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Perçu</p>
                <p className="text-lg font-black text-emerald-600">{formatEuro(collaborateurBox.recetteCollab)}</p>
              </div>
            </div>
          )}

          {/* Répartition par mode de paiement */}
          {totalVisible > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {[
                { id: 'cb',      cfg: PAIEMENT_CONFIG.cb      },
                { id: 'especes', cfg: PAIEMENT_CONFIG.especes  },
                { id: 'cheque',  cfg: PAIEMENT_CONFIG.cheque   },
              ].filter(({ id }) => paiementStats[id] > 0).map(({ id, cfg }) => (
                <span key={id} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black ${cfg.color}`}>
                  <cfg.Icon size={11} />
                  {cfg.label} — {formatEuro(paiementStats[id])}
                </span>
              ))}
              {paiementStats.autre > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black text-slate-400 bg-slate-100 dark:bg-white/5">
                  Non renseigné — {formatEuro(paiementStats.autre)}
                </span>
              )}
            </div>
          )}

          {/* Répartition responsable / collaborateurs */}
          {splitTotals.hasAny && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400">
                Part collaborateurs — {formatEuro(splitTotals.collaborateur)}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black text-[#4931F7] bg-[#4931F7]/10">
                Part responsable — {formatEuro(splitTotals.responsable)}
              </span>
            </div>
          )}
        </header>

        {/* ── Contenu défilant ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
            {visibleDays.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-300 dark:text-slate-600">
                <TrendingUp size={48} className="mb-4" />
                <p className="text-sm font-bold">Aucune consultation sur cette période</p>
              </div>
            ) : (
              visibleDays.map(key => (
                <DayBlock key={key} dateKey={key} dayData={byDay[key]} onEdit={setEditingTx} onDelete={handleDeleteTx} deletingId={deletingId} showPraticien={cabinetMembres.length > 1} />
              ))
            )}

            {navMode === "month" && <StatsChart data={monthChartData} xKey="month" title="Consultations par mois" subtitle="12 derniers mois" />}
            {navMode === "week"  && <StatsChart data={weekChartData}  xKey="day"   title="Consultations de la semaine" subtitle={navLabel()} />}
            {navMode === "day"   && <StatsChart data={dayChartData}   xKey="hour"  title="Consultations de la journée" subtitle={navLabel()} />}
          </div>
        </div>
      </main>

      {/* ══ BOTTOM SHEET MOBILE ═════════════════════════════════════════════ */}
      {mobileSheetOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileSheetOpen(false)}
          />
          {/* Sheet */}
          <div className="relative bg-white dark:bg-[#0b1121] rounded-t-3xl p-5 max-h-[85dvh] overflow-y-auto custom-scrollbar">
            {/* Handle + header */}
            <div className="w-10 h-1 bg-slate-200 dark:bg-white/10 rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-5">
              <span className="text-sm font-black text-[#001F3F] dark:text-white">Filtres & calendrier</span>
              <button
                onClick={() => setMobileSheetOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <SidebarContent {...sidebarProps} />
          </div>
        </div>
      )}

      <AddPaymentModal
        show={showAddPayment}
        patients={patients}
        onClose={() => setShowAddPayment(false)}
        onSaved={() => router.refresh()}
      />

      <EditPaymentModal
        tx={editingTx}
        onClose={() => setEditingTx(null)}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
