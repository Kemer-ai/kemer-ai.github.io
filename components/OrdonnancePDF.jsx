import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';

// URLs CDN plutôt que des chemins locaux "/fonts/..." — voir InvoicePDF.jsx
Font.register({
  family: 'Montserrat',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-400-normal.ttf', fontWeight: 400 },
    { src: 'https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-700-normal.ttf', fontWeight: 700 },
    { src: 'https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-900-normal.ttf', fontWeight: 900 },
  ]
});

const styles = StyleSheet.create({
  page: {
    paddingTop: 30,
    paddingLeft: 50,
    paddingRight: 50,
    paddingBottom: 90,
    fontFamily: 'Montserrat',
    fontSize: 10,
    color: '#334155',
    lineHeight: 1.4,
  },

  // Header (repris d'InvoicePDF)
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  brandBlock: { alignItems: 'flex-start' },
  logoImage: { height: 45, objectFit: 'contain', marginBottom: 8 },
  praticienName: { fontSize: 14, fontWeight: 900, color: '#000000', marginBottom: 2 },
  cabinetDetail: { fontSize: 8, color: '#64748b', marginBottom: 1 },
  customHeaderImage: { width: '100%', maxHeight: 150, objectFit: 'contain', marginBottom: 10 },

  // Séparateur bleu
  separator: { borderBottomWidth: 1.5, borderBottomColor: '#4931F7', marginBottom: 22 },

  // Date (alignée à droite)
  dateRow: { alignItems: 'flex-end', marginBottom: 24 },
  dateText: { fontSize: 10, color: '#334155' },

  // Bloc patient
  patientBlock: { marginBottom: 28 },
  patientName: { fontSize: 11, fontWeight: 700, color: '#001F3F', marginBottom: 2 },
  patientMeta: { fontSize: 9, color: '#475569' },

  // Liste médicaments
  itemsContainer: { marginBottom: 30 },
  itemRow: { flexDirection: 'row', marginBottom: 14, alignItems: 'flex-start' },
  itemBullet: { fontSize: 11, fontWeight: 700, color: '#001F3F', marginRight: 8, marginTop: 1 },
  itemBody: { flex: 1 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemNameDosage: { fontSize: 10, fontWeight: 700, color: '#001F3F', flex: 1 },
  itemQty: { fontSize: 9, color: '#64748b', textAlign: 'right', marginLeft: 12 },
  itemInstructions: { fontSize: 9, color: '#475569', marginTop: 2 },

  // Footer image (repris d'InvoicePDF)
  customFooterContainer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    height: 150,
  },
  customFooterImage: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    objectPosition: 'bottom',
  },
});

const getValidImage = (imgStr) => {
  if (!imgStr) return null;
  if (imgStr.startsWith('http') || imgStr.startsWith('data:')) return imgStr;
  return `data:image/png;base64,${imgStr}`;
};

export const OrdonnancePDF = ({ data, patient, branding }) => {
  const primaryColor = branding?.primaryColor || '#4931F7';

  const headerImg = getValidImage(branding?.headerImage);
  const footerImg = getValidImage(branding?.footerImage);
  const logoImg = getValidImage(branding?.logo);

  const age = patient?.dateNaissance
    ? Math.floor((Date.now() - new Date(patient.dateNaissance).getTime()) / 3.15576e10)
    : null;

  const ville = branding?.ville || branding?.address?.split(' ').slice(-1)[0] || 'Paris';
  const dateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  const civility = patient?.sexe === 'F' ? 'Mme' : patient?.sexe === 'M' ? 'M.' : '';

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* Footer image fixe */}
        {footerImg && (
          <View style={styles.customFooterContainer} fixed>
            <Image src={footerImg} style={styles.customFooterImage} />
          </View>
        )}

        {/* Header */}
        {headerImg ? (
          <Image src={headerImg} style={styles.customHeaderImage} />
        ) : (
          <View style={styles.headerContainer}>
            <View style={styles.brandBlock}>
              {logoImg && <Image src={logoImg} style={styles.logoImage} />}
              <Text style={styles.praticienName}>
                {branding?.prenom} {branding?.nom?.toUpperCase()}
              </Text>
              <Text style={[styles.cabinetDetail, { fontWeight: 700 }]}>
                {branding?.cabinetName || 'Cabinet de Podologie'}
              </Text>
              <Text style={styles.cabinetDetail}>{branding?.address || ''}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.cabinetDetail}>{branding?.address || ''}</Text>
              <Text style={styles.cabinetDetail}>{branding?.phone || ''}</Text>
              <Text style={styles.cabinetDetail}>{branding?.contactEmail || branding?.email || ''}</Text>
            </View>
          </View>
        )}

        {/* Ligne séparatrice */}
        <View style={[styles.separator, { borderBottomColor: primaryColor }]} />

        {/* Date */}
        <View style={styles.dateRow}>
          <Text style={styles.dateText}>{ville}, le {dateStr}</Text>
        </View>

        {/* Patient */}
        <View style={styles.patientBlock}>
          <Text style={styles.patientName}>
            {civility} {patient?.prenom} {patient?.nom?.toUpperCase()}
          </Text>
          {age && <Text style={styles.patientMeta}>{age} ans</Text>}
          {patient?.adresse && <Text style={styles.patientMeta}>{patient.adresse}</Text>}
          {(patient?.codePostal || patient?.ville) && (
            <Text style={styles.patientMeta}>{patient?.codePostal || ''} {patient?.ville || ''}</Text>
          )}
        </View>

        {/* Médicaments */}
        <View style={styles.itemsContainer}>
          {data?.items?.map((item, i) => (
            <View key={i} style={styles.itemRow}>
              <Text style={styles.itemBullet}>—</Text>
              <View style={styles.itemBody}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemNameDosage}>
                    {item.name}{item.dosage ? ` ${item.dosage}` : ''}{item.form ? ` — ${item.form}` : ''}
                  </Text>
                  <Text style={styles.itemQty}>{item.qty} {item.unit}</Text>
                </View>
                {item.instructions ? (
                  <Text style={styles.itemInstructions}>{item.instructions}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>

      </Page>
    </Document>
  );
};
