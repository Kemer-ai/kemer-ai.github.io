"use client";
// « Mes Patients » de l'app, tel quel (app/patients/PatientsClient), alimenté par les patients fictifs.
import PatientsClient from "@/app/patients/PatientsClient";
import { useDemo } from "../demo-context";
import { PRATICIEN_DEMO } from "../data";

export default function PatientsDemo() {
  const { patients } = useDemo();
  return <PatientsClient patients={patients} praticien={PRATICIEN_DEMO} recoverableLogs={[]} />;
}
