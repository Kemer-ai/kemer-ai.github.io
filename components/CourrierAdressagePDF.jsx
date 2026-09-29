import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

Font.register({
  family: 'Montserrat',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-600-normal.ttf', fontWeight: '600' },
    { src: 'https://cdn.jsdelivr.net/fontsource/fonts/montserrat@latest/latin-400-normal.ttf', fontWeight: 'normal' },
  ]
});

const styles = StyleSheet.create({
  page: {
    padding: 50,
    backgroundColor: '#FFFFFF',
    fontFamily: 'Montserrat',
  },
  courrier: {
    fontSize: 12,
    lineHeight: 1.8,
    color: '#000000',
    fontWeight: '600',
    marginBottom: 20,
    whiteSpace: 'pre-wrap',
  },
  coordonnees: {
    fontSize: 10,
    lineHeight: 1.6,
    color: '#000000',
    fontWeight: '600',
    marginTop: 30,
    borderTop: 1,
    borderTopColor: '#CCCCCC',
    paddingTop: 15,
  },
  coordonneesLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  coordonneesText: {
    fontSize: 10,
    lineHeight: 1.6,
    color: '#000000',
  },
});

export function CourrierAdressagePDF({ courrier, praticien, patient }) {
  const praticienName = [praticien?.prenom, praticien?.nom].filter(Boolean).join(' ') || '';
  const patientName = [patient?.prenom, patient?.nom].filter(Boolean).join(' ') || '';

  const coordonnees = [];
  if (praticienName) coordonnees.push(praticienName);
  if (praticien?.cabinetName) coordonnees.push(praticien.cabinetName);
  if (praticien?.address) coordonnees.push(praticien.address);
  if (praticien?.phone) coordonnees.push(`Tél. : ${praticien.phone}`);
  if (praticien?.email) coordonnees.push(`Mail : ${praticien.email}`);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.courrier}>{courrier}</Text>

        {coordonnees.length > 0 && (
          <View style={styles.coordonnees}>
            <Text style={styles.coordonneesLabel}>Coordonnées du praticien :</Text>
            {coordonnees.map((line, i) => (
              <Text key={i} style={styles.coordonneesText}>{line}</Text>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}
