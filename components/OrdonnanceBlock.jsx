"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, Square, Loader2, Search, X, Plus, Printer, ChevronDown, Download, CheckCircle2, CloudUpload } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import { OrdonnancePDF } from "@/components/OrdonnancePDF";
import EmailButton from "@/components/EmailButton";
import { resolveImages } from "@/lib/resolveImages";

// ── Base médicaments (podologie / podiatrie) ──────────────────────────────────
const MEDICATIONS = [
  // Antifongiques systémiques
  { name: "Terbinafine (Lamisil)", dci: "Terbinafine", defaultForm: "comprimé", defaultDosage: "250 mg", defaultQty: 1, defaultUnit: "boîte(s)", defaultInstructions: "1 comprimé par jour pendant 6 semaines (pied) / 12 semaines (ongle)" },
  { name: "Fluconazole (Triflucan)", dci: "Fluconazole", defaultForm: "gélule", defaultDosage: "150 mg", defaultQty: 4, defaultUnit: "gélule(s)", defaultInstructions: "1 gélule par semaine pendant 4 semaines" },
  { name: "Itraconazole (Sporanox)", dci: "Itraconazole", defaultForm: "gélule", defaultDosage: "100 mg", defaultQty: 1, defaultUnit: "boîte(s)", defaultInstructions: "2 gélules matin et soir pendant 7 jours / mois, 3 mois de suite" },
  // Antifongiques topiques
  { name: "Amorolfine (Loceryl)", dci: "Amorolfine", defaultForm: "vernis", defaultDosage: "5%", defaultQty: 1, defaultUnit: "flacon(s)", defaultInstructions: "Appliquer 1 fois par semaine sur les ongles atteints" },
  { name: "Ciclopirox (Mycoster)", dci: "Ciclopirox", defaultForm: "crème", defaultDosage: "1%", defaultQty: 1, defaultUnit: "tube(s)", defaultInstructions: "Appliquer 2 fois par jour sur la zone atteinte" },
  { name: "Éconazole (Pevaryl)", dci: "Éconazole", defaultForm: "crème", defaultDosage: "1%", defaultQty: 1, defaultUnit: "tube(s)", defaultInstructions: "Appliquer 2 fois par jour" },
  { name: "Miconazole (Daktarin)", dci: "Miconazole", defaultForm: "crème", defaultDosage: "2%", defaultQty: 1, defaultUnit: "tube(s)", defaultInstructions: "Appliquer 2 fois par jour" },
  { name: "Bifonazole (Amycor)", dci: "Bifonazole", defaultForm: "crème", defaultDosage: "1%", defaultQty: 1, defaultUnit: "tube(s)", defaultInstructions: "Appliquer 1 fois par jour le soir" },
  // Antalgiques
  { name: "Paracétamol", dci: "Paracétamol", defaultForm: "comprimé", defaultDosage: "1000 mg", defaultQty: 2, defaultUnit: "boîte(s)", defaultInstructions: "1 comprimé toutes les 6h si douleur, maximum 4g/j" },
  { name: "Ibuprofène (Advil / Nurofen)", dci: "Ibuprofène", defaultForm: "comprimé", defaultDosage: "400 mg", defaultQty: 1, defaultUnit: "boîte(s)", defaultInstructions: "1 comprimé 3 fois par jour au cours des repas pendant 5 jours" },
  { name: "Tramadol (Topalgic)", dci: "Tramadol", defaultForm: "comprimé", defaultDosage: "50 mg", defaultQty: 1, defaultUnit: "boîte(s)", defaultInstructions: "1 à 2 comprimés toutes les 6h si douleur" },
  // AINS topiques
  { name: "Diclofénac gel (Voltarène Emulgel)", dci: "Diclofénac", defaultForm: "gel", defaultDosage: "1%", defaultQty: 1, defaultUnit: "tube(s)", defaultInstructions: "Appliquer 3 à 4 fois par jour sur la zone douloureuse, ne pas exposer au soleil" },
  { name: "Kétoprofène gel (Ketum)", dci: "Kétoprofène", defaultForm: "gel", defaultDosage: "2,5%", defaultQty: 1, defaultUnit: "tube(s)", defaultInstructions: "Appliquer 2 à 3 fois par jour, ne pas exposer au soleil" },
  // Antibiotiques
  { name: "Amoxicilline + Ac. clavulanique (Augmentin)", dci: "Amoxicilline / Acide clavulanique", defaultForm: "comprimé", defaultDosage: "1g / 125mg", defaultQty: 1, defaultUnit: "boîte(s)", defaultInstructions: "1 comprimé matin, midi et soir pendant 7 jours" },
  { name: "Céfuroxime-axétil (Zinnat)", dci: "Céfuroxime", defaultForm: "comprimé", defaultDosage: "250 mg", defaultQty: 1, defaultUnit: "boîte(s)", defaultInstructions: "1 comprimé 2 fois par jour pendant 7 jours" },
  { name: "Clindamycine (Dalacine)", dci: "Clindamycine", defaultForm: "gélule", defaultDosage: "300 mg", defaultQty: 1, defaultUnit: "boîte(s)", defaultInstructions: "1 gélule 3 fois par jour pendant 7 jours" },
  // Antiseptiques
  { name: "Povidone iodée (Bétadine)", dci: "Povidone iodée", defaultForm: "solution", defaultDosage: "10%", defaultQty: 1, defaultUnit: "flacon(s)", defaultInstructions: "Désinfecter la zone lésée 2 fois par jour" },
  { name: "Chlorhexidine (Biseptine)", dci: "Chlorhexidine", defaultForm: "solution", defaultDosage: "0,05%", defaultQty: 1, defaultUnit: "flacon(s)", defaultInstructions: "Nettoyer la plaie 2 fois par jour" },
  // Kératolytiques
  { name: "Acide salicylique pommade", dci: "Acide salicylique", defaultForm: "pommade", defaultDosage: "20%", defaultQty: 1, defaultUnit: "tube(s)", defaultInstructions: "Appliquer le soir en couche épaisse sur la zone kératosique, recouvrir" },
  { name: "Urée crème", dci: "Urée", defaultForm: "crème", defaultDosage: "30%", defaultQty: 1, defaultUnit: "tube(s)", defaultInstructions: "Appliquer 1 à 2 fois par jour sur les zones hyperkératosiques" },
  // Corticoïdes topiques
  { name: "Bétaméthasone (Diprosone)", dci: "Bétaméthasone dipropionate", defaultForm: "crème", defaultDosage: "0,05%", defaultQty: 1, defaultUnit: "tube(s)", defaultInstructions: "Appliquer 1 fois par jour, cure courte de 7 jours" },
  { name: "Hydrocortisone", dci: "Hydrocortisone", defaultForm: "crème", defaultDosage: "1%", defaultQty: 1, defaultUnit: "tube(s)", defaultInstructions: "Appliquer 2 fois par jour" },
  // Anesthésiques
  { name: "Lidocaïne + Prilocaïne (EMLA)", dci: "Lidocaïne / Prilocaïne", defaultForm: "crème", defaultDosage: "5%", defaultQty: 1, defaultUnit: "tube(s)", defaultInstructions: "Appliquer 1h avant le soin sous pansement occlusif" },
  // Verrues / mycoses ongles
  { name: "Efinaconazole (Jublia)", dci: "Efinaconazole", defaultForm: "solution filmogène", defaultDosage: "10%", defaultQty: 1, defaultUnit: "flacon(s)", defaultInstructions: "Appliquer 1 fois par jour sur l'ongle atteint pendant 48 semaines" },
  { name: "Acide trichloracétique (TCA)", dci: "Acide trichloracétique", defaultForm: "solution", defaultDosage: "30%", defaultQty: 1, defaultUnit: "flacon(s)", defaultInstructions: "Application locale par le praticien" },
];

const UNITS = ["boîte(s)", "comprimé(s)", "gélule(s)", "tube(s)", "flacon(s)", "sachet(s)", "patch(s)", "ampoule(s)", "unité(s)"];
const FORMS = ["comprimé", "gélule", "crème", "pommade", "gel", "solution", "vernis", "patch", "sachet", "ampoule", "lotion", "spray", "solution filmogène", "suppositoire"];

// ── Génère le texte contenu pour le PDF ───────────────────────────────────────
const buildContenu = (items) =>
  items.map((item, i) =>
    `${i + 1}/ ${item.name}${item.dosage ? ` ${item.dosage}` : ""} ${item.form}\n   Qté : ${item.qty} ${item.unit}\n   ${item.instructions}`
  ).join("\n\n");

// ── Composant principal ───────────────────────────────────────────────────────
export default function OrdonnanceBlock({ selectedPatientObj, user, linkedConsultationId = null, linkedConsultationPatientId = null }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [items, setItems] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSendingQr, setIsSendingQr] = useState(false);
  const [qrConsultationId, setQrConsultationId] = useState(null);
  const [qrSent, setQrSent] = useState(false);
  const [qrDownloaded, setQrDownloaded] = useState(false);
  // 'idle' | 'pending' | 'saving' | 'saved'
  const [syncStatus, setSyncStatus] = useState('idle');

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const autoSaveTimerRef = useRef(null);
  const handleSendQrRef = useRef(null);

  // ── Recherche ───────────────────────────────────────────────────────────────
  const handleSearch = (term) => {
    setSearchTerm(term);
    if (term.length < 2) { setSearchResults([]); return; }
    const q = term.toLowerCase();
    setSearchResults(
      MEDICATIONS.filter(m =>
        m.name.toLowerCase().includes(q) || m.dci.toLowerCase().includes(q)
      ).slice(0, 7)
    );
  };

  const addMedication = (med) => {
    const newItem = {
      id: Date.now(),
      name: med.name,
      dosage: med.defaultDosage,
      form: med.defaultForm,
      qty: med.defaultQty,
      unit: med.defaultUnit,
      instructions: med.defaultInstructions,
    };
    setItems(prev => [...prev, newItem]);
    setExpandedId(newItem.id);
    setSearchTerm("");
    setSearchResults([]);
  };

  const updateItem = (id, field, value) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));

  const removeItem = (id) => setItems(prev => prev.filter(i => i.id !== id));

  // ── Dictée IA ───────────────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        await processDictation(blob);
      };
      mr.start();
      setIsRecording(true);
    } catch { alert("Accès au microphone refusé."); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const processDictation = async (blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("audio", blob, "ordonnance.webm");
      const res = await fetch("/api/ordonnance-dictation", { method: "POST", body: formData });
      const data = await res.json();
      if (data.items?.length) {
        setItems(prev => [...prev, ...data.items.map(item => ({ ...item, id: Date.now() + Math.random() }))]);
      }
    } catch { alert("Erreur lors de l'analyse audio."); }
    finally { setIsProcessing(false); }
  };

  // ── Impression ──────────────────────────────────────────────────────────────
  const handlePrint = async () => {
    if (!items.length) { alert("Ajoutez au moins un médicament."); return; }
    const contenu = buildContenu(items);
    const branding = await resolveImages(user || {});
    const blob = await pdf(
      <OrdonnancePDF data={{ contenu, items }} patient={selectedPatientObj} branding={branding} />
    ).toBlob();
    window.open(URL.createObjectURL(blob), "_blank");
    // Si un QR était en attente, on le marque collecté et on arrête le polling
    if (qrSent && qrConsultationId && !qrDownloaded) {
      setQrDownloaded(true);
      try {
        await fetch(`/api/consultations/${qrConsultationId}/sign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signature: "DOWNLOADED", type: "ordonnance" }),
        });
      } catch {}
    }
  };

  // ── Envoi sur QR (auto ou manuel) ───────────────────────────────────────────
  const handleSendQr = useCallback(async (currentItems) => {
    const itemsToSave = currentItems ?? items;
    if (!selectedPatientObj?.id || !itemsToSave.length) return;
    setIsSendingQr(true);
    setSyncStatus('saving');
    try {
      const contenu = buildContenu(itemsToSave);
      const ordonnanceData = { contenu, items: itemsToSave };
      const canLink = linkedConsultationId && linkedConsultationPatientId &&
        String(selectedPatientObj.id) === String(linkedConsultationPatientId);
      let res, id;
      if (canLink) {
        res = await fetch(`/api/consultations/${linkedConsultationId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ordonnanceData }),
        });
        id = linkedConsultationId;
      } else {
        // Si déjà une consultation créée, on la met à jour
        if (qrConsultationId) {
          res = await fetch(`/api/consultations/${qrConsultationId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ordonnanceData }),
          });
          id = qrConsultationId;
        } else {
          res = await fetch("/api/ordonnance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ patientId: selectedPatientObj.id, ordonnanceData }),
          });
          if (res.ok) {
            const data = await res.json();
            id = data.consultationId;
          }
        }
      }
      if (res?.ok) {
        setQrConsultationId(id);
        setQrSent(true);
        setQrDownloaded(false);
        setSyncStatus('saved');
      } else {
        setSyncStatus('idle');
      }
    } catch { setSyncStatus('idle'); }
    finally { setIsSendingQr(false); }
  }, [selectedPatientObj?.id, linkedConsultationId, linkedConsultationPatientId, qrConsultationId, items]);

  // ── Polling téléchargement patient ───────────────────────────────────────────
  useEffect(() => {
    if (!qrSent || !qrConsultationId || qrDownloaded) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/consultations/${qrConsultationId}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.signatureFacture === 'DOWNLOADED') {
            setQrDownloaded(true);
            clearInterval(interval);
          }
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [qrSent, qrConsultationId, qrDownloaded]);

  // ── Garde la ref à jour pour éviter les closures périmées ───────────────────
  useEffect(() => { handleSendQrRef.current = handleSendQr; }, [handleSendQr]);

  // ── Auto-envoi QR — debounce 1.5s après chaque modification des items ───────
  useEffect(() => {
    if (!selectedPatientObj?.id || !items.length) return;
    setSyncStatus('pending');
    clearTimeout(autoSaveTimerRef.current);
    const snapshot = items; // snapshot pour éviter de capturer des items futurs
    autoSaveTimerRef.current = setTimeout(() => handleSendQrRef.current?.(snapshot), 1500);
    return () => clearTimeout(autoSaveTimerRef.current);
  }, [items, selectedPatientObj?.id]);

  const inputClass = "bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-[#001F3F] outline-none focus:border-[#4931F7] transition-all w-full";

  return (
    <div className="w-full max-w-5xl bg-white dark:bg-[#151e32] rounded-[2.5rem] p-8 md:p-12 border border-slate-200/60 dark:border-transparent flex flex-col animate-in fade-in zoom-in">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-[#001F3F] dark:text-white tracking-tight">Ordonnance médicale</h2>
          {selectedPatientObj?.id
            ? <p className="text-sm text-slate-500 mt-1">{selectedPatientObj.prenom} {selectedPatientObj.nom}</p>
            : <p className="text-sm text-slate-400 mt-1 italic">Aucun patient sélectionné</p>
          }
        </div>
        <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">{new Date().toLocaleDateString("fr-FR")}</span>
      </div>

      {/* Contenu */}
      <div className="space-y-5">

        {/* Barre de recherche + micro */}
        <div className="flex gap-3 items-center">
          {/* Bouton micro — verre, rounded-full */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              isProcessing ? "bg-slate-100 text-slate-400" :
              isRecording ? "bg-red-500 text-white animate-pulse shadow-lg shadow-red-500/30" :
              "bg-[#4931F7] text-white hover:bg-[#3b26c6] shadow-md shadow-[#4931F7]/30"
            }`}
            title="Dicter l'ordonnance par IA"
          >
            {isProcessing ? <Loader2 size={20} className="animate-spin" /> :
             isRecording ? <Square size={18} className="fill-current" /> :
             <Mic size={20} />}
          </button>

          {/* Recherche médicament — verre, rounded-full */}
          <div className="flex-1 relative">
            <div className="flex items-center gap-2 bg-white/80 dark:bg-white/5 backdrop-blur-sm border border-slate-200/60 dark:border-white/10 rounded-full px-5 py-3 focus-within:border-slate-300 dark:focus-within:border-white/20 transition-all shadow-sm">
              <Search size={16} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Rechercher un médicament (nom ou DCI)..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm font-medium text-[#001F3F] dark:text-white placeholder:text-slate-400"
              />
              {searchTerm && (
                <button onClick={() => { setSearchTerm(""); setSearchResults([]); }} className="text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Dropdown résultats */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl z-20 overflow-hidden">
                {searchResults.map((med) => (
                  <button
                    key={med.name}
                    onClick={() => addMedication(med)}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                  >
                    <p className="font-bold text-sm text-[#001F3F]">{med.name}</p>
                    <p className="text-xs text-slate-400">{med.dci} · {med.defaultForm} · {med.defaultDosage}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Indication dictée */}
        {isRecording && (
          <div className="flex items-center gap-2 text-red-500 text-sm font-bold animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block animate-ping" />
            Dictée en cours… Parlez naturellement, ex : "Paracétamol 1g, 2 boîtes, 1 comprimé 3 fois par jour"
          </div>
        )}

        {/* Liste des médicaments */}
        {items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={item.id} className="border border-slate-100 rounded-xl overflow-hidden">
                {/* Ligne résumé */}
                <div className="flex items-center gap-3 px-4 py-3 bg-slate-50">
                  <span className="text-xs font-black text-[#4931F7] w-5 shrink-0">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[#001F3F] truncate">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.dosage} · {item.form} · {item.qty} {item.unit}</p>
                  </div>
                  <button
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    className="text-slate-400 hover:text-[#4931F7] transition-colors p-1"
                  >
                    <ChevronDown size={16} className={`transition-transform ${expandedId === item.id ? "rotate-180" : ""}`} />
                  </button>
                  <button onClick={() => removeItem(item.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                    <X size={16} />
                  </button>
                </div>

                {/* Détails éditables */}
                {expandedId === item.id && (
                  <div className="px-4 py-4 grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white">
                    <div className="col-span-2 sm:col-span-3 space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Médicament</label>
                      <input value={item.name} onChange={(e) => updateItem(item.id, "name", e.target.value)} className={inputClass} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dosage</label>
                      <input value={item.dosage} onChange={(e) => updateItem(item.id, "dosage", e.target.value)} className={inputClass} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Forme</label>
                      <select value={item.form} onChange={(e) => updateItem(item.id, "form", e.target.value)} className={inputClass}>
                        {FORMS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantité</label>
                      <div className="flex gap-2">
                        <input type="number" min="1" value={item.qty} onChange={(e) => updateItem(item.id, "qty", e.target.value)} className={`${inputClass} w-16`} />
                        <select value={item.unit} onChange={(e) => updateItem(item.id, "unit", e.target.value)} className={inputClass}>
                          {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="col-span-2 sm:col-span-3 space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Posologie / Instructions</label>
                      <textarea
                        value={item.instructions}
                        onChange={(e) => updateItem(item.id, "instructions", e.target.value)}
                        rows={2}
                        className={`${inputClass} resize-none`}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-slate-300">
            <Plus size={36} className="mb-2" />
            <p className="text-sm font-bold">Recherchez un médicament ou dictez l'ordonnance</p>
          </div>
        )}

        {/* Actions */}
        {items.length > 0 && (
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-[#001F3F] text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-colors shadow-lg"
            >
              <Printer size={18} /> Imprimer
            </button>

            <EmailButton
              patient={selectedPatientObj}
              type="ordonnance"
              filename={`Ordonnance_${selectedPatientObj?.nom || 'patient'}.pdf`}
              generatePdf={async () => {
                const branding = await resolveImages(user || {});
                return pdf(
                  <OrdonnancePDF data={{ contenu: buildContenu(items), items }} patient={selectedPatientObj} branding={branding} />
                ).toBlob();
              }}
            />

            {/* Indicateur sync auto */}
            <div className="flex items-center gap-1.5 text-xs font-semibold shrink-0">
              {syncStatus === 'pending' && (
                <><Loader2 size={13} className="animate-spin text-slate-400" /><span className="text-slate-400">Enregistrement…</span></>
              )}
              {syncStatus === 'saving' && (
                <><CloudUpload size={13} className="text-[#4ECDC4] animate-pulse" /><span className="text-[#4ECDC4]">Envoi…</span></>
              )}
              {syncStatus === 'saved' && !qrDownloaded && (
                <><CheckCircle2 size={13} className="text-[#4ECDC4]" /><span className="text-[#4ECDC4]">Sur le QR</span></>
              )}
              {qrDownloaded && (
                <><CheckCircle2 size={13} className="text-green-500" /><span className="text-green-500">Téléchargée</span></>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
