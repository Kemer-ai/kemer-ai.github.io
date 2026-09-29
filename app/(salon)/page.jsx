"use client";
// Accueil de la démo : mêmes composants que l'accueil de l'app (WelcomeHeader, PatientSelector,
// RecordingBlock, LiveConsultationView, ValidationBlock, importés de app/Home.jsx), pilotés par
// une dictée scriptée au lieu du micro. Le CR se construit au fil de la dictée, comme en vrai.
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Footprints, Scissors, Receipt, FileSignature, FileText, ChevronRight, X, Check, Zap, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import {
  WelcomeHeader, PatientSelector, RecordingBlock, LiveConsultationView, ValidationBlock,
  PedicurieBlock, FacturationBlock,
} from "@/app/Home";
import OrdonnanceBlock from "@/components/OrdonnanceBlock";
import ConsultationModal from "@/components/ConsultationModal";
import { formatPrenom, formatNom } from "@/lib/formatName";
import { useDemo } from "./demo-context";
import { PRATICIEN_DEMO, SCENARIOS, SCENARIOS_PEDICURIE, PALIERS } from "./data";
import { definirDictee, definirVitesse, installerFauxEnregistreur } from "./faux-micro";
import { enregistrerCR } from "./mock-api";

const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

// Copie de Home.jsx (renderValue) : rendu d'une valeur de CR.
const renderValue = (val) => {
  if (val === null || val === undefined) return "Non précisé";
  if (Array.isArray(val)) return <ul className="list-disc ml-4 space-y-1">{val.map((item, i) => <li key={i}>{typeof item === "object" ? renderValue(item) : String(item)}</li>)}</ul>;
  if (typeof val === "object") return <div className="space-y-2">{Object.entries(val).map(([k, v]) => (<div key={k} className="flex flex-col"><span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{k.replace(/_/g, " ")}</span><div className="text-sm">{renderValue(v)}</div></div>))}</div>;
  return String(val);
};

const MODES = [
  ["podologie", "Podologie", Footprints],
  ["pedicurie", "Pédicurie", Scissors],
  ["facturation", "Facturation", Receipt],
  ["ordonnance", "Ordonnance", FileSignature],
];

// Copie de la section « Récents » de Home.jsx (elle n'est pas exportable : elle vit dans le corps de la page).
function RecentsSection({ consultations, router, onOpen }) {
  if (!consultations.length) return (
    <div className="w-full max-w-5xl mt-14 mb-8">
      <p className="text-sm text-slate-400 text-center py-6 italic font-medium">Aucun document récent.</p>
    </div>
  );

  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const groups = {};
  consultations.forEach((c) => {
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
    if (c.devisData) badges.push(<DocBadge key="facture" icon={<Receipt size={9} />} label={c.typeConsultation === "facturation" ? "Facture" : "Devis"} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" />);
    if (c.typeConsultation === "pedicurie" && c.transcription) badges.push(<DocBadge key="pedi" icon={<Scissors size={9} />} label="Pédicurie" color="bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" />);
    return badges;
  };

  const getTypeIcon = (c) => {
    if (c.typeConsultation === "facturation") return <Receipt size={16} className="text-emerald-500" />;
    if (c.typeConsultation === "pedicurie") return <Scissors size={16} className="text-amber-500" />;
    return <FileText size={16} className="text-[#4ECDC4]" />;
  };

  return (
    <div className="w-full max-w-5xl mt-14 mb-8 animate-in fade-in duration-500 delay-200 space-y-8">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Récents</h3>
        <button onClick={() => router.push("/patients/")} className="text-xs font-bold text-[#4931F7] hover:underline">Tout voir</button>
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
                <div key={consult.id} onClick={() => onOpen(consult.id)} className="bg-white dark:bg-[#151e32] border border-slate-200/60 dark:border-white/5 rounded-2xl p-4 flex items-center gap-4 group cursor-pointer hover:border-[#4931F7]/50 hover:shadow-lg transition-all">
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
}

export default function AccueilDemo() {
  const router = useRouter();
  const { patients, ajouterConsultation, ajouterPatient } = useDemo();
  const [selectedConsultationId, setSelectedConsultationId] = useState(null);
  // Facture créée en fin de consultation : l'ordonnance qui suit lui est rattachée (comme dans l'app).
  const [lieeId, setLieeId] = useState(null);
  const [lieePatient, setLieePatient] = useState(null);

  const [selectedPatient, setSelectedPatient] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [mode, setMode] = useState(null);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [nouveau, setNouveau] = useState({ prenom: "", nom: "", telephone: "", email: "" });

  // Dictée scriptée
  const [showLive, setShowLive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mots, setMots] = useState(0);
  const [finalisation, setFinalisation] = useState(false);
  const [consultation, setConsultation] = useState(null);
  const [dossier, setDossier] = useState(false);
  const [rapide, setRapide] = useState(false);
  const [panneau, setPanneau] = useState(true);
  const canvasRef = useRef(null);

  const patientObj = patients.find((p) => String(p.id) === String(selectedPatient));
  const scenario = SCENARIOS.find((s) => s.patientId === selectedPatient) || SCENARIOS[0];
  const tousLesMots = useMemo(() => scenario.dictee.split(" "), [scenario]);
  const fraction = tousLesMots.length ? mots / tousLesMots.length : 0;

  // Pédicurie : la dictée scriptée dépend du patient ; ordonnance : le micro est simulé.
  useEffect(() => {
    definirDictee((SCENARIOS_PEDICURIE.find((x) => x.patientId === selectedPatient) || SCENARIOS_PEDICURIE[0]).dictee);
  }, [selectedPatient]);
  useEffect(() => { definirVitesse(rapide); }, [rapide]);
  useEffect(() => (mode === "ordonnance" ? installerFauxEnregistreur() : undefined), [mode]);

  // Défilement de la dictée (chronomètre au rythme réel, mots au rythme choisi).
  useEffect(() => {
    if (!isRecording || isPaused) return;
    const m = setInterval(() => setMots((x) => Math.min(x + 1, tousLesMots.length)), rapide ? 55 : 190);
    const t = setInterval(() => setRecordingTime((x) => x + 1), rapide ? 333 : 1000);
    return () => { clearInterval(m); clearInterval(t); };
  }, [isRecording, isPaused, rapide, tousLesMots.length]);

  // Forme d'onde factice dans le canvas du vrai bloc (mêmes barres que Home.jsx).
  useEffect(() => {
    if (!isRecording) return;
    let raf;
    const barres = Array(32).fill(0);
    const dessiner = () => {
      raf = requestAnimationFrame(dessiner);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      const gap = 2, bw = (width - 31 * gap) / 32;
      for (let i = 0; i < 32; i++) {
        const cible = isPaused ? 0.05 : 0.15 + Math.random() * 0.75 * Math.sin((i / 31) * Math.PI);
        barres[i] += (cible - barres[i]) * 0.25;
        const h = Math.max(2, barres[i] * height);
        ctx.fillStyle = "#4931F7";
        ctx.beginPath();
        ctx.roundRect(i * (bw + gap), (height - h) / 2, bw, h, 4);
        ctx.fill();
      }
    };
    dessiner();
    return () => cancelAnimationFrame(raf);
  }, [isRecording, isPaused, showLive]);

  const liveReport = useMemo(() => {
    if (!showLive) return null;
    const r = {};
    for (const [cle, palier] of Object.entries(PALIERS)) {
      if ((finalisation || consultation) || fraction >= palier) r[cle] = scenario.reportData[cle];
    }
    return r;
  }, [showLive, fraction, finalisation, consultation, scenario]);

  const startRecording = () => {
    if (!selectedPatient) return;
    setMots(0); setRecordingTime(0); setIsPaused(false); setConsultation(null); setFinalisation(false);
    setIsRecording(true); setShowLive(true); setPanneau(false);
  };
  const stopRecording = () => {
    setIsRecording(false);
    setFinalisation(true);
    setTimeout(() => {
      const c = {
        id: `demo-live-${Date.now()}`,
        patientId: selectedPatient,
        praticienId: PRATICIEN_DEMO.id,
        createdAt: new Date().toISOString(),
        typeConsultation: "podologie",
        motif: scenario.reportData.motif_consultation,
        reportData: scenario.reportData,
        transcription: scenario.dictee,
        devisData: null, factureData: null, ordonnanceData: null,
        signatureDevis: null, signatureFacture: null, photos: null, notes: null,
      };
      enregistrerCR(c, patientObj, scenario.patientBrut);
      ajouterConsultation(selectedPatient, c);
      setConsultation(c);
      setFinalisation(false);
    }, rapide ? 900 : 1800);
  };

  const remettreAZero = () => {
    setShowLive(false); setIsRecording(false); setIsPaused(false); setRecordingTime(0); setMots(0);
    setFinalisation(false); setConsultation(null); setDossier(false);
    setSelectedPatient(""); setSearchTerm(""); setMode(null);
    setLieeId(null); setLieePatient(null);
  };

  // Fin de consultation : le CR (ou le soin) mène à la facture, la facture à l'ordonnance.
  const allerFacturation = () => { setDossier(false); setShowLive(false); setMode("facturation"); };

  // Un clic : patient + mode podologie prêts, il ne reste que le micro.
  const preparer = (s) => {
    remettreAZero();
    const p = patients.find((x) => x.id === s.patientId);
    setSelectedPatient(s.patientId);
    setSearchTerm(`${p.prenom} ${p.nom}`);
    setMode(s.mode || "podologie");
  };

  const enregistrerPatient = (e) => {
    e.preventDefault();
    const p = {
      id: `demo-new-${Date.now()}`, ...nouveau, praticienId: PRATICIEN_DEMO.id, createdAt: new Date().toISOString(),
      consultations: [], pays: "France", adresse: null, codePostal: null, ville: null, dateNaissance: null, cabinetId: null,
    };
    ajouterPatient(p);
    setSelectedPatient(p.id); setSearchTerm(`${p.prenom} ${p.nom}`);
    setNouveau({ prenom: "", nom: "", telephone: "", email: "" });
    setShowNewPatient(false);
  };

  const recentes = useMemo(
    () => patients.flatMap((p) => p.consultations.map((c) => ({ ...c, patient: p }))).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 15),
    [patients],
  );

  const dossierConsult = consultation && { ...consultation, patient: patientObj };

  return (
    <main className="min-h-[calc(100vh-5rem)] flex flex-col items-center p-6 bg-slate-50/50 dark:bg-[#0b1121] transition-colors duration-300 pb-24 md:pb-6 relative">
      <WelcomeHeader user={PRATICIEN_DEMO} />

      <PatientSelector
        patients={patients}
        selectedPatient={selectedPatient}
        onPatientChange={(id) => { setSelectedPatient(id); if (!id) setMode(null); }}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        disabled={isRecording}
        setShowNewPatientModal={setShowNewPatient}
      />

      {selectedPatient && !dossier && (
        <>
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6 w-full max-w-5xl">
            {MODES.map(([id, label, Icon]) => (
              <button key={id} onClick={() => setMode(id)} disabled={isRecording}
                className={`px-5 py-2.5 rounded-[2rem] text-sm font-extrabold transition-all flex items-center gap-2 disabled:opacity-50 ${mode === id ? "bg-[#4ECDC4] text-white dark:text-[#0b1121] shadow-lg shadow-[#4ECDC4]/25" : "bg-slate-200 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-white/10"}`}>
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>

          {mode === "podologie" && (
            <div className="w-full flex justify-center animate-in fade-in slide-in-from-bottom-2 duration-200">
              {showLive ? (
                <LiveConsultationView
                  patientName={patientObj ? `${formatPrenom(patientObj.prenom) || ""} ${(patientObj.nom || "").toUpperCase()}`.trim() : ""}
                  isRecording={isRecording}
                  isPaused={isPaused}
                  recordingTime={recordingTime}
                  formatTime={formatTime}
                  liveTranscript={tousLesMots.slice(0, mots).join(" ")}
                  interimTranscript=""
                  liveReport={liveReport}
                  isGeneratingLiveCR={false}
                  isFinalizingLive={finalisation}
                  isFinalized={!!consultation}
                  assistantQuestions={fraction > 0.5 ? scenario.questions : []}
                  isLoadingAssistant={false}
                  canvasRef={canvasRef}
                  speechApiActive
                  onStop={stopRecording}
                  onPause={() => setIsPaused(true)}
                  onResume={() => setIsPaused(false)}
                  onGenerateNow={() => {}}
                  onViewDossier={() => { setShowLive(false); setDossier(true); }}
                  renderValue={renderValue}
                  assistantEnabled
                  liveText=""
                />
              ) : (
                <RecordingBlock
                  isRecording={isRecording} isPaused={isPaused} isProcessing={false}
                  startRecording={startRecording} stopRecording={stopRecording}
                  pauseRecording={() => setIsPaused(true)} resumeRecording={() => setIsPaused(false)}
                  canvasRef={canvasRef} recordingTime={recordingTime} formatTime={formatTime}
                  error="" canRetry={false} uploadAttempt={0} onRetry={() => {}} onImportAudio={null}
                />
              )}
            </div>
          )}
          {mode === "pedicurie" && (
            <div className="w-full flex justify-center animate-in fade-in slide-in-from-bottom-2 duration-200">
              <PedicurieBlock key={`ped-${selectedPatient}`} selectedPatientObj={patientObj} user={PRATICIEN_DEMO}
                onNewPatient={() => setShowNewPatient(true)} onSaved={() => {}} onGoToFacturation={allerFacturation} />
            </div>
          )}
          {mode === "facturation" && (
            <div className="w-full flex justify-center animate-in fade-in slide-in-from-bottom-2 duration-200">
              <FacturationBlock key={`fact-${selectedPatient}`} selectedPatientObj={patientObj} user={PRATICIEN_DEMO}
                linkedConsultationId={lieeId} linkedConsultationPatientId={lieePatient}
                onNewPatient={() => setShowNewPatient(true)} onGoToOrdonnance={() => setMode("ordonnance")}
                onConsultationSaved={(id, pid) => { setLieeId(id); setLieePatient(pid); }} />
            </div>
          )}
          {mode === "ordonnance" && (
            <div className="w-full flex justify-center animate-in fade-in slide-in-from-bottom-2 duration-200">
              <OrdonnanceBlock key={`ord-${selectedPatient}`} selectedPatientObj={patientObj} user={PRATICIEN_DEMO}
                linkedConsultationId={lieeId} linkedConsultationPatientId={lieePatient} />
            </div>
          )}
        </>
      )}

      {dossier && dossierConsult && (
        <ValidationBlock
          consultation={dossierConsult}
          user={PRATICIEN_DEMO}
          patientObj={patientObj}
          onNewConsultation={remettreAZero}
          renderValue={renderValue}
          isGeneratingReport={false}
          generateStep={0}
          onGoToFacturation={allerFacturation}
        />
      )}


      {/* --- RÉCENTS : même section que l'accueil de l'app (app/Home.jsx) --- */}
      <RecentsSection consultations={recentes} router={router} onOpen={setSelectedConsultationId} />
      <ConsultationModal consultationId={selectedConsultationId} onClose={() => setSelectedConsultationId(null)} />

      {showNewPatient && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0b1121]/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#151e32] w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
              <h3 className="text-xl font-black text-[#001F3F] dark:text-white">Créer un patient</h3>
              <button onClick={() => setShowNewPatient(false)} className="text-slate-400 hover:text-red-500 transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={enregistrerPatient} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[["prenom", "Prénom *", true], ["nom", "Nom *", true]].map(([k, l, r]) => (
                  <div key={k}>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 block">{l}</label>
                    <input required={r} autoFocus={k === "prenom"} value={nouveau[k]}
                      onChange={(e) => { const v = e.target.value; setNouveau({ ...nouveau, [k]: k === "nom" ? v.toUpperCase() : v.length ? v.charAt(0).toUpperCase() + v.slice(1) : v }); }}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm focus:border-[#4931F7] outline-none dark:text-white" />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[["telephone", "Téléphone", "tel", "06..."], ["email", "Email", "email", "exemple@mail.com"]].map(([k, l, t, ph]) => (
                  <div key={k}>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">{l}</label>
                    <input type={t} value={nouveau[k]} placeholder={ph} onChange={(e) => setNouveau({ ...nouveau, [k]: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-sm focus:border-[#4931F7] outline-none dark:text-white" />
                  </div>
                ))}
              </div>
              <button type="submit" className="w-full py-4 mt-2 bg-[#4931F7] text-white font-bold rounded-xl shadow-lg shadow-[#4931F7]/30 hover:bg-[#3b26c6] transition-all flex items-center justify-center gap-2 active:scale-95">
                <Check size={18} /> Enregistrer le patient
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Raccourcis du présentateur : ne fait pas partie de l'interface Kemer. */}
      <div className="fixed left-4 bottom-24 md:bottom-4 z-[120]">
        {panneau ? (
          <div className="bg-[#001F3F]/95 text-white rounded-2xl shadow-2xl p-3 w-60 backdrop-blur">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#4ECDC4]">Scénarios de démo</span>
              <button onClick={() => setPanneau(false)} className="text-white/50 hover:text-white"><ChevronDown size={14} /></button>
            </div>
            <div className="space-y-1.5">
              {[...SCENARIOS, ...SCENARIOS_PEDICURIE].map((s) => (
                <button key={s.id} onClick={() => preparer(s)} disabled={isRecording}
                  className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 text-xs font-bold transition-colors">
                  <span className="text-base">{s.icone}</span>
                  <span className="min-w-0"><span className="block truncate">{s.titre}</span><span className="block text-[10px] font-medium text-white/50 truncate">{s.sous}</span></span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-[10px] font-medium text-white/50 leading-snug">
              QR patient (Profil) : code <b className="text-white/80">DEL</b> devis à signer · <b className="text-white/80">GIR</b> facture · <b className="text-white/80">ROU</b> ordonnance
            </p>
            <div className="flex gap-1.5 mt-2">
              <button onClick={() => setRapide((r) => !r)}
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-black transition-colors ${rapide ? "bg-amber-400 text-[#001F3F]" : "bg-white/10 hover:bg-white/20"}`}>
                <Zap size={11} /> ×3
              </button>
              <button onClick={remettreAZero} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-black transition-colors">
                <RotateCcw size={11} /> Reset
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setPanneau(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#001F3F]/90 text-white text-[11px] font-black shadow-xl">
            <ChevronUp size={12} /> Scénarios
          </button>
        )}
      </div>
    </main>
  );
}
