// Données 100 % fictives pour la démo du salon, au format exact des modèles Prisma (Patient,
// Consultation) : les vrais composants de l'app les affichent sans adaptation. Aucun lien avec
// la base, aucun vrai patient.

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
  headerImage: "",
  footerImage: "",
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

const cr = (motif, anamnese, examen, bilan, diagnostic, traitement, recommandations) => ({
  motif_consultation: motif,
  anamnese,
  examen_clinique: examen,
  bilan_podologique: bilan,
  diagnostic,
  traitement,
  recommandations,
});


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
      "Douleur de l'avant-pied gauche au chaussage, gêne croissante depuis 6 mois.",
      "Patiente de 52 ans, travail debout. Pas d'antécédent chirurgical. Mère porteuse d'un hallux valgus.",
      "Hallux valgus gauche, angle estimé à 28°. Bursite inflammatoire en regard de la 1re tête métatarsienne. Durillon sous la 2e tête métatarsienne.",
      "Avant-pied élargi, insuffisance du 1er rayon. Appui métatarsien central surchargé.",
      "Hallux valgus symptomatique avec métatarsalgie de transfert.",
      "Orthèses plantaires avec barre rétro-capitale. Écarteur d'orteil nocturne.",
      "Chaussures à boîte à orteils large, talon inférieur à 3 cm."),
      { devisData: facture(12, [["Bilan podologique", 50], ["Semelles orthopédiques", 150]]), signatureFacture: "demo" }),
  ]),
  patient("demo-p5", "Julien", "PERRIN", "1985-05-30T00:00:00.000Z", "06 00 00 00 05", "Vincennes", [
    consult("demo-p5", 17, cr(
      "Douleur du tendon d'Achille droit, apparue à l'augmentation du kilométrage.",
      "Coureur, préparation marathon, 55 km par semaine. Augmentation rapide du volume il y a un mois.",
      "Tendon d'Achille épaissi à 4 cm de l'insertion, douloureux au pincement. Raideur de la cheville en flexion dorsale.",
      "Pronation dynamique excessive à l'analyse de la course.",
      "Tendinopathie corporéale du tendon d'Achille droit.",
      "Talonnettes temporaires de 8 mm. Renforcement excentrique (protocole d'Alfredson).",
      "Réduction de 30 % du volume de course pendant 3 semaines."),
      { devisData: facture(17, [["Bilan podologique", 50]]), signatureFacture: "demo" }),
  ]),
  patient("demo-p6", "Nadia", "BENALI", "1997-09-12T00:00:00.000Z", "06 00 00 00 06", "Paris", [
    consult("demo-p6", 21, cr(
      "Lésion douloureuse à la marche sous l'avant-pied droit depuis 2 mois.",
      "Fréquente une piscine municipale. Aucun traitement antérieur.",
      "Lésion hyperkératosique de 6 mm avec points noirs sous la 3e tête métatarsienne. Douleur à la pression latérale.",
      "",
      "Verrue plantaire (papillomavirus) de l'avant-pied droit.",
      "Détersion et application de kératolytique. Protection par feutre de décharge.",
      "Contrôle à 15 jours. Port de sandales en piscine."),
      { typeConsultation: "pedicurie", devisData: facture(21, [["Soin de pédicurie", 35]]), signatureFacture: "demo" }),
  ]),
  patient("demo-p7", "Gérard", "LAMBERT", "1952-02-25T00:00:00.000Z", "06 00 00 00 07", "Paris", [
    consult("demo-p7", 28, cr(
      "Sensation d'instabilité et douleurs de voûte plantaire bilatérales.",
      "Patient de 74 ans, retraité actif. Deux chutes sans gravité cette année.",
      "Pieds plats valgus bilatéraux, affaissement de l'arche interne à la charge. Appui unipodal instable à gauche. Sensibilité vibratoire conservée.",
      "Valgus calcanéen de 12° à droite, 10° à gauche.",
      "Pieds plats valgus décompensés avec instabilité à la marche.",
      "Semelles orthopédiques thermoformées. Chaussures montantes à contrefort rigide.",
      "Exercices de proprioception quotidiens."),
      { devisData: facture(28, [["Bilan podologique", 50], ["Semelles orthopédiques", 150]]), signatureFacture: "demo" }),
  ]),
  patient("demo-p8", "Inès", "CARON", "2002-07-04T00:00:00.000Z", "06 00 00 00 08", "Paris", [
    consult("demo-p8", 34, cr(
      "Douleurs de l'avant-pied et des sésamoïdes après reprise des pointes.",
      "Danseuse pré-professionnelle, 20 h d'entraînement par semaine. Reprise après 6 semaines d'arrêt.",
      "Sensibilité des sésamoïdes en flexion dorsale de l'hallux. Hyperlaxité ligamentaire de la cheville.",
      "Pied creux souple.",
      "Sésamoïdite du 1er rayon droit sur pied creux souple.",
      "Orthèse à décharge sésamoïdienne.",
      "Adaptation du plan d'entraînement. Contrôle à 4 semaines."),
      { devisData: facture(34, [["Bilan podologique", 50]]), signatureFacture: "demo" }),
  ]),
  patient("demo-p9", "Hugo", "VASSEUR", "2011-04-18T00:00:00.000Z", "06 00 00 00 09", "Paris", [
    consult("demo-p9", 1, cr(
      "Douleur du talon à l'arrière du pied gauche pendant et après les matchs de football.",
      "Adolescent de 15 ans en pleine croissance, football trois fois par semaine.",
      "Douleur à la pression du calcanéus, à la jonction avec le tendon d'Achille. Pas de gonflement.",
      "Raideur des mollets, pieds plats souples.",
      "Apophysite calcanéenne de croissance (maladie de Sever) du pied gauche.",
      "Talonnettes amortissantes dans les crampons. Étirements des mollets.",
      "Réduction des entraînements pendant 3 semaines. Contrôle à 1 mois."),
      { devisData: facture(1, [["Bilan podologique", 50]]), signatureFacture: "demo" }),
  ]),
  patient("demo-p10", "Martine", "GIRARD", "1953-12-07T00:00:00.000Z", "06 00 00 00 10", "Créteil", [
    consult("demo-p10", 0, cr(
      "Soin de pédicurie de routine, callosités et ongles épaissis.",
      "Patiente de 71 ans, soins réguliers toutes les 6 semaines.",
      "Hyperkératose des talons et de la pulpe des gros orteils. Onychogryphose des deux gros orteils.",
      "",
      "Callosités plantaires et onychogryphose sans signe de surinfection.",
      "Détersion des callosités, taille et fraisage des ongles.",
      "Crème hydratante à l'urée. Prochain soin dans 6 semaines."),
      { typeConsultation: "pedicurie", devisData: facture(0, [["Soin de pédicurie", 35]]), signatureFacture: "demo" }),
  ]),
  patient("demo-p11", "Karim", "HADDAD", "1981-08-23T00:00:00.000Z", "06 00 00 00 11", "Paris", [
    consult("demo-p11", 1, cr(
      "Douleurs plantaires bilatérales en fin de journée, travail debout (10 h par jour).",
      "Chef de cuisine. Aucun antécédent notable.",
      "Sensibilité diffuse de la voûte plantaire. Pieds plats souples avec valgus calcanéen de 8°.",
      "Pronation excessive à la marche, fatigue musculaire du jambier postérieur.",
      "Syndrome d'hyperpression plantaire sur pieds plats souples.",
      "Semelles orthopédiques thermoformées à effet proprioceptif.",
      "Chaussures de sécurité à semelle amortissante. Contrôle à 2 mois."),
      { devisData: facture(1, [["Bilan podologique", 50], ["Semelles orthopédiques", 150]]), signatureFacture: "demo" }),
  ]),
  patient("demo-p12", "Élodie", "MERCIER", "1988-10-15T00:00:00.000Z", "06 00 00 00 12", "Paris", [
    consult("demo-p12", 0, cr(
      "Gonflement et douleur des pieds en fin de journée, au 6e mois de grossesse.",
      "Première grossesse, prise de poids de 8 kg. Pas de pathologie veineuse connue.",
      "Œdème bilatéral léger des chevilles, godet discret. Pieds plats de grossesse par relâchement ligamentaire.",
      "Augmentation du valgus calcanéen de 4° par rapport au bilan précédent.",
      "Pieds plats valgus fonctionnels de grossesse avec œdème physiologique.",
      "Semelles de confort à soutien de l'arche interne.",
      "Surélévation des jambes le soir, chaussures larges. Contrôle après l'accouchement."),
      { devisData: facture(0, [["Bilan podologique", 50]]), signatureFacture: "demo" }),
  ]),
];

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
      "Patiente de 34 ans, coureuse, environ 40 kilomètres par semaine. Elle consulte pour une douleur du talon droit depuis trois semaines, maximale au premier pas le matin, qui s'estompe à l'échauffement. Pas d'antécédent traumatique, pas de changement de chaussures récent. À l'examen : douleur exquise à la palpation du tubercule postéro-interne du calcanéus droit, majorée à l'extension de l'hallux. Pas de signe inflammatoire local. Pied creux souple, raideur du triceps sural. Je suspecte une fasciite plantaire. Plan : orthèses plantaires thermoformées avec soutien de l'arche interne, étirements du triceps sural et du fascia, glaçage le soir. Réduction du kilométrage de moitié pendant trois semaines, contrôle dans six semaines.",
    reportData: cr(
      "Douleur du talon droit depuis 3 semaines, maximale au premier pas le matin, chez une coureuse (≈ 40 km par semaine).",
      "Patiente de 34 ans, coureuse. Douleur qui s'estompe à l'échauffement. Pas d'antécédent traumatique, pas de changement de chaussures récent.",
      "Douleur exquise à la palpation du tubercule postéro-interne du calcanéus droit, majorée à l'extension de l'hallux. Pas de signe inflammatoire local.",
      "Pied creux souple. Raideur du triceps sural.",
      "Suspicion de fasciite plantaire (épine calcanéenne) du pied droit.",
      "Orthèses plantaires thermoformées avec soutien de l'arche interne. Étirements du triceps sural et du fascia plantaire. Glaçage local le soir.",
      "Réduction du kilométrage de 50 % pendant 3 semaines. Contrôle à 6 semaines."),
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
      "Patient de 67 ans, diabétique de type 2 depuis douze ans, consultation de suivi. Aucune plaie déclarée, pas d'antécédent d'ulcère. À l'examen : peau sèche avec fissures talonnières bilatérales, hyperkératose sous la première tête métatarsienne gauche. Monofilament : sensibilité diminuée sur trois points à gauche. Pouls pédieux perçus des deux côtés. Classement de risque podologique grade deux. Je réalise la détersion de l'hyperkératose et je prescris des semelles de décharge sur mesure. Hydratation à l'urée matin et soir, inspection quotidienne des pieds. Prochain contrôle dans trois mois.",
    reportData: cr(
      "Suivi podologique d'un patient diabétique de type 2 (12 ans d'évolution), sans plaie déclarée.",
      "Patient de 67 ans. Pas d'antécédent d'ulcère du pied.",
      "Peau sèche, fissures talonnières bilatérales. Hyperkératose sous la 1re tête métatarsienne gauche. Pouls pédieux perçus des deux côtés.",
      "Monofilament : sensibilité diminuée sur 3 points à gauche.",
      "Pied diabétique à risque, grade 2 : neuropathie sensitive sans artériopathie.",
      "Détersion de l'hyperkératose réalisée en séance. Semelles de décharge sur mesure. Soin hydratant à base d'urée, matin et soir.",
      "Inspection quotidienne des pieds, chaussures sans coutures internes. Contrôle à 3 mois."),
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
      "Enfant de 8 ans, adressée par les parents pour une marche en dedans avec chutes fréquentes et fatigue en fin de journée. Développement moteur normal, pas de douleur. À l'examen : genu valgum modéré, valgus calcanéen bilatéral d'environ dix degrés, pieds plats souples avec reconstitution de l'arche sur la pointe des pieds. Rotation interne de hanche augmentée. Il s'agit d'un pied plat valgus souple, d'allure physiologique, à surveiller. Pas de semelle à ce stade. Marche pieds nus régulière, exercices ludiques de renforcement de la voûte, contrôle dans six mois.",
    reportData: cr(
      "Marche en dedans avec chutes fréquentes et fatigue en fin de journée, chez une enfant de 8 ans.",
      "Développement moteur normal. Absence de douleur.",
      "Genu valgum modéré. Valgus calcanéen bilatéral d'environ 10°. Rotation interne de hanche augmentée.",
      "Pieds plats souples, arche reconstituée sur la pointe des pieds.",
      "Pied plat valgus souple, d'allure physiologique, à surveiller.",
      "Pas d'orthèse plantaire à ce stade. Marche pieds nus régulière. Exercices ludiques de renforcement de la voûte plantaire.",
      "Contrôle à 6 mois."),
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
      "Patiente de 71 ans, soin de routine. Callosités épaisses des deux talons et de la pulpe des gros orteils, ongles épaissis avec onychogryphose. J'ai réalisé la détersion des callosités, la taille et le fraisage des ongles. Pas de signe de surinfection. Crème à l'urée matin et soir. Prochain soin dans six semaines.",
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
