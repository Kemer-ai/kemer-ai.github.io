// Signature manuscrite fictive de la démo : un paraphe (puis son soulignement), défini par quelques points
// de contrôle dans une boîte de 0 à 1. Le même tracé sert à :
//  - l'animation sur la page de signature du patient (signature-animee.jsx) ;
//  - l'image PNG préenregistrée sur les PDF devis et facture des dossiers déjà signés (signature-png.js,
//    produite par scripts de génération à partir de ces mêmes points).

// Les points sont écrits dans un repère de 100 × 40 (le rapport 5:2 de la zone de signature), puis ramenés à
// la boîte 0-1 : une boucle dessinée ronde reste ronde.
const LARGEUR = 100;
const HAUTEUR = 40;

const TRACES = [
  // 1. La haste de l'initiale : un trait long, légèrement penché, qui finit en pointe.
  [[19, 0.8], [20.2, 9], [21.8, 19], [23.4, 29], [25, 38.5]],
  // 2. La grande boucle de l'initiale, qui part du haut de la haste, plonge à gauche et file en soulignement.
  [[22, 5], [15, 2.2], [8.6, 7], [6.4, 17], [9, 28], [15.5, 34.6], [24, 35.8], [36, 32.4], [50, 30.4], [66, 29.6], [82, 28.6], [95, 25.4]],
  // 3. Le corps de la lettre suivante : un grand « S » couché, ouvert, avec sa boucle intérieure.
  [[46, 7.5], [38.5, 3.6], [31, 6.5], [29.4, 13.4], [35, 18.4], [43, 20.6], [47.4, 26.4], [43.4, 33], [35.4, 33.2], [31.2, 28.6]],
  // 4. L'écriture liée : une suite de petits jambages, puis deux grands montants (« t », « h ») et une sortie.
  [[47.4, 26.4], [51.5, 22.8], [53, 28.8], [56.4, 22.4], [58.6, 28.4], [61.2, 22.4], [63.2, 13.6], [64.2, 5.6], [62.6, 2.2],
   [59.6, 6.4], [59.4, 15.6], [61.6, 26.8], [65, 22], [68.8, 20.6], [72.2, 26.8], [75.4, 21.4], [77.4, 12.6], [78.6, 5],
   [77, 1.8], [74, 6], [73.6, 15.2], [75.6, 26], [79.6, 22.6], [84, 22.4], [87.2, 27.6], [92.4, 29.6]],
  // 5. Le point sur le « i ».
  [[56.6, 15.8], [57.6, 15.2]],
];

export const TRAITS = TRACES.map((trait) => trait.map(([x, y]) => [x / LARGEUR, y / HAUTEUR]));

// Spline de Catmull-Rom : points échantillonnés tous les `pas` (dans la boîte 0-1), ou `null` pour les points de contrôle.
function spline(points, pas) {
  const sortie = [];
  const p = (i) => points[Math.max(0, Math.min(points.length - 1, i))];
  for (let i = 0; i < points.length - 1; i++) {
    const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
    const longueur = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const n = Math.max(2, Math.ceil(longueur / pas));
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      sortie.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  sortie.push(points[points.length - 1]);
  return sortie;
}

/** Les traits lissés, prêts à tracer : un tableau de listes de points [x, y] entre 0 et 1. */
export const traitsLisses = (pas = 0.004) => TRAITS.map((t) => spline(t, pas));
