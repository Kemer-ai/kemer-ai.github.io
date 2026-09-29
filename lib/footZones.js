// Anatomical zones for the 3D foot viewer
// position: [x, y, z] — foot pointing +Z (toes), heel -Z, medial (big toe) side at -X (right foot)

export const FOOT_ZONES = {
  hallux: {
    label: "Hallux",
    sublabel: "Gros orteil",
    color: "#ef4444",
    position: [-0.40, 0.12, 0.95],
    keywords: [
      "hallux", "gros orteil", "premier orteil", "1er orteil", "1er doigt",
      "hallux valgus", "hallux rigidus", "oignon", "bursite", "métatarso-phalangienne",
      "valgus du premier rayon", "exostose",
      "amputation du 1er", "amputation hallux", "amputation du gros orteil",
    ],
  },
  orteil_2: {
    label: "2e orteil",
    sublabel: "Index de pied",
    color: "#f97316",
    position: [-0.18, 0.12, 1.04],
    keywords: [
      "2ème orteil", "2e orteil", "deuxième orteil", "2nd orteil",
      "syndrome du 2ème rayon", "orteil en griffe du 2",
      "amputation du 2", "amputation du deuxième orteil",
    ],
  },
  orteil_3: {
    label: "3e orteil",
    sublabel: "Orteil médian",
    color: "#f97316",
    position: [0.02, 0.12, 1.06],
    keywords: [
      "3ème orteil", "3e orteil", "troisième orteil",
      "orteil en griffe du 3", "orteil en marteau du 3",
      "amputation du 3", "amputation du troisième orteil",
    ],
  },
  orteil_4: {
    label: "4e orteil",
    sublabel: "Orteil latéral",
    color: "#fb923c",
    position: [0.22, 0.12, 1.00],
    keywords: [
      "4ème orteil", "4e orteil", "quatrième orteil",
      "orteil en griffe du 4", "cors interdigitaux 4",
      "amputation du 4", "amputation du quatrième orteil",
    ],
  },
  orteil_5: {
    label: "5e orteil",
    sublabel: "Petit orteil",
    color: "#fb923c",
    position: [0.38, 0.12, 0.88],
    keywords: [
      "5ème orteil", "5e orteil", "cinquième orteil", "petit orteil",
      "quintus varus", "quintus adductus",
      "amputation du 5", "amputation du cinquième orteil", "amputation du petit orteil",
    ],
  },
  amputation_orteils: {
    label: "Amputation orteils",
    sublabel: "Moignons / cicatrices",
    color: "#dc2626",
    position: [0.05, 0.15, 0.97],
    keywords: [
      "amputation", "amputé", "amputée", "moignon",
      "amputation des orteils", "amputation orteils", "orteils amputés",
      "section orteil", "orteil absent", "orteils absents",
      "cicatrice amputation", "désarticulation", "désarticulation métatarso-phalangienne",
    ],
  },
  metatarse_1: {
    label: "1er métatarse",
    sublabel: "Sésamoïdes / tête M1",
    color: "#8b5cf6",
    position: [-0.40, 0.12, 0.55],
    keywords: [
      "premier métatarse", "1er métatarse", "métatarse interne",
      "sésamoïdes", "métatarsalgie interne", "tête du 1er métatarse",
      "sésamoïdite",
    ],
  },
  metatarse_lateral: {
    label: "Métatarses latéraux",
    sublabel: "2e au 5e métatarses",
    color: "#a78bfa",
    position: [0.22, 0.12, 0.52],
    keywords: [
      "métatarsalgie", "syndrome métatarsien", "métatarse latéral",
      "styloïde", "5ème métatarse", "fracture de stress métatarsien",
      "métatarsalgies", "douleur métatarse",
    ],
  },
  avant_pied: {
    label: "Avant-pied",
    sublabel: "Zone métatarsienne",
    color: "#3b82f6",
    position: [-0.05, 0.12, 0.60],
    keywords: [
      "avant-pied", "avant pied", "zone métatarsienne", "capitonnage",
      "morton", "névrome", "névrome de morton", "kératose métatarsienne",
      "métatarsalgies diffuses",
    ],
  },
  arche: {
    label: "Voûte plantaire",
    sublabel: "Arche médiale",
    color: "#10b981",
    position: [-0.15, 0.05, -0.05],
    keywords: [
      "voûte plantaire", "arche", "arche médiale", "fascia plantaire",
      "fasciite", "fasciite plantaire", "aponévrose plantaire",
      "pied plat", "pied creux", "affaissement", "effondrement",
      "valgus subtalar", "pronation excessive",
    ],
  },
  talon: {
    label: "Talon",
    sublabel: "Calcanéum",
    color: "#f59e0b",
    position: [0, 0.12, -0.72],
    keywords: [
      "talon", "calcanéum", "calcanéen", "calcanéenne",
      "épine calcanéenne", "épine de lenoir", "talalgie",
      "aponévrosite", "douleur talon", "périostite calcanéenne",
      "os calcanéum", "calcanéite",
    ],
  },
  cheville: {
    label: "Cheville",
    sublabel: "Articulation tibio-tarsienne",
    color: "#06b6d4",
    position: [0, 0.35, -0.58],
    keywords: [
      "cheville", "malléole", "ligament latéral", "entorse", "tendon d'achille",
      "tendinite", "ténosynovite", "achilléenne", "achilles",
      "rétraction", "équin", "varus de cheville",
    ],
  },
  ongles: {
    label: "Ongles",
    sublabel: "Onychologie",
    color: "#d946ef",
    position: [-0.40, 0.18, 1.12],
    keywords: [
      "ongle", "ongles", "onychodystrophie", "onychomycose", "mycose",
      "ongle incarné", "onyxis", "périonyxis", "hyperkératose sous-unguéale",
      "leuconychie", "onychogrypose",
    ],
  },
  peau: {
    label: "Peau / Téguments",
    sublabel: "Kératoses, cors, durillons",
    color: "#ec4899",
    position: [0.15, 0.12, 0.0],
    keywords: [
      "cor", "cors", "durillon", "durillons", "kératose", "hyperkératose",
      "verrues", "verrue plantaire", "corne", "callosité", "callosités",
      "fissure", "eczéma", "hyperhidrose", "peau sèche",
    ],
  },
  semelles: {
    label: "Semelles / Orthèses",
    sublabel: "Appareillage",
    color: "#6366f1",
    position: [0.35, -0.05, -0.1],
    keywords: [
      "semelle", "semelles", "orthèse plantaire", "orthèses plantaires",
      "orthèse sur mesure", "appareillage", "talonnette", "releveur",
      "correction", "rembourrages", "surélévation",
    ],
  },
};

/**
 * Detect which foot side is mentioned ("droit" | "gauche" | null).
 * Prioritises explicit "pied droit/gauche" over standalone adjectives.
 */
export function detectSide(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  const rightScore =
    (lower.includes("pied droit") ? 3 : 0) +
    (lower.includes("côté droit") || lower.includes("coté droit") ? 2 : 0) +
    (lower.includes("membre droit") ? 2 : 0) +
    (/\bdroit\b/.test(lower) ? 1 : 0);
  const leftScore =
    (lower.includes("pied gauche") ? 3 : 0) +
    (lower.includes("côté gauche") || lower.includes("coté gauche") ? 2 : 0) +
    (lower.includes("membre gauche") ? 2 : 0) +
    (/\bgauche\b/.test(lower) ? 1 : 0);
  if (rightScore === 0 && leftScore === 0) return null;
  return leftScore > rightScore ? "gauche" : "droit";
}

/**
 * Scan text for podology keywords and return matching zone IDs.
 * Runs entirely client-side with no API call.
 */
export function detectZones(text) {
  if (!text) return [];
  const lower = text.toLowerCase();
  const detected = [];
  for (const [id, zone] of Object.entries(FOOT_ZONES)) {
    if (zone.keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      detected.push(id);
    }
  }
  return detected;
}

/**
 * Extract all text from a consultation for zone detection.
 */
export function extractConsultationText(consultation) {
  const parts = [];
  if (consultation?.motif) parts.push(consultation.motif);
  if (consultation?.transcription) parts.push(consultation.transcription);
  if (consultation?.notes) parts.push(consultation.notes);
  if (consultation?.reportData) {
    const rd = consultation.reportData;
    if (typeof rd === "object") {
      Object.values(rd).forEach(v => {
        if (typeof v === "string") parts.push(v);
        else if (Array.isArray(v)) parts.push(v.join(" "));
      });
    }
  }
  return parts.join(" ");
}
