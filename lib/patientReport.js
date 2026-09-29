// Compte rendu destiné au patient (PDF joint à l'e-mail) : construction de la consigne Gemini et
// mise en forme de sa réponse pour components/PatientReportPDF.jsx. Sans dépendance à next/server,
// pour rester testable sous node --test (voir tests/patientReport.test.js).

const POINT_NUL = null;

/** Le compte rendu praticien (JSON libre, clés variables) en texte lisible par le modèle. */
export function crEnTexte(reportData) {
  return Object.entries(reportData || {})
    .filter(([k]) => k !== "resume_confreres")
    .map(([k, v]) => {
      const val = Array.isArray(v) ? v.join(" ; ") : typeof v === "object" && v !== null ? JSON.stringify(v) : String(v ?? "");
      return `${k.replace(/_/g, " ").toUpperCase()} : ${val}`;
    })
    .join("\n");
}

export function construireConsigne(reportData) {
  return `Voici le compte rendu d'une consultation podologique, rédigé pour le praticien :

${crEnTexte(reportData)}

Réécris-le pour le PATIENT, en français, en t'adressant à lui ("vous"), avec un ton clair, bienveillant et sans jargon inutile. Réponds uniquement avec un objet JSON de cette forme (toute clé sans information dans le compte rendu doit valoir null, ou [] pour une liste) :

{
  "synthese": {
    "motif": "1 à 2 phrases",
    "diagnostic": { "titre": "court", "detail": "1 à 2 phrases" },
    "objectifs": ["…"],
    "traitement": ["…"],
    "dureeSuivi": "ex. 1 à 3 ans, ou null"
  },
  "histoire": {
    "intro": "phrase d'introduction sur l'histoire du patient, ou null",
    "antecedents": ["…"],
    "symptomes": [{ "icone": "activity | footprints | droplet | gauge", "texte": "court" }],
    "conclusion": "phrase, ou null"
  },
  "examen": {
    "statique": { "data": [{ "label": "Charge droite", "value": 54 }, { "label": "Charge gauche", "value": 46 }], "note": "…" },
    "pressions": { "data": [{ "label": "Talon droit", "value": 40 }, { "label": "Talon gauche", "value": 33 }], "note": "…" },
    "general": ["…"]
  },
  "analyse": { "intro": "…", "constats": ["…"], "precision": "…" },
  "plan": [{ "titre": "Les 3 prochains mois", "couleur": "teal | purple", "items": ["…"] }],
  "exercices": { "intro": "…", "items": ["…"] },
  "pointsImportants": ["…"],
  "conclusion": "3 à 4 phrases"
}

Règles impératives :
- N'invente rien : n'utilise que ce qui figure dans le compte rendu. Une information absente vaut null ou [].
- "statique" et "pressions" : uniquement si le compte rendu donne explicitement des pourcentages ; sinon null.
- "plan" : 2 ou 3 étapes au plus, seulement si le compte rendu décrit un suivi ; sinon [].
- Phrases courtes. Pas de diagnostic ni de promesse de guérison que le compte rendu ne contient pas.`;
}

const texte = (v, max = 600) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : POINT_NUL);
const liste = (v, max = 8) => (Array.isArray(v) ? v.map((x) => texte(x, 300)).filter(Boolean).slice(0, max) : []);
const ICONES = new Set(["activity", "footprints", "droplet", "gauge"]);
const COULEURS_PART = ["#4931F7", "#4ECDC4"];

function anneau(v) {
  if (!v || !Array.isArray(v.data)) return POINT_NUL;
  const data = v.data
    .filter((d) => d && typeof d.label === "string" && Number.isFinite(d.value) && d.value >= 0 && d.value <= 100)
    .slice(0, 2)
    .map((d, i) => ({ label: d.label.trim().slice(0, 40), value: Math.round(d.value), color: COULEURS_PART[i] }));
  return data.length === 2 ? { data, note: texte(v.note, 200) } : POINT_NUL;
}

/**
 * Réponse brute du modèle → structure attendue par PatientReportPDF. Tolère un JSON partiel ou mal
 * typé : ce qui n'est pas exploitable est écarté plutôt que d'échouer.
 */
export function normaliser(brut, { patient, date } = {}) {
  const b = brut && typeof brut === "object" ? brut : {};
  const sy = b.synthese || {};
  const hi = b.histoire || {};
  const ex = b.examen || {};
  const an = b.analyse || {};
  return {
    date: date || null,
    patient: { prenom: patient?.prenom || "", nom: patient?.nom || "", dateNaissance: patient?.dateNaissanceFr || null },
    synthese: {
      motif: texte(sy.motif),
      diagnostic: sy.diagnostic && texte(sy.diagnostic.titre, 120) ? { titre: texte(sy.diagnostic.titre, 120), detail: texte(sy.diagnostic.detail) } : POINT_NUL,
      objectifs: liste(sy.objectifs),
      traitement: liste(sy.traitement),
      dureeSuivi: texte(sy.dureeSuivi, 60),
    },
    histoire: {
      intro: texte(hi.intro),
      antecedents: liste(hi.antecedents),
      symptomes: (Array.isArray(hi.symptomes) ? hi.symptomes : [])
        .filter((f) => f && texte(f.texte, 80))
        .slice(0, 4)
        .map((f) => ({ icone: ICONES.has(f.icone) ? f.icone : "activity", texte: texte(f.texte, 80) })),
      conclusion: texte(hi.conclusion),
    },
    examen: { statique: anneau(ex.statique), pressions: anneau(ex.pressions), general: liste(ex.general, 6) },
    analyse: { intro: texte(an.intro), constats: liste(an.constats, 5), precision: texte(an.precision) },
    plan: (Array.isArray(b.plan) ? b.plan : [])
      .filter((e) => e && texte(e.titre, 60) && liste(e.items).length)
      .slice(0, 3)
      .map((e) => ({ titre: texte(e.titre, 60), couleur: e.couleur === "teal" ? "teal" : "purple", items: liste(e.items, 5) })),
    exercices: { intro: texte(b.exercices?.intro), items: liste(b.exercices?.items, 6) },
    pointsImportants: liste(b.pointsImportants, 5),
    conclusion: texte(b.conclusion, 1200),
  };
}

/** Vrai si le résultat ne contient rien d'exploitable (le PDF serait vide) : l'appelant se replie sur l'ancien PDF. */
export function estVide(d) {
  return !(d.synthese.motif || d.synthese.diagnostic || d.synthese.objectifs.length || d.synthese.traitement.length || d.conclusion);
}
