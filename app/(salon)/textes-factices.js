// Faux textes « générés » de la démo : le courrier d'adressage et le résumé pour les confrères sont d'ordinaire
// rédigés par le modèle à partir du compte rendu. Ici, aucun appel : on les assemble à partir des champs du CR
// (motif, bilan, diagnostic, traitement, recommandations), avec le ton et la forme que prend le vrai courrier.

const PHRASE = /^(.+?[.!?])(\s|$)/;

const nettoyer = (t) => String(t ?? "").replace(/\s+/g, " ").trim();
const sansPoint = (t) => nettoyer(t).replace(/[.\s]+$/, "");
const minuscule = (t) => (t ? t[0].toLowerCase() + t.slice(1) : t);
const premierePhrase = (t) => {
  const s = nettoyer(t);
  const m = s.match(PHRASE);
  return m ? m[1] : s;
};
// Les deux premières phrases : de quoi donner le contexte sans recopier un paragraphe entier.
const phrases = (t, n) => {
  const s = nettoyer(t);
  const trouvees = s.match(/[^.!?]+[.!?]+(\s|$)/g);
  return trouvees ? trouvees.slice(0, n).join("").trim() : s;
};

const dateLongue = (d = new Date()) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const age = (iso) => {
  if (!iso) return null;
  const n = Math.floor((Date.now() - new Date(iso).getTime()) / 3.15576e10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export const courrierVide = (reportData) => !reportData || Object.keys(reportData).length === 0;

/** Résumé de 3 à 5 phrases pour un confrère : motif, bilan, diagnostic, traitement, recommandations. */
export function resumeConfrere(reportData) {
  const r = reportData || {};
  const morceaux = [
    r.motif_consultation && `Consultation pour ${minuscule(sansPoint(r.motif_consultation))}.`,
    (r.bilan_podologique || r.examen_clinique) && `${premierePhrase(r.bilan_podologique || r.examen_clinique)}`,
    r.diagnostic && `Au total : ${minuscule(sansPoint(r.diagnostic))}.`,
    r.traitement && `Prise en charge : ${minuscule(sansPoint(premierePhrase(r.traitement)))}.`,
    r.recommandations && `${premierePhrase(r.recommandations)}`,
  ].filter(Boolean);
  return morceaux.join(" ");
}

/** Courrier d'adressage complet : en-tête, appel, présentation du patient, bilan, diagnostic, traitement, demande, signature. */
export function courrierAdressage({ reportData, patient, praticien }) {
  const r = reportData || {};
  const nomPatient = [patient?.prenom, patient?.nom].filter(Boolean).join(" ") || "le patient";
  const ans = age(patient?.dateNaissance);
  const naissance = patient?.dateNaissance ? new Date(patient.dateNaissance).toLocaleDateString("fr-FR", { timeZone: "UTC" }) : null;
  const signataire = [praticien?.prenom, praticien?.nom].filter(Boolean).join(" ") || "Votre confrère";
  const lieu = (praticien?.address || "").split(",").pop()?.trim().replace(/^\d+\s*/, "") || "Paris";
  const coordonnees = [praticien?.cabinetName, praticien?.address, praticien?.phone, praticien?.email].filter(Boolean).join(" — ");

  const lignes = [
    `${lieu}, le ${dateLongue()}`,
    "",
    `Objet : demande d'avis — adressage de ${nomPatient}${naissance ? ` (date de naissance : ${naissance})` : ""}`,
    "",
    "Cher Confrère,",
    "",
    `Je me permets de vous adresser ${nomPatient}${ans ? ` (${ans} ans)` : ""}, dont j'ai assuré la consultation de podologie${r.motif_consultation ? ` pour ${minuscule(sansPoint(r.motif_consultation))}` : ""}.`,
    r.anamnese && "",
    r.anamnese && `Sur le plan de l'histoire de la maladie : ${minuscule(phrases(r.anamnese, 2))}`,
    (r.examen_clinique || r.bilan_podologique) && "",
    r.examen_clinique && `À l'examen clinique : ${minuscule(phrases(r.examen_clinique, 2))}`,
    r.bilan_podologique && `Bilan podologique : ${phrases(r.bilan_podologique, 2)}`,
    r.diagnostic && "",
    r.diagnostic && `Mon diagnostic d'orientation est le suivant : ${minuscule(sansPoint(r.diagnostic))}.`,
    r.traitement && "",
    r.traitement && `J'ai, de mon côté, mis en place la prise en charge suivante : ${minuscule(phrases(r.traitement, 2))}`,
    r.recommandations && `${premierePhrase(r.recommandations)}`,
    "",
    `Je vous serais reconnaissant de bien vouloir examiner ${nomPatient}, de me faire part de votre avis et de m'indiquer si une prise en charge complémentaire vous paraît nécessaire. Le compte rendu complet de ma consultation est à votre disposition.`,
    "",
    "Je vous remercie de l'attention que vous porterez à ce dossier et vous prie d'agréer, cher Confrère, l'expression de mes salutations confraternelles les meilleures.",
    "",
    signataire,
    coordonnees,
  ];
  return lignes.filter((l) => typeof l === "string").join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
