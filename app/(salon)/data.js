// Données 100 % fictives pour la démo du salon, au format exact des modèles Prisma (Patient,
// Consultation) : les vrais composants de l'app les affichent sans adaptation. Aucun lien avec
// la base, aucun vrai patient.

import { SIGNATURE_PREENREGISTREE } from "./signature-png";
import { ENTETE_THOMAS_DURAND, PIED_THOMAS_DURAND } from "./entete-pied";
import { IMAGE_BAROPODOMETRIE } from "./baropodo-image";

const JOUR = 24 * 3600 * 1000;
// 10 h UTC : le même jour calendaire en France, quel que soit le fuseau du navigateur.
const ilYa = (jours) => {
  const d = new Date(Date.now() - jours * JOUR);
  d.setUTCHours(10, 0, 0, 0);
  return d.toISOString();
};

export const PRATICIEN_DEMO = {
  id: "demo-praticien",
  prenom: "Thomas",
  nom: "Durand",
  role: "podologue",
  email: "contact@cabinet-demo.fr",
  cabinetName: "Cabinet de podologie Démo",
  address: "12 rue des Lilas, 75000 Paris",
  phone: "01 00 00 00 00",
  features: [],
  nomenclatures: [],
  abonnement: "pro",
  photo: "",
  // En-tête et pied de page médicaux de Thomas Durand : ils s'impriment sur les PDF des devis, factures et ordonnances.
  headerImage: ENTETE_THOMAS_DURAND,
  footerImage: PIED_THOMAS_DURAND,
  qrCodePatient: "demo",
  cabinetId: "demo-cabinet",
  cabinetRole: "responsable",
  cabinet: { nom: "Cabinet de podologie Démo" },
};

// Le cabinet : 5 praticiens, dont Thomas Durand (responsable, l'utilisateur de la démo).
const membre = (id, prenom, nom, cabinetRole, pourcentageReversement) => ({
  id, prenom, nom, cabinetRole, role: "podologue", photo: null, pourcentageReversement,
  email: `${prenom.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}.${nom.toLowerCase()}@cabinet-demo.fr`,
});
export const EQUIPE = [
  { ...membre(PRATICIEN_DEMO.id, "Thomas", "Durand", "responsable", null), email: PRATICIEN_DEMO.email },
  membre("demo-m2", "Claire", "Bernard", "praticien", 20),
  membre("demo-m3", "Antoine", "Leroy", "praticien", 20),
  membre("demo-m4", "Sarah", "Moreau", "praticien", 25),
  membre("demo-m5", "Hélène", "Garnier", "praticien", 15),
];
export const CABINET_DEMO = {
  id: "demo-cabinet",
  nom: "Cabinet de podologie Démo",
  adresse: "12 rue des Lilas, 75000 Paris",
  phone: "01 00 00 00 00",
  ownerId: PRATICIEN_DEMO.id,
  abonnement: "active",
  membres: EQUIPE,
  invitations: [],
};

const cr = (motif, anamnese, examen, bilan, diagnostic, traitement, recommandations) => Object.fromEntries(Object.entries({
  motif_consultation: motif,
  anamnese,
  examen_clinique: examen,
  bilan_podologique: bilan,
  diagnostic,
  traitement,
  recommandations,
}).filter(([, contenu]) => contenu));


// Réponse « brute » que le modèle renverrait pour la version patient (consigne de lib/patientReport.js).
// Pour les CR déjà en base, elle est déduite du CR ; pour les scénarios live, elle est écrite à la main.
const phrases = (t) => (t ? t.split(/(?<=\.)\s+/).map((x) => x.trim()).filter(Boolean) : []);
export const brutDepuisCR = (rd) => ({
  synthese: {
    motif: rd.motif_consultation,
    diagnostic: { titre: (rd.diagnostic || "").replace(/\.$/, "").slice(0, 100), detail: rd.bilan_podologique || null },
    objectifs: [],
    traitement: phrases(rd.traitement),
    dureeSuivi: null,
  },
  histoire: { intro: rd.anamnese || null, antecedents: [], symptomes: [], conclusion: null },
  examen: { statique: null, pressions: null, general: phrases(rd.examen_clinique) },
  analyse: { intro: null, constats: [], precision: null },
  plan: [],
  exercices: { intro: null, items: [] },
  pointsImportants: phrases(rd.recommandations),
  conclusion: "Nous restons à votre disposition pour toute question. N'hésitez pas à nous contacter si la gêne évolue avant votre prochain rendez-vous.",
});

const facture = (jours, lignes) => ({
  status: "SIGNED",
  factureDate: ilYa(jours),
  items: lignes.map(([description, unitPrice]) => ({ description, quantity: 1, unitPrice })),
});

let n = 0;
const consult = (patientId, jours, reportData, extra = {}) => ({
  id: `demo-c${++n}`,
  patientId,
  praticienId: PRATICIEN_DEMO.id,
  createdAt: ilYa(jours),
  typeConsultation: "podologie",
  motif: reportData?.motif_consultation ?? null,
  reportData,
  transcription: null,
  devisData: null,
  factureData: null,
  ordonnanceData: null,
  signatureDevis: null,
  signatureFacture: null,
  photos: null,
  notes: null,
  ...extra,
});

const patient = (id, prenom, nom, dateNaissance, telephone, ville, consultations = []) => ({
  id,
  prenom,
  nom,
  dateNaissance,
  telephone,
  email: `${prenom.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}.${nom.toLowerCase()}@exemple.fr`,
  adresse: null,
  codePostal: "75000",
  ville,
  pays: "France",
  praticienId: PRATICIEN_DEMO.id,
  cabinetId: null,
  createdAt: ilYa(120),
  consultations,
});

export const PATIENTS_INITIAUX = [
  patient("demo-p1", "Camille", "ROUSSEL", "1992-03-14T00:00:00.000Z", "06 00 00 00 01", "Paris"),
  patient("demo-p2", "Marc", "DELAUNAY", "1959-11-02T00:00:00.000Z", "06 00 00 00 02", "Paris"),
  patient("demo-p3", "Léa", "FONTAINE", "2018-06-21T00:00:00.000Z", "06 00 00 00 03", "Paris"),
  patient("demo-p4", "Sophie", "MARCHAND", "1974-01-09T00:00:00.000Z", "06 00 00 00 04", "Montreuil", [
    consult("demo-p4", 12, cr(
      "Douleur de l'avant-pied gauche au chaussage, avec une gêne croissante depuis six mois, et demande d'avis sur la déformation du gros orteil.",
      "Patiente de 52 ans, aide-soignante en station debout dix heures par jour, chaussée de baskets de travail. La douleur siège à la base du gros orteil gauche, aggravée par les chaussures fermées et en fin de journée, cotée 5/10. Mère porteuse d'un hallux valgus opéré. Aucun antécédent chirurgical personnel, pas de traitement en cours, pas de diabète connu. A essayé des protections en gel en pharmacie, avec un soulagement partiel.",
      "Hallux valgus gauche avec un angle métatarso-phalangien estimé à 28°, bursite inflammatoire en regard de la première tête métatarsienne (rouge, chaude, douloureuse à la pression). Durillon sous la deuxième tête métatarsienne gauche. Mobilité de la première articulation métatarso-phalangienne conservée, sans blocage. Pas de déformation en griffe des orteils. Côté droit : hallux valgus débutant, indolore.",
      "Avant-pied élargi avec insuffisance du premier rayon et appui métatarsien central surchargé à la podobarométrie. Pieds plats souples avec valgus calcanéen de 6°.",
      "Hallux valgus symptomatique du pied gauche avec bursite et métatarsalgie de transfert sous la deuxième tête. Hallux valgus débutant à droite.",
      "Confection d'orthèses plantaires avec soutien du premier rayon et barre rétro-capitale de décharge de la deuxième tête métatarsienne. Écarteur d'orteil nocturne en silicone. Protecteur de bursite pour les chaussures fermées.",
      "Chaussures à boîte à orteils large, talon inférieur à 3 cm, sans couture sur la déformation. Avis orthopédique à envisager si la douleur persiste après trois mois de traitement conservateur. Contrôle à trois mois."),
      { devisData: facture(12, [["Bilan podologique", 50], ["Semelles orthopédiques", 150]]), signatureFacture: SIGNATURE_PREENREGISTREE, signatureDevis: SIGNATURE_PREENREGISTREE }),
  ]),
  patient("demo-p5", "Julien", "PERRIN", "1985-05-30T00:00:00.000Z", "06 00 00 00 05", "Vincennes", [
    consult("demo-p5", 17, cr(
      "Douleur du tendon d'Achille droit apparue à l'augmentation du kilométrage, dans le cadre d'une préparation de marathon.",
      "Patient de 41 ans, cadre, coureur depuis huit ans, préparation d'un marathon dans dix semaines. Volume passé de 40 à 55 km par semaine en un mois, avec ajout de séances de côtes. Douleur d'apparition progressive à 4 cm de l'insertion, raideur matinale de quelques minutes, gêne au démarrage des séances qui s'estompe à chaud, cotée 4/10. Antécédent d'un épisode similaire à gauche il y a trois ans, résolu en six semaines. Chaussures changées tous les 800 km. Ni fluoroquinolone ni corticoïde récents.",
      "Tendon d'Achille droit épaissi à 4 cm de l'insertion, douloureux au pincement, avec un signe de l'arc douloureux positif. Insertion calcanéenne indolore. Test de Thompson négatif. Raideur de la cheville en flexion dorsale, limitée à 8° genou tendu à droite. Force du triceps sural conservée, montée sur pointes possible vingt fois.",
      "Analyse de la course sur tapis : pronation dynamique excessive à droite, attaque talon marquée. Pieds plats souples avec valgus calcanéen de 7° à droite.",
      "Tendinopathie corporéale du tendon d'Achille droit, d'origine mécanique, favorisée par une augmentation rapide de la charge d'entraînement.",
      "Talonnette temporaire de 8 mm dans les chaussures de course et de ville. Orthèses plantaires thermoformées à effet de contrôle de la pronation, à réaliser après trois semaines. Protocole de renforcement excentrique du triceps sural (trois séries de quinze, deux fois par jour).",
      "Réduction de 30 % du volume de course pendant trois semaines, sans séance de côtes ni de fractionné. Reprise progressive selon la douleur. Contrôle à un mois, avec échographie si la douleur persiste."),
      { devisData: facture(17, [["Bilan podologique", 50]]), signatureFacture: SIGNATURE_PREENREGISTREE, signatureDevis: SIGNATURE_PREENREGISTREE }),
  ]),
  patient("demo-p6", "Nadia", "BENALI", "1997-09-12T00:00:00.000Z", "06 00 00 00 06", "Paris", [
    consult("demo-p6", 21, cr(
      "Lésion douloureuse à la marche sous l'avant-pied droit depuis deux mois.",
      "Patiente de 29 ans, employée de bureau, fréquente une piscine municipale deux fois par semaine. La lésion est apparue il y a deux mois et grossit lentement, douloureuse à la marche et à la pression latérale. Aucun traitement antérieur, pas d'immunodépression ni de diabète connus. Pas de lésion similaire dans l'entourage.",
      "Lésion hyperkératosique de 6 mm de diamètre sous la troisième tête métatarsienne droite, avec des points noirs (capillaires thrombosés) et une interruption des dermatoglyphes. Douleur à la pression latérale (signe du pincement). Pas de signe de surinfection. Pas d'autre lésion sur les deux pieds.",
      "",
      "Verrue plantaire (papillomavirus humain) de l'avant-pied droit.",
      "Détersion de la lésion et application d'un kératolytique (acide salicylique). Mise en place d'un feutre de décharge autour de la lésion.",
      "Renouveler l'application de kératolytique chaque soir après détersion à domicile. Port de sandales en piscine et dans les vestiaires. Contrôle à quinze jours, cryothérapie envisagée en cas de persistance."),
      { typeConsultation: "pedicurie", devisData: facture(21, [["Soin de pédicurie", 35]]), signatureFacture: SIGNATURE_PREENREGISTREE, signatureDevis: SIGNATURE_PREENREGISTREE }),
  ]),
  patient("demo-p7", "Gérard", "LAMBERT", "1952-02-25T00:00:00.000Z", "06 00 00 00 07", "Paris", [
    consult("demo-p7", 28, cr(
      "Sensation d'instabilité à la marche et douleurs de la voûte plantaire bilatérales.",
      "Patient de 74 ans, retraité actif, marche quotidienne et jardinage. Deux chutes sans gravité dans l'année, dans un escalier et sur un trottoir. Douleurs de la voûte plantaire en fin de journée, cotées 4/10, soulagées au repos. Antécédents : hypertension artérielle traitée, arthrose des genoux. Pas de diabète. Chaussures de confort usées, portées depuis plus de trois ans.",
      "Pieds plats valgus bilatéraux avec affaissement de l'arche interne à la charge. Appui unipodal instable à gauche (moins de cinq secondes), correct à droite. Sensibilité vibratoire conservée aux gros orteils. Mobilité de la cheville légèrement diminuée en flexion dorsale. Pas d'œdème.",
      "Valgus calcanéen de 12° à droite et de 10° à gauche. Podobarométrie dynamique : hyperpression médiale de l'arrière-pied et déroulé du pas raccourci.",
      "Pieds plats valgus décompensés avec instabilité à la marche et risque de chute.",
      "Semelles orthopédiques thermoformées avec soutien de l'arche interne et cale postérieure de correction du valgus. Chaussures montantes à contrefort rigide, à renouveler.",
      "Exercices de proprioception quotidiens (appui unipodal, dix minutes). Kinésithérapie d'équilibre à envisager avec le médecin traitant. Contrôle à trois mois."),
      { devisData: facture(28, [["Bilan podologique", 50], ["Semelles orthopédiques", 150]]), signatureFacture: SIGNATURE_PREENREGISTREE, signatureDevis: SIGNATURE_PREENREGISTREE }),
  ]),
  patient("demo-p8", "Inès", "CARON", "2002-07-04T00:00:00.000Z", "06 00 00 00 08", "Paris", [
    consult("demo-p8", 34, cr(
      "Douleurs de l'avant-pied et des sésamoïdes après la reprise des pointes.",
      "Patiente de 24 ans, danseuse pré-professionnelle, vingt heures d'entraînement par semaine dont dix sur pointes. Reprise il y a trois semaines après six semaines d'arrêt pour une entorse. Douleur sous le gros orteil droit, à type de brûlure lors des relevés, cotée 6/10. Antécédent d'entorse de la cheville droite. Aucune fracture de fatigue connue, aucun traitement en cours.",
      "Sensibilité des sésamoïdes du premier rayon droit, notamment le sésamoïde médial, à la palpation et à l'extension passive de l'hallux. Pas de gonflement. Hyperlaxité ligamentaire de la cheville droite. Force des fléchisseurs de l'hallux conservée.",
      "Pied creux souple bilatéral, avant-pied peu déformé, premier rayon en flexion plantaire marquée.",
      "Sésamoïdite du premier rayon droit sur pied creux souple, en lien avec la reprise des pointes.",
      "Orthèse plantaire à décharge sésamoïdienne (cuvette sous le premier rayon) pour les chaussons et les baskets. Protection du gros orteil pendant les cours.",
      "Adaptation du plan d'entraînement : réduction des relevés sur pointes pendant trois semaines. Radiographie à prévoir si la douleur persiste. Contrôle à quatre semaines."),
      { devisData: facture(34, [["Bilan podologique", 50]]), signatureFacture: SIGNATURE_PREENREGISTREE, signatureDevis: SIGNATURE_PREENREGISTREE }),
  ]),
  patient("demo-p9", "Hugo", "VASSEUR", "2011-04-18T00:00:00.000Z", "06 00 00 00 09", "Paris", [
    consult("demo-p9", 1, cr(
      "Douleur du talon gauche pendant et après les matchs de football, depuis trois semaines.",
      "Adolescent de 15 ans en pleine croissance (six centimètres en un an), football trois fois par semaine plus un match le week-end, sur terrain synthétique. Douleur à la partie postérieure du talon gauche, à type de tiraillement, cotée 5/10 à l'effort, sans douleur au repos. Pas de traumatisme. Aucun traitement, pas d'antécédent familial.",
      "Douleur à la pression latérale du calcanéus, à la jonction avec le tendon d'Achille (squeeze test positif). Pas de gonflement ni d'inflammation locale. Tendon d'Achille indolore. Marche sur la pointe des pieds possible mais douloureuse.",
      "Raideur des mollets avec flexion dorsale limitée à 5° genou tendu. Pieds plats souples.",
      "Apophysite calcanéenne de croissance (maladie de Sever) du pied gauche.",
      "Talonnettes amortissantes de 10 mm dans les crampons et les chaussures. Étirements quotidiens des mollets.",
      "Réduction des entraînements pendant trois semaines, sans course ni sauts. Reprise progressive selon la douleur. Contrôle à un mois."),
      { devisData: facture(1, [["Bilan podologique", 50]]), signatureFacture: SIGNATURE_PREENREGISTREE, signatureDevis: SIGNATURE_PREENREGISTREE }),
  ]),
  patient("demo-p10", "Martine", "GIRARD", "1953-12-07T00:00:00.000Z", "06 00 00 00 10", "Créteil", [
    consult("demo-p10", 0, cr(
      "Soin de pédicurie de routine : callosités des talons et ongles épaissis.",
      "Patiente de 71 ans, soins toutes les six semaines. Gêne à la marche liée aux callosités, ongles difficiles à couper seule. Pas de diabète, pas de traitement anticoagulant. Hydrate ses pieds de façon irrégulière.",
      "Hyperkératose des talons et de la pulpe des gros orteils. Onychogryphose des deux gros orteils, sans signe évident de mycose. Peau sèche, sans fissure profonde ni plaie. Pouls pédieux perçus.",
      "",
      "Callosités plantaires et onychogryphose sans signe de surinfection.",
      "Détersion des callosités, taille et fraisage des ongles épaissis.",
      "Crème à l'urée matin et soir sur les talons. Prochain soin dans six semaines."),
      { typeConsultation: "pedicurie", devisData: facture(0, [["Soin de pédicurie", 35]]), signatureFacture: SIGNATURE_PREENREGISTREE, signatureDevis: SIGNATURE_PREENREGISTREE }),
  ]),
  patient("demo-p11", "Karim", "HADDAD", "1981-08-23T00:00:00.000Z", "06 00 00 00 11", "Paris", [
    consult("demo-p11", 1, cr(
      "Douleurs plantaires bilatérales en fin de journée, dans un contexte de station debout prolongée.",
      "Patient de 45 ans, chef de cuisine, dix heures de station debout par jour sur sol carrelé, chaussures de sécurité. Douleurs diffuses de la voûte plantaire et des talons depuis huit mois, cotées 6/10 le soir, soulagées par le repos. Aucun antécédent notable, pas de traitement.",
      "Sensibilité diffuse de la voûte plantaire à la palpation. Pieds plats souples avec valgus calcanéen de 8°. Pas de douleur à l'insertion du fascia plantaire. Tendons d'Achille indolores.",
      "Pronation excessive à la marche, fatigue du jambier postérieur. Hyperpression plantaire médiale à la podobarométrie.",
      "Syndrome d'hyperpression plantaire sur pieds plats souples, favorisé par la station debout prolongée.",
      "Semelles orthopédiques thermoformées à effet proprioceptif, avec soutien de l'arche interne.",
      "Chaussures de sécurité à semelle amortissante, à renouveler tous les six mois. Micro-pauses avec surélévation des pieds. Contrôle à deux mois."),
      { devisData: facture(1, [["Bilan podologique", 50], ["Semelles orthopédiques", 150]]), signatureFacture: SIGNATURE_PREENREGISTREE, signatureDevis: SIGNATURE_PREENREGISTREE }),
  ]),
  patient("demo-p12", "Élodie", "MERCIER", "1988-10-15T00:00:00.000Z", "06 00 00 00 12", "Paris", [
    consult("demo-p12", 0, cr(
      "Gonflement et douleur des pieds en fin de journée, au sixième mois de grossesse.",
      "Patiente de 38 ans, enceinte de vingt-quatre semaines (première grossesse), prise de poids de 8 kg. Gonflement des chevilles le soir, douleurs de la voûte plantaire et des talons, cotées 5/10. Pas de pathologie veineuse connue, pas d'hypertension gravidique, suivi régulier par la sage-femme.",
      "Œdème bilatéral léger des chevilles, godet discret. Pieds plats de grossesse par relâchement ligamentaire. Pas de signe de phlébite. Pouls pédieux perçus.",
      "Augmentation du valgus calcanéen de 4° par rapport au dernier bilan. Appuis plantaires élargis.",
      "Pieds plats valgus fonctionnels de grossesse avec œdème physiologique.",
      "Semelles de confort à soutien de l'arche interne, adaptables après l'accouchement.",
      "Surélévation des jambes le soir, chaussures larges et stables, bas de contention à voir avec la sage-femme. Contrôle après l'accouchement."),
      { devisData: facture(0, [["Bilan podologique", 50]]), signatureFacture: SIGNATURE_PREENREGISTREE, signatureDevis: SIGNATURE_PREENREGISTREE }),
  ]),
];

// Un CR qui s'appuie sur une podobarométrie porte l'image de l'analyse statique (comme une photo jointe au dossier).
const MENTION_BAROPODO = /podobarom|baropod/i;
export const photosDuCR = (reportData) =>
  MENTION_BAROPODO.test(Object.values(reportData || {}).join(" ")) ? [IMAGE_BAROPODOMETRIE] : null;
PATIENTS_INITIAUX.forEach((p) => p.consultations.forEach((c) => { c.photos = c.photos ?? photosDuCR(c.reportData); }));

// Trois consultations « live » prêtes à jouer. `dictee` défile mot à mot ; chaque clé du CR
// apparaît quand la dictée atteint `palier` (part de la dictée déjà prononcée), comme le CR
// live de l'application qui se construit au fil de la consultation.
export const PALIERS = {
  motif_consultation: 0.12,
  anamnese: 0.28,
  examen_clinique: 0.5,
  bilan_podologique: 0.64,
  diagnostic: 0.8,
  traitement: 0.92,
  recommandations: 1,
};

export const SCENARIOS = [
  {
    id: "s1", patientId: "demo-p1", titre: "Fasciite plantaire", sous: "Coureuse · talon droit", icone: "🏃‍♀️",
    dictee:
      "Patiente de 34 ans, infirmière en horaires alternés, coureuse à pied depuis six ans, environ quarante kilomètres par semaine sur trois sorties dont une séance de fractionné. Elle consulte pour une douleur du talon droit depuis trois semaines, apparue sans traumatisme après une augmentation rapide du volume, de trente à quarante-cinq kilomètres en deux semaines, et un changement de chaussures il y a deux mois avec un drop plus bas. Douleur en brûlure sous le talon, cotée sept sur dix au premier pas le matin, qui s'estompe à l'échauffement et réapparaît en fin de journée, pas de douleur nocturne. Antécédent d'entorse de la cheville droite en deux mille vingt et un, sans séquelle, aucun traitement en cours, semelles de confort de pharmacie sans effet. À l'examen : douleur exquise à la palpation du tubercule postéro-interne du calcanéus droit, majorée à l'extension de l'hallux, test du treuil positif. Pas de signe inflammatoire local, tendon d'Achille indolore. Pied creux souple, raideur du triceps sural avec une flexion dorsale de cheville limitée à dix degrés genou tendu. Podobarométrie : hyperpression du talon droit et de l'avant-pied externe. Je suspecte une fasciite plantaire. Plan : orthèses plantaires thermoformées avec soutien de l'arche interne et décharge du talon, étirements du triceps sural et du fascia, glaçage le soir, réduction du kilométrage de moitié pendant trois semaines, contrôle dans six semaines.",
    reportData: cr(
      "Douleur du talon droit évoluant depuis trois semaines, maximale au premier pas le matin, chez une patiente coureuse à pied.",
      "Patiente de 34 ans, infirmière en horaires alternés, coureuse depuis six ans (environ 40 km par semaine sur trois sorties, dont une séance de fractionné). La douleur est apparue sans traumatisme après une augmentation rapide du volume d'entraînement (de 30 à 45 km en deux semaines) et un changement de chaussures il y a deux mois, avec un drop plus bas. Douleur en brûlure sous le talon, cotée 7/10 au premier pas le matin, qui s'estompe à l'échauffement et réapparaît en fin de journée. Pas de douleur nocturne. Antécédent d'entorse de la cheville droite en 2021, sans séquelle. Aucun traitement en cours. Des semelles de confort achetées en pharmacie n'ont apporté aucune amélioration.",
      "Douleur exquise à la palpation du tubercule postéro-interne du calcanéus droit, à l'insertion du fascia plantaire, majorée à l'extension de l'hallux (test du treuil positif). Pas de signe inflammatoire local. Tendon d'Achille indolore à la palpation. Pied creux souple. Raideur du triceps sural : flexion dorsale de la cheville limitée à 10° genou tendu.",
      "Podobarométrie : hyperpression du talon droit et de l'avant-pied externe. Pied creux souple avec raideur du triceps sural.",
      "Suspicion de fasciite plantaire (épine calcanéenne possible) du pied droit, d'origine mécanique, favorisée par l'augmentation rapide du volume d'entraînement, le changement de chaussures et la raideur du triceps sural.",
      "Confection d'orthèses plantaires thermoformées, à porter quotidiennement, avec soutien de l'arche interne et décharge du talon droit. Étirements du triceps sural et du fascia plantaire, deux fois par jour. Glaçage local le soir.",
      "Réduction du kilométrage de 50 % pendant trois semaines, puis reprise progressive. Contrôle à six semaines pour évaluer la douleur et ajuster les orthèses. Consulter le médecin traitant en cas de douleur nocturne ou de persistance au-delà de six semaines."),
    patientBrut: {
      synthese: {
        motif: "Une douleur au talon droit, surtout au premier pas le matin, depuis trois semaines.",
        diagnostic: { titre: "Fasciite plantaire", detail: "Une inflammation de la bande de tissu qui soutient la voûte du pied, fréquente chez les coureurs." },
        objectifs: ["Calmer l'inflammation", "Soulager le talon à la marche", "Reprendre la course sans douleur"],
        traitement: ["Semelles orthopédiques thermoformées", "Étirements du mollet et de la voûte", "Glaçage le soir"],
        dureeSuivi: "6 semaines",
      },
      histoire: {
        intro: "Vous courez environ 40 kilomètres par semaine et la douleur est apparue progressivement.",
        antecedents: ["Aucun traumatisme", "Pas de changement de chaussures récent"],
        symptomes: [{ icone: "footprints", texte: "Douleur au premier pas du matin" }, { icone: "activity", texte: "Gêne qui s'estompe à l'échauffement" }],
        conclusion: "Ce type de douleur répond bien à un traitement adapté.",
      },
      examen: {
        statique: { data: [{ label: "Charge droite", value: 54 }, { label: "Charge gauche", value: 46 }], note: "Léger report de charge sur le côté droit." },
        pressions: { data: [{ label: "Talon droit", value: 58 }, { label: "Talon gauche", value: 42 }], note: "Le talon droit est davantage sollicité." },
        general: ["Douleur à la palpation du talon droit", "Pied creux souple", "Mollet raide"],
      },
      analyse: { intro: "Votre pied creux et la raideur du mollet tirent sur la voûte à chaque foulée.", constats: ["Le fascia plantaire est sur-sollicité", "Le mollet manque de souplesse"], precision: "Rien d'inquiétant : il n'y a pas de signe d'inflammation locale." },
      plan: [
        { titre: "Les 3 prochaines semaines", couleur: "teal", items: ["Porter vos semelles chaque jour", "Réduire la course de moitié", "Étirements deux fois par jour"] },
        { titre: "À 6 semaines", couleur: "purple", items: ["Contrôle au cabinet", "Reprise progressive du kilométrage"] },
      ],
      exercices: { intro: "Deux minutes matin et soir suffisent.", items: ["Étirement du mollet contre un mur : 30 secondes × 3", "Rouler une balle sous la voûte : 2 minutes", "Glaçage du talon : 10 minutes le soir"] },
      pointsImportants: ["Portez vos semelles dès le lever", "Diminuez la course de moitié pendant 3 semaines", "Prenez rendez-vous dans 6 semaines"],
      conclusion: "Votre douleur est très courante et bien connue. Avec vos semelles, les étirements et un peu de patience, la grande majorité des coureurs retrouvent leur rythme. Nous faisons le point dans six semaines.",
    },
    questions: ["Antécédent de fracture de fatigue du calcanéus ?", "Type de chaussures de course utilisées et kilométrage des paires ?", "Douleur nocturne ou au repos ?"],
  },
  {
    id: "s2", patientId: "demo-p2", titre: "Pied diabétique", sous: "Suivi · risque de plaie", icone: "🩺",
    dictee:
      "Patient de 67 ans, retraité, ancien chauffeur-livreur, diabétique de type 2 depuis douze ans, traité par metformine, dernier taux d'hémoglobine glyquée à sept virgule un pour cent. Consultation de suivi podologique, aucune plaie déclarée, pas d'antécédent d'ulcère ni d'amputation. Il signale des picotements des orteils en fin de journée et une peau qui craque aux talons l'hiver. Il marche environ trente minutes par jour, chaussé de baskets un peu étroites. À l'examen : peau sèche avec fissures talonnières bilatérales, hyperkératose sous la première tête métatarsienne gauche, sans macération interdigitale. Monofilament : sensibilité diminuée sur trois points à gauche, conservée à droite. Diapason : pallesthésie diminuée aux gros orteils. Pouls pédieux et tibiaux postérieurs perçus des deux côtés, pas de trouble trophique. Classement de risque podologique grade deux. Je réalise la détersion de l'hyperkératose. Je prescris des semelles de décharge sur mesure avec décharge de la première tête métatarsienne, et je conseille des chaussures plus larges à contrefort souple. Hydratation à l'urée matin et soir, inspection quotidienne des pieds avec un miroir. Contrôle dans trois mois, courrier au médecin traitant.",
    reportData: cr(
      "Suivi podologique d'un patient diabétique de type 2 (douze ans d'évolution), sans plaie déclarée.",
      "Patient de 67 ans, retraité, ancien chauffeur-livreur. Diabète de type 2 depuis douze ans, traité par metformine ; dernier taux d'hémoglobine glyquée à 7,1 %. Pas d'antécédent d'ulcère du pied ni d'amputation. Picotements des orteils en fin de journée et peau qui craque aux talons l'hiver. Marche environ trente minutes par jour, chaussé de baskets un peu étroites.",
      "Peau sèche avec fissures talonnières bilatérales. Hyperkératose sous la première tête métatarsienne gauche, sans macération interdigitale. Pouls pédieux et tibiaux postérieurs perçus des deux côtés. Pas de trouble trophique.",
      "Monofilament : sensibilité diminuée sur trois points à gauche, conservée à droite. Diapason : pallesthésie diminuée aux gros orteils.",
      "Pied diabétique à risque, grade 2 : neuropathie sensitive sans artériopathie.",
      "Détersion de l'hyperkératose réalisée en séance. Semelles de décharge sur mesure avec décharge de la première tête métatarsienne. Soin hydratant à base d'urée, matin et soir.",
      "Chaussures plus larges à contrefort souple. Inspection quotidienne des pieds, à l'aide d'un miroir. Contrôle à trois mois. Courrier au médecin traitant."),
    patientBrut: {
      synthese: {
        motif: "Un suivi régulier de vos pieds, à cause du diabète.",
        diagnostic: { titre: "Pied diabétique à risque", detail: "Vos pieds sont moins sensibles qu'avant : une petite blessure peut passer inaperçue." },
        objectifs: ["Éviter toute plaie", "Protéger les zones d'appui", "Garder une peau souple"],
        traitement: ["Semelles de décharge sur mesure", "Soin hydratant à l'urée", "Détersion de la corne réalisée aujourd'hui"],
        dureeSuivi: "Suivi tous les 3 mois",
      },
      histoire: {
        intro: "Vous êtes diabétique depuis douze ans, sans plaie à ce jour.",
        antecedents: ["Diabète de type 2", "Aucun antécédent d'ulcère"],
        symptomes: [{ icone: "footprints", texte: "Sensibilité diminuée du pied gauche" }, { icone: "droplet", texte: "Peau sèche, fissures aux talons" }],
        conclusion: "Une surveillance régulière protège efficacement vos pieds.",
      },
      examen: {
        statique: null,
        pressions: { data: [{ label: "Avant-pied gauche", value: 62 }, { label: "Avant-pied droit", value: 38 }], note: "Appui plus marqué sous le gros orteil gauche." },
        general: ["Corne sous le gros orteil gauche", "Pouls des pieds bien perçus", "Sensibilité diminuée sur trois points à gauche"],
      },
      analyse: { intro: "La circulation est bonne, mais la sensibilité est diminuée.", constats: ["La corne peut devenir une plaie sans douleur", "La peau sèche se fissure facilement"], precision: "C'est pourquoi nous surveillons de près les zones d'appui." },
      plan: [{ titre: "Chaque jour", couleur: "teal", items: ["Regarder vos pieds, dessous compris", "Hydrater sauf entre les orteils", "Ne jamais marcher pieds nus"] }, { titre: "Dans 3 mois", couleur: "purple", items: ["Contrôle de la sensibilité", "Renouvellement des soins"] }],
      exercices: { intro: "Un geste simple chaque soir.", items: ["Inspecter les pieds avec un miroir", "Vérifier l'intérieur des chaussures avant de les mettre"] },
      pointsImportants: ["Portez vos semelles en permanence", "Consultez vite en cas de plaie, rougeur ou ampoule", "Prochain rendez-vous dans 3 mois"],
      conclusion: "Vos pieds sont en bon état et bien suivis. Le plus important est le regard quotidien : au moindre doute, appelez-nous sans attendre.",
    },
    questions: ["Dernier bilan HbA1c ?", "Chaussures actuelles adaptées (largeur, coutures internes) ?", "Podologue ou infirmière pour les soins entre deux séances ?"],
  },
  {
    id: "s3", patientId: "demo-p3", titre: "Bilan enfant", sous: "8 ans · marche en dedans", icone: "🧒",
    dictee:
      "Enfant de 8 ans, adressée par ses parents pour une marche en dedans avec des chutes fréquentes et une fatigue des jambes en fin de journée. Développement moteur normal, marche acquise à quatorze mois, pas de douleur, pratique la danse une heure par semaine. Pas d'antécédent familial de pathologie du pied. Chaussures actuelles souples, remplacées tous les six mois. À l'examen : genu valgum modéré, valgus calcanéen bilatéral d'environ dix degrés, pieds plats souples avec reconstitution de l'arche sur la pointe des pieds, test de Jack positif. Rotation interne de hanche augmentée, pas de raideur du triceps sural. Appui unipodal correct de chaque côté. Il s'agit d'un pied plat valgus souple d'allure physiologique, à surveiller. Pas de semelle à ce stade. Marche pieds nus régulière sur sol varié, exercices ludiques de renforcement de la voûte, choix de chaussures souples et bien tenues. Contrôle dans six mois avec un nouveau bilan de croissance.",
    reportData: cr(
      "Marche en dedans avec des chutes fréquentes et une fatigue des jambes en fin de journée, chez une enfant de 8 ans.",
      "Enfant de 8 ans adressée par ses parents. Développement moteur normal, marche acquise à 14 mois. Pas de douleur. Pratique la danse une heure par semaine. Pas d'antécédent familial de pathologie du pied. Chaussures actuelles souples, remplacées tous les six mois.",
      "Genu valgum modéré. Valgus calcanéen bilatéral d'environ 10°. Rotation interne de hanche augmentée. Pas de raideur du triceps sural. Appui unipodal correct de chaque côté.",
      "Pieds plats souples avec reconstitution de l'arche sur la pointe des pieds. Test de Jack positif.",
      "Pied plat valgus souple, d'allure physiologique, à surveiller.",
      "Pas d'orthèse plantaire à ce stade. Marche pieds nus régulière sur sol varié. Exercices ludiques de renforcement de la voûte plantaire.",
      "Chaussures souples et bien tenues. Contrôle à six mois avec un nouveau bilan de croissance."),
    patientBrut: {
      synthese: {
        motif: "Léa marche les pieds tournés vers l'intérieur et se fatigue en fin de journée.",
        diagnostic: { titre: "Pied plat souple, normal pour son âge", detail: "Les pieds sont encore en croissance : la voûte se construit progressivement." },
        objectifs: ["Renforcer la voûte du pied", "Surveiller l'évolution", "Garder le plaisir de bouger"],
        traitement: ["Pas de semelle pour l'instant", "Marche pieds nus", "Jeux de renforcement"],
        dureeSuivi: "Contrôle dans 6 mois",
      },
      histoire: {
        intro: "Léa a un développement moteur normal et ne ressent pas de douleur.",
        antecedents: [],
        symptomes: [{ icone: "footprints", texte: "Marche en dedans" }, { icone: "gauge", texte: "Fatigue en fin de journée" }],
        conclusion: "Rien d'inquiétant à ce stade.",
      },
      examen: {
        statique: { data: [{ label: "Charge droite", value: 51 }, { label: "Charge gauche", value: 49 }], note: "Répartition équilibrée." },
        pressions: null,
        general: ["Pieds plats souples", "La voûte se reforme sur la pointe des pieds", "Genoux légèrement rapprochés"],
      },
      analyse: { intro: "La souplesse des pieds est un bon signe.", constats: ["La voûte se reconstitue quand Léa se met sur la pointe des pieds"], precision: "Une semelle n'est pas nécessaire aujourd'hui." },
      plan: [{ titre: "D'ici 6 mois", couleur: "teal", items: ["Marcher pieds nus régulièrement", "Faire les jeux proposés", "Chaussures souples et bien tenues"] }],
      exercices: { intro: "Cinq minutes par jour, en s'amusant.", items: ["Ramasser des billes avec les orteils", "Marcher sur la pointe des pieds puis sur les talons", "Jouer pieds nus dans le jardin ou sur le sable"] },
      pointsImportants: ["Pas de semelle nécessaire aujourd'hui", "Chaussures souples et bien tenues", "Nouveau contrôle dans 6 mois"],
      conclusion: "Les pieds de Léa grandissent normalement. Avec quelques jeux et beaucoup de marche pieds nus, la voûte va se renforcer. Nous la revoyons dans six mois.",
    },
    questions: ["Antécédents familiaux de pieds plats ?", "Activité sportive pratiquée ?", "Usure des chaussures asymétrique ?"],
  },
];

// ── Comptabilité du cabinet : ~90 séances facturées sur 75 jours, réparties entre les 5 praticiens ──
function alea(graine) {
  let a = graine;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NOMS_COMPTA = [
  ["Alice", "Renaud"], ["Bruno", "Faure"], ["Chloé", "Lemoine"], ["David", "Roux"], ["Emma", "Guerin"], ["Fabrice", "Colin"],
  ["Gaëlle", "Barbier"], ["Hervé", "Meyer"], ["Isabelle", "Chevalier"], ["Jérôme", "Robin"], ["Karine", "Masson"], ["Laurent", "Dupuis"],
  ["Manon", "Blanc"], ["Nicolas", "Garcia"], ["Océane", "Lopez"], ["Pascal", "Fabre"], ["Quentin", "Andre"], ["Rosalie", "Mercier"],
  ["Stéphane", "Vidal"], ["Tiphaine", "Perrot"], ["Valérie", "Noel"], ["William", "Carpentier"], ["Yasmine", "Aubert"], ["Zoé", "Lacroix"],
];

export const PATIENTS_COMPTA = [
  ...PATIENTS_INITIAUX.map((p) => ({ id: p.id, prenom: p.prenom, nom: p.nom })),
  ...NOMS_COMPTA.map(([prenom, nom], i) => ({ id: `demo-cp${i}`, prenom, nom })),
];

export const FACTURES_COMPTA = (() => {
  const r = alea(2026);
  const modes = ["cb", "cb", "cb", "especes", "cheque"];
  const poids = [0.32, 0.2, 0.18, 0.17, 0.13]; // Thomas voit un peu plus de patients que ses collaborateurs
  const out = [];
  for (let i = 0; i < 90; i++) {
    let jours = Math.floor(r() * 75);
    const date = new Date(Date.now() - jours * JOUR);
    if (date.getUTCDay() === 0) jours += 1; // pas de séance le dimanche
    const d = new Date(Date.now() - jours * JOUR);
    d.setUTCHours(8 + Math.floor(r() * 10), Math.floor(r() * 4) * 15, 0, 0);

    let cumul = 0, k = 0;
    const tirage = r();
    for (; k < poids.length - 1; k++) { cumul += poids[k]; if (tirage < cumul) break; }
    const praticien = EQUIPE[k];
    const patient = PATIENTS_COMPTA[Math.floor(r() * PATIENTS_COMPTA.length)];

    const t = r();
    const [type, lignes] = t < 0.5 ? ["facturation", [["Séance bilan podologique", 50]]]
      : t < 0.75 ? ["facturation", [["Séance bilan podologique", 50], ["Semelles orthopédiques", r() < 0.7 ? 150 : 180]]]
      : ["pedicurie", [["Soin de pédicurie", 35]]];
    const total = lignes.reduce((a, [, prix]) => a + prix, 0);

    out.push({
      id: `demo-f${i}`,
      createdAt: d.toISOString(),
      typeConsultation: type,
      patientId: patient.id,
      patient,
      praticienId: praticien.id,
      praticien: { id: praticien.id, prenom: praticien.prenom, nom: praticien.nom, cabinetRole: praticien.cabinetRole, pourcentageReversement: praticien.pourcentageReversement },
      reportData: null,
      factureData: null,
      signatureFacture: null,
      devisData: {
        items: lignes.map(([description, unitPrice]) => ({ description, quantity: 1, unitPrice })),
        totalAmount: String(total),
        status: r() < 0.92 ? "SIGNED" : "PENDING",
        modePaiement: modes[Math.floor(r() * modes.length)],
        factureDate: d.toISOString(),
      },
    });
  }
  return out.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
})();

// Soin de pédicurie : dicté dans le vrai bloc de l'app via une reconnaissance vocale factice.
export const SCENARIOS_PEDICURIE = [
  {
    id: "s4", patientId: "demo-p10", mode: "pedicurie", titre: "Soin de pédicurie", sous: "Soin de routine · 71 ans", icone: "✂️",
    dictee:
      "Patiente de 71 ans, soin de pédicurie de routine, toutes les six semaines. Elle se plaint d'une gêne à la marche à cause des callosités des talons et d'ongles épaissis qu'elle ne peut plus couper seule. Pas de diabète, pas de traitement anticoagulant. À l'examen : hyperkératose des deux talons et de la pulpe des gros orteils, onychogryphose des deux gros orteils sans signe évident de mycose, peau sèche sans fissure profonde ni plaie, pouls pédieux perçus. J'ai réalisé la détersion des callosités, la taille et le fraisage des ongles épaissis. Pas de signe de surinfection. Crème à l'urée matin et soir sur les talons. Prochain soin dans six semaines.",
  },
];

// Réponse de la dictée d'ordonnance (« crème à l'urée pour les talons et vernis antifongique »).
export const ORDONNANCE_DICTEE = [
  { name: "Urée crème", dosage: "30%", form: "crème", qty: 1, unit: "tube(s)", instructions: "Appliquer 1 à 2 fois par jour sur les zones hyperkératosiques" },
  { name: "Amorolfine (Loceryl)", dosage: "5%", form: "vernis", qty: 1, unit: "flacon(s)", instructions: "Appliquer 1 fois par semaine sur les ongles atteints" },
];

// ── Côté patient (QR du chevalet) : trois documents en attente, un par code de sécurité. ──
// Le téléphone du visiteur n'a aucun lien avec l'écran du présentateur (pas de serveur) : ces
// documents sont donc préparés à l'avance. Le code est, comme dans l'app, les 3 premières lettres du nom.
const patientPar = (id) => PATIENTS_INITIAUX.find((p) => p.id === id);
const aujourdhui = () => new Date().toISOString().slice(0, 10);

export const CONSULTATIONS_QR = [
  {
    id: "demo-qr-devis", typeConsultation: "facturation", motif: "Facturation Podologie", patient: patientPar("demo-p2"),
    devisData: {
      status: "AWAITING_SIGNATURE",
      items: [{ description: "Bilan Podologique", quantity: 1, unitPrice: "50" }, { description: "Semelles Orthopédiques", quantity: 1, unitPrice: "150" }],
      totalAmount: "200.00 €",
      factureDate: aujourdhui(),
      devisItems: [{ description: "Semelles Orthopédiques", quantity: 1, unitPrice: "150" }],
      devisTotalAmount: "150.00 €",
      nomenclatureSelected: "LPP 1313849 · SC 12",
    },
  },
  {
    id: "demo-qr-pedicurie", typeConsultation: "pedicurie", motif: "Soin de Pédicurie", patient: patientPar("demo-p10"),
    factureData: { items: [{ description: "Soin de Pédicurie", quantity: 1, unitPrice: "35" }], totalAmount: "35.00 €", factureDate: aujourdhui() },
  },
  {
    id: "demo-qr-ordonnance", typeConsultation: "ordonnance", motif: "Prescription médicale", patient: patientPar("demo-p1"),
    ordonnanceData: {
      contenu: ORDONNANCE_DICTEE.map((m, i) => `${i + 1}/ ${m.name} ${m.dosage} ${m.form}\n   Qté : ${m.qty} ${m.unit}\n   ${m.instructions}`).join("\n\n"),
      items: ORDONNANCE_DICTEE.map((m, i) => ({ ...m, id: i + 1 })),
    },
  },
].map((c) => ({
  praticienId: PRATICIEN_DEMO.id, praticien: PRATICIEN_DEMO, patientId: c.patient.id, createdAt: new Date().toISOString(),
  reportData: null, transcription: null, devisData: null, factureData: null, ordonnanceData: null,
  signatureDevis: null, signatureFacture: null, photos: null, notes: null, ...c,
}));

export const DOCUMENTS_QR = {
  DEL: { consultationId: "demo-qr-devis" },
  GIR: { consultationId: "demo-qr-pedicurie", isPedicurie: true },
  ROU: { consultationId: "demo-qr-ordonnance", isOrdonnance: true },
};
