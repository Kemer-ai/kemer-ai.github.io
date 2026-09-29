import { Document, Page, Text, View, Image, StyleSheet, Font, Svg, Path, Circle, Rect, Line, Polyline } from '@react-pdf/renderer';
import { __iconNode as calendar } from 'lucide-react/dist/esm/icons/calendar.js';
import { __iconNode as activity } from 'lucide-react/dist/esm/icons/activity.js';
import { __iconNode as footprints } from 'lucide-react/dist/esm/icons/footprints.js';
import { __iconNode as gauge } from 'lucide-react/dist/esm/icons/gauge.js';
import { __iconNode as brain } from 'lucide-react/dist/esm/icons/brain.js';
import { __iconNode as clipboardList } from 'lucide-react/dist/esm/icons/clipboard-list.js';
import { __iconNode as circleCheck } from 'lucide-react/dist/esm/icons/circle-check.js';
import { __iconNode as bookmark } from 'lucide-react/dist/esm/icons/bookmark.js';
import { __iconNode as dumbbell } from 'lucide-react/dist/esm/icons/dumbbell.js';
import { __iconNode as droplet } from 'lucide-react/dist/esm/icons/droplet.js';

// Compte rendu envoyé au patient (PDF joint à l'e-mail). Reprend la maquette app/cr-v2/page.jsx.
// Composant distinct de MedicalReportPDF : celui-ci reste le compte rendu praticien.

const PURPLE = '#4931F7';
const TEAL = '#4ECDC4';
const NAVY = '#001F3F';
const SLATE = '#475569';
const MUTED = '#94a3b8';

const CDN = 'https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest';
Font.register({
  family: 'Montserrat',
  fonts: [
    { src: `${CDN}/latin-400-normal.ttf`, fontWeight: 400 },
    { src: `${CDN}/latin-400-italic.ttf`, fontWeight: 400, fontStyle: 'italic' },
    { src: `${CDN}/latin-700-normal.ttf`, fontWeight: 700 },
    { src: `${CDN}/latin-800-normal.ttf`, fontWeight: 800 },
    { src: `${CDN}/latin-900-normal.ttf`, fontWeight: 900 },
  ],
});
// Pas de césure automatique au milieu des mots français.
Font.registerHyphenationCallback((mot) => [mot]);

const s = StyleSheet.create({
  page: { paddingTop: 26, paddingBottom: 44, paddingHorizontal: 32, fontFamily: 'Montserrat', fontSize: 8.5, color: SLATE, backgroundColor: '#FFFFFF' },
  h1: { fontSize: 20, fontWeight: 900, color: NAVY, marginBottom: 9 },
  banner: { flexDirection: 'row', alignItems: 'center', backgroundColor: PURPLE, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 10, alignSelf: 'flex-start' },
  avatar: { width: 34, height: 34, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarTxt: { color: '#fff', fontWeight: 900, fontSize: 10 },
  bannerLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 6, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' },
  bannerName: { color: '#fff', fontWeight: 900, fontSize: 10.5 },
  bannerSub: { color: 'rgba(255,255,255,0.75)', fontSize: 7.5 },
  bannerSep: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.25)', marginHorizontal: 12 },
  bannerDate: { flexDirection: 'row', alignItems: 'center' },
  bannerDateTxt: { color: 'rgba(255,255,255,0.85)', fontWeight: 700, fontSize: 8.5, marginLeft: 5 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 4 },
  sectionIcon: { width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  sectionTitle: { fontSize: 9, fontWeight: 900, color: NAVY, textTransform: 'uppercase', letterSpacing: 0.6 },
  card: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 11, backgroundColor: '#FFFFFF' },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  cell2: { width: '50%', padding: 4 },
  // Les cases de l'examen clinique se partagent toute la ligne (2 cases = moitié chacune, 1 = pleine largeur).
  cellFlex: { flexGrow: 1, flexBasis: 0, padding: 4 },
  label: { fontSize: 6.5, fontWeight: 900, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 5 },
  p: { fontSize: 8.5, lineHeight: 1.5, color: SLATE },
  pBold: { fontSize: 9, fontWeight: 800, color: NAVY, marginBottom: 3 },
  li: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 3.5 },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 4, marginRight: 6 },
  liTxt: { flex: 1, fontSize: 8.5, lineHeight: 1.45, color: SLATE },
  fact: { width: '25%', padding: 3 },
  factInner: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9', borderRadius: 10, padding: 8, alignItems: 'center' },
  factIcon: { width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginBottom: 5, backgroundColor: `${TEAL}26` },
  factTxt: { fontSize: 7.5, fontWeight: 700, color: SLATE, textAlign: 'center', lineHeight: 1.35 },
  step: { flex: 1, paddingRight: 10 },
  stepHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  stepLabel: { fontSize: 7, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.8, marginLeft: 6 },
  footer: { position: 'absolute', bottom: 22, left: 32, right: 32, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#edf2f7', paddingTop: 8 },
  footerTxt: { fontSize: 6.5, color: MUTED },
});

// Rend un nœud d'icône Lucide (tableau [balise, attributs]) en SVG react-pdf.
function Icon({ node, color, size = 12 }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      {node.map(([tag, { key, ...attrs }], i) => {
        const p = { fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', ...attrs };
        const k = key || i;
        if (tag === 'path') return <Path key={k} {...p} />;
        if (tag === 'circle') return <Circle key={k} {...p} />;
        if (tag === 'rect') return <Rect key={k} {...p} />;
        if (tag === 'line') return <Line key={k} {...p} />;
        if (tag === 'polyline') return <Polyline key={k} {...p} />;
        return null;
      })}
    </Svg>
  );
}

const SectionTitle = ({ node, color = PURPLE, children }) => (
  <View style={s.sectionTitleRow} wrap={false} minPresenceAhead={40}>
    <View style={[s.sectionIcon, { backgroundColor: `${color}1a` }]}><Icon node={node} color={color} size={12} /></View>
    <Text style={s.sectionTitle}>{children}</Text>
  </View>
);

const Bullet = ({ color = PURPLE, children }) => (
  <View style={s.li} wrap={false}><View style={[s.dot, { backgroundColor: color }]} /><Text style={s.liTxt}>{children}</Text></View>
);

const Check = ({ color = '#10b981', children }) => (
  <View style={s.li} wrap={false}>
    <View style={{ marginTop: 1, marginRight: 5 }}><Icon node={circleCheck} color={color} size={10} /></View>
    <Text style={s.liTxt}>{children}</Text>
  </View>
);

// Anneau dessiné en arcs SVG : chaque part est un pourcentage de 100 ; le reste reste en gris clair.
function Donut({ title, data, footnote }) {
  const R = 26, CX = 35, CY = 35;
  const total = Math.max(100, data.reduce((t, d) => t + d.value, 0));
  const pt = (pct) => {
    const a = (pct / total) * 2 * Math.PI - Math.PI / 2;
    return [CX + R * Math.cos(a), CY + R * Math.sin(a)];
  };
  let cumul = 0;
  const arcs = data.map((d) => {
    const debut = cumul;
    cumul += d.value;
    if (d.value >= total - 0.01) return { color: d.color, plein: true };
    const [x1, y1] = pt(debut);
    const [x2, y2] = pt(cumul);
    return { color: d.color, d: `M ${x1} ${y1} A ${R} ${R} 0 ${d.value / total > 0.5 ? 1 : 0} 1 ${x2} ${y2}` };
  });
  return (
    <View>
      <Text style={s.label}>{title}</Text>
      <View style={{ width: 70, height: 70, alignSelf: 'center', marginBottom: 8 }}>
        <Svg viewBox="0 0 70 70" width={70} height={70}>
          <Circle cx={CX} cy={CY} r={R} fill="none" stroke="#eef2f7" strokeWidth={9} />
          {arcs.map((a, i) => a.plein
            ? <Circle key={i} cx={CX} cy={CY} r={R} fill="none" stroke={a.color} strokeWidth={9} />
            : <Path key={i} d={a.d} fill="none" stroke={a.color} strokeWidth={9} />)}
        </Svg>
        <View style={{ position: 'absolute', top: 0, left: 0, width: 70, height: 70, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 11, fontWeight: 900, color: NAVY }}>{data[0].value}%</Text>
        </View>
      </View>
      {data.map((d, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: d.color, marginRight: 5 }} />
            <Text style={{ fontSize: 7.5, color: SLATE }}>{d.label}</Text>
          </View>
          <Text style={{ fontSize: 8, fontWeight: 900, color: NAVY, marginLeft: 6 }}>{d.value}%</Text>
        </View>
      ))}
      {footnote ? <Text style={[s.p, { marginTop: 5, fontSize: 7.5 }]}>{footnote}</Text> : null}
    </View>
  );
}

const FACT_ICONS = { activity, footprints, droplet, gauge };
const initiales = (p) => `${(p?.prenom || '')[0] || ''}${(p?.nom || '')[0] || ''}`.toUpperCase();

/**
 * @param {object} data  Contenu structuré du compte rendu patient (voir DONNEES_EXEMPLE ci-dessous).
 * @param {object} [branding] Praticien : `cabinetName` en pied de page.
 * @param {string[]} [photos] Photos de consultation (data URI ou URL), en fin de document.
 */
export const PatientReportPDF = ({ data, branding, photos }) => {
  const d = data || {};
  const { patient = {}, synthese = {}, histoire = {}, examen = {}, analyse = {}, plan = [], exercices = {}, pointsImportants = [], conclusion = '' } = d;
  const aSynthese = !!(synthese.motif || synthese.diagnostic?.titre || synthese.objectifs?.length || synthese.traitement?.length);
  const aHistoire = !!(histoire.intro || histoire.antecedents?.length || histoire.symptomes?.length || histoire.conclusion);
  const aExamen = !!(examen.statique || examen.pressions || examen.general?.length);
  const aAnalyse = !!(analyse.intro || analyse.constats?.length || analyse.precision);

  return (
    <Document author="Kemer AI" title="Compte-rendu de consultation">
      <Page size="A4" style={s.page}>
        <Text style={s.h1}>Compte-rendu de <Text style={{ color: PURPLE }}>consultation</Text></Text>

        <View style={s.banner}>
          <View style={s.avatar}><Text style={s.avatarTxt}>{initiales(patient)}</Text></View>
          <View>
            <Text style={s.bannerLabel}>{patient.civilite === 'F' ? 'Patiente' : 'Patient'}</Text>
            <Text style={s.bannerName}>{[patient.prenom, patient.nom].filter(Boolean).join(' ')}</Text>
            {patient.dateNaissance ? <Text style={s.bannerSub}>Date de naissance : {patient.dateNaissance}</Text> : null}
          </View>
          <View style={s.bannerSep} />
          <View style={s.bannerDate}>
            <Icon node={calendar} color="#ffffffd9" size={11} />
            <Text style={s.bannerDateTxt}>{d.date}</Text>
          </View>
        </View>

        {/* Synthèse */}
        {aSynthese ? <SectionTitle node={clipboardList}>Synthèse</SectionTitle> : null}
        {aSynthese ? <View style={s.grid2}>
          {synthese.motif ? <View style={s.cell2}><View style={[s.card, { flexGrow: 1 }]}>
            <Text style={s.label}>Motif de consultation</Text><Text style={s.p}>{synthese.motif}</Text>
          </View></View> : null}
          {synthese.diagnostic?.titre ? <View style={s.cell2}><View style={[s.card, { flexGrow: 1 }]}>
            <Text style={s.label}>Diagnostic principal</Text>
            <Text style={s.pBold}>{synthese.diagnostic.titre}</Text>{synthese.diagnostic.detail ? <Text style={s.p}>{synthese.diagnostic.detail}</Text> : null}
          </View></View> : null}
          {synthese.objectifs?.length ? <View style={s.cell2}><View style={[s.card, { flexGrow: 1 }]}>
            <Text style={s.label}>Objectifs</Text>
            {synthese.objectifs.map((t, i) => <Check key={i}>{t}</Check>)}
          </View></View> : null}
          {synthese.traitement?.length ? <View style={s.cell2}><View style={[s.card, { flexGrow: 1 }]}>
            <Text style={s.label}>Traitement proposé</Text>
            {synthese.traitement.map((t, i) => <Bullet key={i}>{t}</Bullet>)}
            {synthese.dureeSuivi ? <Text style={{ marginTop: 4, fontSize: 8, fontWeight: 800, color: PURPLE }}>Durée estimée du suivi : {synthese.dureeSuivi}</Text> : null}
          </View></View> : null}
        </View> : null}

        {/* Histoire */}
        {aHistoire ? <View style={{ marginTop: 7 }}>
          <View style={s.card}>
            <SectionTitle node={brain} color={TEAL}>Votre histoire</SectionTitle>
            {histoire.intro ? <Text style={[s.p, { marginBottom: 5 }]}>{histoire.intro}</Text> : null}
            {(histoire.antecedents || []).map((t, i) => <Bullet key={i} color={TEAL}>{t}</Bullet>)}
            {histoire.symptomes?.length ? (
              <>
                <Text style={[s.p, { marginTop: 4, marginBottom: 5 }]}>Aujourd’hui vous décrivez principalement :</Text>
                <View style={{ flexDirection: 'row', marginHorizontal: -3, marginBottom: 6 }}>
                  {histoire.symptomes.map((f, i) => (
                    <View key={i} style={s.fact}><View style={s.factInner}>
                      <View style={s.factIcon}><Icon node={FACT_ICONS[f.icone] || activity} color={TEAL} size={11} /></View>
                      <Text style={s.factTxt}>{f.texte}</Text>
                    </View></View>
                  ))}
                </View>
              </>
            ) : null}
            {histoire.conclusion ? <Text style={[s.p, { fontStyle: 'italic', color: '#64748b' }]}>{histoire.conclusion}</Text> : null}
          </View>
        </View> : null}

        {/* Examen clinique */}
        {aExamen ? <View style={{ marginTop: 7 }} wrap={false}>
          <SectionTitle node={gauge}>Examen clinique</SectionTitle>
          <View style={s.grid2}>
            {examen.statique ? <View style={s.cellFlex}><View style={[s.card, { flexGrow: 1 }]}><Donut title="Statique" data={examen.statique.data} footnote={examen.statique.note} /></View></View> : null}
            {examen.pressions ? <View style={s.cellFlex}><View style={[s.card, { flexGrow: 1 }]}><Donut title="Pressions plantaires" data={examen.pressions.data} footnote={examen.pressions.note} /></View></View> : null}
            {examen.general?.length ? (
              <View style={[s.cellFlex, { flexGrow: 1.4 }]}><View style={[s.card, { flexGrow: 1 }]}>
                <Text style={s.label}>Examen général</Text>
                {examen.general.map((t, i) => <Check key={i}>{t}</Check>)}
              </View></View>
            ) : null}
          </View>
        </View> : null}

        {/* Analyse */}
        {aAnalyse ? <View style={{ marginTop: 7 }} wrap={false}>
          <View style={s.card}>
            <SectionTitle node={brain} color={TEAL}>Mon analyse</SectionTitle>
            {analyse.intro ? <Text style={[s.p, { marginBottom: 6 }]}>{analyse.intro}</Text> : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 }}>
              {(analyse.constats || []).map((t, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginRight: 14, marginBottom: 3 }}>
                  <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: TEAL, marginRight: 5 }} /><Text style={s.p}>{t}</Text>
                </View>
              ))}
            </View>
            {analyse.precision ? <Text style={[s.p, { color: '#64748b' }]}>{analyse.precision}</Text> : null}
          </View>
        </View> : null}

        {/* Plan de traitement */}
        {plan.length ? (
          <View style={{ marginTop: 7 }} wrap={false}>
            <View style={s.card}>
              <SectionTitle node={calendar}>Plan de traitement</SectionTitle>
              <View style={{ flexDirection: 'row' }}>
                {plan.map((step, i) => {
                  const color = step.couleur === 'teal' ? TEAL : PURPLE;
                  return (
                    <View key={i} style={s.step}>
                      <View style={s.stepHead}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, borderWidth: 2, borderColor: `${color}40` }} />
                        <Text style={[s.stepLabel, { color }]}>{step.titre}</Text>
                      </View>
                      {step.items.map((t, j) => <Text key={j} style={[s.p, { marginBottom: 3 }]}>{t}</Text>)}
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        ) : null}

        {/* Exercices + points importants */}
        {(exercices.items?.length || pointsImportants.length) ? <View style={{ marginTop: 7, flexDirection: 'row' }} wrap={false}>
          {exercices.items?.length ? (
            <View style={{ flex: 1, paddingRight: 5 }}><View style={[s.card, { flexGrow: 1 }]}>
              <SectionTitle node={dumbbell} color={TEAL}>Exercices conseillés</SectionTitle>
              {exercices.intro ? <Text style={[s.p, { marginBottom: 5 }]}>{exercices.intro}</Text> : null}
              {exercices.items.map((t, i) => <Bullet key={i} color={TEAL}>{t}</Bullet>)}
            </View></View>
          ) : null}
          {pointsImportants.length ? (
            <View style={{ flex: 1, paddingLeft: 5 }}><View style={[s.card, { flexGrow: 1 }]}>
              <SectionTitle node={bookmark}>Points importants à retenir</SectionTitle>
              {pointsImportants.map((t, i) => <Check key={i} color={PURPLE}>{t}</Check>)}
            </View></View>
          ) : null}
        </View> : null}

        {/* Conclusion */}
        {conclusion ? (
          <View style={{ marginTop: 7 }} wrap={false}>
            <View style={s.card}>
              <SectionTitle node={circleCheck}>Conclusion</SectionTitle>
              <Text style={[s.p, { lineHeight: 1.6 }]}>{conclusion}</Text>
            </View>
          </View>
        ) : null}

        {/* Photos de consultation */}
        {photos?.length ? (
          <View style={{ marginTop: 7 }} break={photos.length > 2}>
            <SectionTitle node={clipboardList} color={TEAL}>Photos de consultation</SectionTitle>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 }}>
              {photos.map((src, i) => (
                <View key={i} style={{ width: '50%', padding: 3 }} wrap={false}>
                  <Image src={src} style={{ width: '100%', height: 150, objectFit: 'contain', borderRadius: 8, backgroundColor: '#f8fafc' }} />
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={s.footer} fixed>
          <Text style={s.footerTxt}>Ce document a été généré avec l’assistance de l’IA Kemer.{branding?.cabinetName ? ` — ${branding.cabinetName}` : ''}</Text>
          <Text style={s.footerTxt} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};

// Données de la maquette cr-v2, pour l'aperçu et les tests de rendu.
export const DONNEES_EXEMPLE = {
  date: '22 juillet 2026',
  patient: { civilite: 'F', prenom: 'Sophie', nom: 'Meunier', dateNaissance: '01/01/1998' },
  synthese: {
    motif: 'Luxations récidivantes des rotules avec douleurs du genou droit malgré plusieurs interventions chirurgicales.',
    diagnostic: { titre: 'Instabilité fémoro-patellaire droite', detail: 'Suspicion de dysplasie trochléenne associée à un déficit fonctionnel du quadriceps favorisant les épisodes de luxation.' },
    objectifs: ['Diminuer les douleurs', 'Stabiliser le genou', 'Corriger les contraintes biomécaniques', 'À terme : ne plus avoir besoin des semelles'],
    traitement: ['Semelles orthopédiques personnalisées', 'Renforcement musculaire avec le kinésithérapeute', 'Exercices à domicile'],
    dureeSuivi: '1 à 3 ans',
  },
  histoire: {
    intro: 'Depuis environ huit ans, vous présentez des luxations récidivantes des deux rotules. Vous avez bénéficié :',
    antecedents: ['D’une ostéotomie de la TTA avec médialisation et abaissement du genou droit', 'D’une ligamentoplastie MPFL du genou droit', 'D’une chirurgie du genou gauche en janvier 2026'],
    symptomes: [
      { icone: 'activity', texte: 'Sensation de blocage lors des escaliers' },
      { icone: 'footprints', texte: 'Gêne sur les petits déplacements' },
      { icone: 'droplet', texte: 'Épanchement du genou droit' },
      { icone: 'gauge', texte: 'Douleur évaluée à 6-7/10' },
    ],
    conclusion: 'Vous réalisez déjà un travail de rééducation avec votre kinésithérapeute. La presse est l’exercice qui vous fait le plus de bien.',
  },
  examen: {
    statique: { data: [{ label: 'Charge droite', value: 54, color: PURPLE }, { label: 'Charge gauche', value: 46, color: TEAL }], note: 'Surcharge du membre inférieur droit.' },
    pressions: { data: [{ label: 'Talon droit', value: 40, color: PURPLE }, { label: 'Talon gauche', value: 33, color: TEAL }], note: 'Hyperappui du talon droit.' },
    general: ['Pas d’attitude scoliotique', 'Pointure habituelle : 37'],
  },
  analyse: {
    intro: 'Les différents éléments retrouvés sont compatibles avec une instabilité fémoro-patellaire.',
    constats: ['Surcharge du côté droit', 'Tendance des genoux à rentrer vers l’intérieur', 'Fragilité fonctionnelle du quadriceps'],
    precision: 'L’objectif des semelles n’est pas de « remettre le genou en place », mais d’améliorer certains axes biomécaniques afin de diminuer les contraintes appliquées à la rotule.',
  },
  plan: [
    { titre: 'Les 3 prochains mois', couleur: 'teal', items: ['Port progressif des semelles', 'Kinésithérapie', 'Renforcement musculaire'] },
    { titre: 'Les 12 prochains mois', couleur: 'purple', items: ['Suivi podologique', 'Adaptation des semelles si nécessaire', 'Évaluation de la stabilité'] },
    { titre: 'Objectif final', couleur: 'purple', items: ['Pouvoir pratiquer les activités quotidiennes sans douleur et réduire progressivement la dépendance aux semelles.'] },
  ],
  exercices: { intro: 'En complément de la kinésithérapie :', items: ['Squats', 'Fentes', 'Renforcement progressif', 'Charges augmentées progressivement (packs d’eau, haltères…)'] },
  pointsImportants: ['Les douleurs au repos doivent progressivement disparaître.', 'Une gêne après une activité importante (randonnée, longue marche, journée de shopping…) peut rester normale.', 'Le traitement repose autant sur les semelles que sur le renforcement musculaire.'],
  conclusion: 'Votre bilan met en évidence une instabilité du genou droit dans un contexte de luxations récidivantes et de chirurgie. Les semelles orthopédiques sont prescrites afin d’optimiser vos appuis et de limiter les contraintes exercées sur les rotules. Elles s’intègrent dans une prise en charge globale associant kinésithérapie, renforcement musculaire et suivi podologique régulier.',
};
