"use client";
// Comptabilité de l'app (app/comptabilite/ComptaClient), alimentée par les séances fictives des
// 5 praticiens du cabinet, plus les factures créées pendant la démo (Thomas Durand).
import { useMemo } from "react";
import ComptaClient from "@/app/comptabilite/ComptaClient";
import { useDemo } from "../demo-context";
import { PATIENTS_COMPTA, EQUIPE } from "../data";

export default function ComptaDemo() {
  const { patients, compta } = useDemo();

  const donnees = useMemo(() => {
    const thomas = EQUIPE[0];
    const creees = patients.flatMap((p) =>
      p.consultations
        .filter((c) => c.devisData?.items?.length && /^demo-\d/.test(c.id))
        .map((c) => ({
          ...c,
          patient: { id: p.id, prenom: p.prenom, nom: p.nom },
          praticien: { id: thomas.id, prenom: thomas.prenom, nom: thomas.nom, cabinetRole: thomas.cabinetRole, pourcentageReversement: thomas.pourcentageReversement },
        })),
    );
    return [...creees, ...compta].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [patients, compta]);

  return <ComptaClient initialData={donnees} patients={PATIENTS_COMPTA} cabinetMembres={EQUIPE} />;
}
