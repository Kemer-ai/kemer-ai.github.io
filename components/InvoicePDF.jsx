import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';

// --- ENREGISTREMENT DE LA POLICE MONTSERRAT ---
// URLs CDN plutôt que des chemins locaux "/fonts/..." : ces derniers sont
// interprétés par @react-pdf/renderer comme des chemins filesystem côté
// serveur (Node), pas comme des URLs relatives au site — ils crashaient en
// ENOENT sur les déploiements dont l'arborescence de build diffère (ex.
// Scalingo, buildpack, vs. l'image Docker Cloud Run).
Font.register({
  family: 'Montserrat',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-400-normal.ttf', fontWeight: 400 },
    { src: 'https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-700-normal.ttf', fontWeight: 700 },
    { src: 'https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-900-normal.ttf', fontWeight: 900 },
  ]
});

// --- STYLES DU PDF ---
const styles = StyleSheet.create({
  page: { 
    // 🟢 Decreased overall padding for a larger feel
    paddingTop: 15,
    paddingLeft: 30,
    paddingRight: 30,
    paddingBottom: 70, // Less bottom padding, but leaves room for footer
    fontFamily: 'Montserrat', 
    fontSize: 10, 
    color: '#334155', 
    lineHeight: 1.4,
  },
  
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  brandBlock: { alignItems: 'flex-start', flex: 1 },
  // 🟢 Increased logo height
  logoImage: { height: 60, objectFit: 'contain', marginBottom: 12 },
  // 🟢 Increased font sizes and margins
  praticienName: { fontSize: 18, fontWeight: 900, color: '#000000', marginBottom: 6, textTransform: 'uppercase' },
  cabinetDetail: { fontSize: 9, color: '#64748b', marginBottom: 2, fontWeight: 500, letterSpacing: -0.2 },
  
  // 🟢 Increased maximum height for images to fill more space naturally
  customHeaderImage: { width: '100%', maxHeight: 250, objectFit: 'contain', objectPosition: 'top', marginBottom: 25 },
  docInfoBox: { textAlign: 'right' },
  // 🟢 Scaled up document meta font size
  docMeta: { fontSize: 10, color: '#475569', marginBottom: 4, fontWeight: 700 },

  metaAndPatientWrapper: { alignItems: 'flex-end', marginBottom: 30, marginTop: 10 },
  // 🟢 Slightly larger patient box font sizes
  patientBox: { width: '55%', backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, borderLeftWidth: 4, marginTop: 5 },
  patientLabel: { fontSize: 8, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 },
  patientName: { fontSize: 13, fontWeight: 700, color: '#001F3F', marginBottom: 4 },
  patientText: { fontSize: 10, fontWeight: 400, color: '#475569', marginBottom: 1 },

  table: { width: '100%', marginBottom: 20 },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#cbd5e1', paddingBottom: 6, marginBottom: 12 },
  // 🟢 Larger table header font size
  tableHeaderCell: { fontSize: 9, fontWeight: 700, color: '#001F3F', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingVertical: 8, alignItems: 'center' },
  colDesc: { flex: 1 },
  colQty: { width: 60, textAlign: 'center' },
  colUP: { width: 80, textAlign: 'right' },
  colTotal: { width: 80, textAlign: 'right' },
  // 🟢 Scaled up table cell font sizes
  cellTitle: { fontSize: 11, fontWeight: 700, color: '#0f172a' },
  cellValue: { fontSize: 11, fontWeight: 700, color: '#334155' },

  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 15,
  },
  
  docTitle: { fontSize: 22, fontWeight: 900, color: '#475569', marginBottom: 10, paddingBottom: 6 },

  acquitteeBlock: { flex: 1, paddingTop: 4 },
  acquitteeText: { fontSize: 11, fontWeight: 700, color: '#001F3F', marginBottom: 6 },

  rightBlock: { width: 220, alignItems: 'flex-end' },
  totalsBox: { width: '100%', marginBottom: 20 },
  totalFinalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  // 🟢 Increased overall total block font sizes
  totalFinalLabel: { fontSize: 13, fontWeight: 700, color: '#001F3F', textTransform: 'uppercase' },
  totalFinalValue: { fontSize: 15, fontWeight: 700 },
  
  signatureBox: { width: 160, alignItems: 'center', marginTop: 10 },
  // 🟢 Scaled up signature block font size
  signatureTitle: { fontSize: 10, fontWeight: 700, color: '#001F3F', marginBottom: 10 },
  signatureImage: { width: 140, height: 60, objectFit: 'contain' },
  signaturePlaceholder: { width: 140, height: 50, borderBottomWidth: 1, borderBottomStyle: 'dashed', borderBottomColor: '#cbd5e1' },

  customFooterContainer: { 
    position: 'absolute', 
    bottom: 10, // Close to edge
    left: 30, 
    right: 30,
    // 🟢 Increased overall height and ensured proper objectFit/Position
    height: 180
  },
  customFooterImage: { 
    width: '100%', 
    height: '100%', 
    objectFit: 'contain',
    objectPosition: 'bottom' // Keep at bottom, scale naturally
  },
});

const getValidImage = (imgStr) => {
  if (!imgStr) return null;
  if (imgStr.startsWith('http') || imgStr.startsWith('data:')) return imgStr;
  return `data:image/png;base64,${imgStr}`;
};

export const InvoicePDF = ({ data, patient, signature, type, branding, hideSig = false, date }) => {
    const isFacture = type === 'facture';
    const primaryColor = branding?.primaryColor || '#4931F7';

    const headerImg = getValidImage(branding?.headerImage);
    const footerImg = getValidImage(branding?.footerImage);
    const logoImg = getValidImage(branding?.logo);

    const safeNumber = (val) => {
      const num = parseFloat(String(val).replace(/[^0-9.,]/g, '').replace(',', '.'));
      return isNaN(num) ? 0 : num;
    };

    const displayDate = date
      ? new Date(date).toLocaleDateString('fr-FR')
      : (data?.factureDate ? new Date(data.factureDate).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR'));

    // Pour le devis : n'afficher que les semelles (devisItems), pour la facture : tous les actes
    const displayItems = !isFacture && data?.devisItems?.length ? data.devisItems : (data?.items || []);
    const totalAmount = displayItems.reduce((acc, item) => acc + (safeNumber(item.unitPrice) * safeNumber(item.quantity)), 0) || 0;
    const docNumber = `${isFacture ? 'F' : 'D'}-${new Date().getFullYear()}${new Date().getMonth()+1}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Présence de semelles (pour la nomenclature) — vérifié sur les items de la facture complète
    const hasSemelles = data?.items?.some(item =>
      item.description?.toLowerCase().includes('semelle') ||
      item.description?.toLowerCase().includes('orthèse')
    ) || !!data?.devisItems?.length;

    return (
      <Document>
        <Page size="A4" style={styles.page}>
          
          {footerImg && (
            <View style={styles.customFooterContainer} fixed>
              <Image src={footerImg} style={styles.customFooterImage} />
            </View>
          )}

          {headerImg ? (
            <View>
              <Image src={headerImg} style={styles.customHeaderImage} />
              <View style={[styles.docInfoBox, { marginBottom: 10 }]}>
                <Text style={styles.docTitle}>{isFacture ? 'FACTURE' : 'DEVIS'}</Text>
                <Text style={styles.docMeta}>Date : {displayDate}</Text>
                <Text style={styles.docMeta}>N° {docNumber}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.headerContainer}>
              <View style={styles.brandBlock}>
                {logoImg && <Image src={logoImg} style={styles.logoImage} />}
                <Text style={styles.praticienName}>
                  {branding?.prenom} {branding?.nom?.toUpperCase()}
                </Text>
                <Text style={[styles.cabinetDetail, { fontWeight: 700, color: '#000000', fontSize: 11 }]}>
                  {branding?.cabinetName || 'Cabinet de Podologie'}
                </Text>
                <Text style={styles.cabinetDetail}>{branding?.address || 'Adresse non renseignée'}</Text>
                <Text style={styles.cabinetDetail}>{branding?.phone || 'Téléphone non renseigné'}</Text>
                <Text style={styles.cabinetDetail}>{branding?.contactEmail || branding?.email || 'Email non renseigné'}</Text>
              </View>
              <View style={styles.docInfoBox}>
                <Text style={styles.docTitle}>{isFacture ? 'FACTURE' : 'DEVIS'}</Text>
                <Text style={styles.docMeta}>Date : {displayDate}</Text>
                <Text style={styles.docMeta}>N° {docNumber}</Text>
              </View>
            </View>
          )}

          <View style={styles.metaAndPatientWrapper}>
            {/* Kept Date/Number here only if NO header image is present for consistency but scaled up */}
            {!headerImg && (
                <>
                {/* Replaced Text with empty block here as we moved meta up for better scaling */}
                <View style={{height: 10}}></View> 
                </>
            )}
            
            <View style={[styles.patientBox, { borderLeftColor: primaryColor }]}>
              <Text style={styles.patientLabel}>Patient</Text>
              <Text style={styles.patientName}>{patient?.prenom || ""} {patient?.nom?.toUpperCase() || ""}</Text>
              {patient?.adresse && <Text style={styles.patientText}>{patient.adresse}</Text>}
              {patient?.codePostal || patient?.ville ? (
                <Text style={styles.patientText}>{patient?.codePostal || ''} {patient?.ville?.toUpperCase() || ''}</Text>
              ) : null}
              {patient?.telephone && <Text style={styles.patientText}>{patient.telephone}</Text>}
            </View>
          </View>
  
          {/* Tableau (Scaled up font sizes) */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colDesc]}>Description</Text>
              <Text style={[styles.tableHeaderCell, styles.colQty]}>Qté</Text>
              <Text style={[styles.tableHeaderCell, styles.colUP]}>Unit.</Text>
              <Text style={[styles.tableHeaderCell, styles.colTotal]}>Total</Text>
            </View>
  
            {displayItems.map((item, i) => {
              const qte = safeNumber(item.quantity) || 1;
              const prixU = safeNumber(item.unitPrice);
              const totalLigne = qte * prixU;

              return (
                <View key={i} style={styles.tableRow}>
                  <View style={styles.colDesc}>
                    <Text style={styles.cellTitle}>{item.description}</Text>
                  </View>
                  <Text style={[styles.cellValue, styles.colQty]}>{String(qte)}</Text>
                  <Text style={[styles.cellValue, styles.colUP]}>{`${prixU.toFixed(2)} €`}</Text>
                  <Text style={[styles.cellValue, styles.colTotal]}>{`${totalLigne.toFixed(2)} €`}</Text>
                </View>
              )
            })}
          </View>
  
          {/* Bottom section (Scaled up font sizes) */}
          <View style={styles.bottomSection}>

            <View style={styles.acquitteeBlock}>
              {/* Nomenclature — affichée sur devis ET facture, uniquement si semelles et nomenclature explicitement sélectionnée */}
              {hasSemelles && data?.nomenclatureSelected && (
                <Text style={styles.acquitteeText}>Nomenclature: {data.nomenclatureSelected}</Text>
              )}
              {isFacture && (
                <Text style={styles.acquitteeText}>Facture acquittée de {totalAmount.toFixed(2)} euros</Text>
              )}
            </View>

            <View style={styles.rightBlock}>
              {!isFacture && (
                <View style={styles.totalsBox}>
                  <View style={styles.totalFinalRow}>
                    <Text style={styles.totalFinalLabel}>TOTAL</Text>
                    <Text style={[styles.totalFinalValue, { color: primaryColor }]}>{totalAmount.toFixed(2)} €</Text>
                  </View>
                </View>
              )}

              {!hideSig && (
                <View style={styles.signatureBox}>
                  <Text style={styles.signatureTitle}>Signature du patient</Text>
                  {signature ? (
                    <Image src={signature} style={styles.signatureImage} />
                  ) : (
                    <View style={styles.signaturePlaceholder} />
                  )}
                </View>
              )}
            </View>

          </View>
  
        </Page>
      </Document>
    );
};