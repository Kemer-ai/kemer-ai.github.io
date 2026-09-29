"use client";
import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { PATIENTS_INITIAUX, FACTURES_COMPTA, brutDepuisCR } from "./data";
import { enregistrerCR, reinitialiserCabinet, ecouterConsultations } from "./mock-api";

PATIENTS_INITIAUX.forEach((p) => p.consultations.forEach((c) => enregistrerCR(c, p, brutDepuisCR(c.reportData))));

// État de la démo, partagé entre l'accueil et « Mes Patients » : un CR créé en live apparaît
// dans le dossier du patient. Vit dans le layout, donc survit à la navigation.
const DemoContext = createContext(null);

export function DemoProvider({ children }) {
  const [patients, setPatients] = useState(PATIENTS_INITIAUX);
  // Règlements de la comptabilité (les séances des 5 praticiens) : ajout, modification et suppression
  // passent par l'API factice, car dans l'app ces actions se terminent par router.refresh() (relecture
  // serveur), qui ne fait rien dans une démo statique.
  const [compta, setCompta] = useState(FACTURES_COMPTA);
  const [version, setVersion] = useState(0);

  const ajouterConsultation = useCallback((patientId, consultation) => {
    setPatients((ps) => ps.map((p) => (p.id === patientId ? { ...p, consultations: [consultation, ...p.consultations] } : p)));
  }, []);

  const patientsRef = useRef(patients);
  useEffect(() => { patientsRef.current = patients; }, [patients]);

  // Consultations créées ou modifiées par les blocs de l'app (via l'API factice).
  useEffect(() => ecouterConsultations({
    patient: (id) => patientsRef.current.find((p) => p.id === id),
    ajout: (c) => setPatients((ps) => ps.map((p) => (p.id === c.patientId ? { ...p, consultations: [c, ...p.consultations] } : p))),
    maj: (c) => setPatients((ps) => ps.map((p) => (p.id === c.patientId ? { ...p, consultations: p.consultations.map((x) => (x.id === c.id ? c : x)) } : p))),
    // Règlements de la comptabilité.
    ajoutPaiement: (tx) => setCompta((cs) => [tx, ...cs]),
    majPaiement: (id, patch) => setCompta((cs) => cs.map((t) => (t.id === id ? { ...t, ...patch } : t))),
    // Suppression d'une consultation ou d'un règlement, où qu'il se trouve.
    suppr: (id) => {
      setCompta((cs) => cs.filter((t) => t.id !== id));
      setPatients((ps) => ps.map((p) => ({ ...p, consultations: p.consultations.filter((c) => c.id !== id) })));
    },
    // « Mes Patients » : création, modification, suppression d'un patient.
    patientAjout: (p) => setPatients((ps) => [p, ...ps]),
    patientMaj: (id, patch) => setPatients((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p))),
    patientSuppr: (id) => setPatients((ps) => ps.filter((p) => p.id !== id)),
  }), []);

  const ajouterPatient = useCallback((p) => setPatients((ps) => [p, ...ps]), []);

  const reinitialiser = useCallback(() => {
    setPatients(PATIENTS_INITIAUX);
    setCompta(FACTURES_COMPTA);
    reinitialiserCabinet();
    setVersion((v) => v + 1); // remonte les pages : leur état interne repart de zéro
  }, []);

  return (
    <DemoContext.Provider value={{ patients, compta, ajouterConsultation, ajouterPatient, reinitialiser, version }}>
      {children}
    </DemoContext.Provider>
  );
}

export const useDemo = () => useContext(DemoContext);
