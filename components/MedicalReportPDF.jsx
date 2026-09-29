import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';

const getValidImage = (imgStr) => {
  if (!imgStr) return null;
  if (imgStr.startsWith('http') || imgStr.startsWith('data:')) return imgStr;
  return `data:image/png;base64,${imgStr}`;
};

// Enregistrement de la police Montserrat via un CDN stable (jsDelivr)
Font.register({
  family: 'Montserrat',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-400-normal.ttf', fontWeight: 'normal' },
    { src: 'https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-700-normal.ttf', fontWeight: 'bold' },
    { src: 'https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-300-italic.ttf', fontWeight: 'light', fontStyle: 'italic' },
  ]
});

const styles = StyleSheet.create({
  page: { 
    padding: 40, // <-- RÉDUIT : Gagne de la place sur les bords de la feuille
    backgroundColor: '#FFFFFF', 
    fontFamily: 'Montserrat',
    lineHeight: 1 // <-- RÉDUIT : Diminue l'espace entre les lignes
  },
  header: {
    marginBottom: 25,
    borderBottom: 2,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 15
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#001F3F',
    marginTop: 4,
    marginBottom: 6
  },
  date: {
    fontSize: 8,
    color: '#7B7B7B',
    marginTop: 2
  },
  // Section de contenu
  section: {
    marginBottom: 8,
    padding: 8,
    paddingHorizontal: 10,
    backgroundColor: '#FBFBFF',
    borderRadius: 6,
    borderLeft: 3,
    borderLeftColor: '#4ECDC4'
  },
  sectionTitle: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#4931F7',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  content: {
    fontSize: 9,
    color: '#2D3748',
    textAlign: 'justify'
  },
  bulletPoint: {
    flexDirection: 'row',
    marginBottom: 2,
    paddingLeft: 10
  },
  bullet: {
    width: 10,
    fontSize: 10,
    color: '#4931F7'
  },
  footer: { 
    position: 'absolute', 
    bottom: 30, 
    left: 40, 
    right: 40, 
    fontSize: 8, 
    color: '#A0AEC0', 
    textAlign: 'center', 
    borderTop: 1, 
    borderTopColor: '#EDF2F7', 
    paddingTop: 10,
    fontWeight: 'light'
  }
});

export const MedicalReportPDF = ({ data, branding, photos, notes, date }) => {
  const headerImg = getValidImage(branding?.headerImage);
  const formattedDate = date
    ? new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  
  const renderValue = (val) => {
    if (Array.isArray(val)) {
      return val.map((item, i) => (
        <View key={i} style={styles.bulletPoint}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.content}>{String(item)}</Text>
        </View>
      ));
    }
    
    if (typeof val === 'object' && val !== null) {
      return Object.entries(val).map(([k, v]) => (
        <View key={k} style={{ marginBottom: 4 }}>
          <Text style={[styles.sectionTitle, { fontSize: 7, color: '#718096' }]}>{k.replace(/_/g, ' ')}</Text>
          <Text style={styles.content}>{String(v)}</Text>
        </View>
      ));
    }

    return <Text style={styles.content}>{String(val)}</Text>;
  };

  return (
    <Document author="Kemer AI" title="Compte-Rendu Médical">
      <Page size="A4" style={styles.page}>
        
        {/* Header praticien */}
        {headerImg && (
          <View style={{ marginBottom: 16 }}>
            <Image src={headerImg} style={{ width: '100%', maxHeight: 200, objectFit: 'contain', objectPosition: 'top' }} />
          </View>
        )}

        {formattedDate && (
          <Text style={styles.date}>Consultation du {formattedDate}</Text>
        )}

        {/* Contenu Dynamique */}
        {Object.entries(data).map(([key, value]) => {
            if (key === 'patient' || key === 'id') return null;

            return (
                <View key={key} style={styles.section} wrap={false}>
                    <Text style={styles.sectionTitle}>{key.replace(/_/g, ' ')}</Text>
                    {renderValue(value)}
                </View>
            );
        })}

        {/* Notes */}
        {notes?.trim() && (
          <View style={{ ...styles.section, borderLeftColor: '#94a3b8', marginBottom: 12 }} wrap={false}>
            <Text style={{ ...styles.sectionTitle, color: '#64748b' }}>Notes</Text>
            <Text style={styles.content}>{notes}</Text>
          </View>
        )}

        {/* Photos */}
        {photos?.length > 0 && (
          <View style={{ marginTop: 12, marginBottom: 12 }}>
            <View style={{ ...styles.section, marginBottom: 8 }}>
              <Text style={styles.sectionTitle}>Photos de consultation</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {photos.map((src, i) => (
                <Image key={i} src={src} style={{ width: '48%', height: 140, objectFit: 'contain', borderRadius: 6, backgroundColor: '#f8fafc' }} />
              ))}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            Ce document est un compte-rendu médical généré par assistance vocale IA.
          </Text>
          <Text style={{ marginTop: 2 }}>
            Kemer.ai — Solutions numériques pour podologues D.E
          </Text>
        </View>
      </Page>
    </Document>
  );
};