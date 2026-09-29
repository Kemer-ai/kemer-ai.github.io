"use client";

import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import MesPatients from "@/components/profile/MesPatients";

function PatientsContent({ patients, praticien, recoverableLogs }) {
  return (
    <div className="min-h-screen w-full bg-[#f8fafc] dark:bg-[#0b1121] transition-colors duration-300 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black text-[#001F3F] dark:text-white tracking-tighter">
            Mes <span className="text-[#4931F7]">Patients</span>
          </h1>
          <p className="text-sm text-gray-400 font-medium mt-1">
            Consultations, documents et dossiers en un coup d'œil
          </p>
        </div>
        <MesPatients patients={patients} praticien={praticien} recoverableLogs={recoverableLogs} />
      </div>
    </div>
  );
}

export default function PatientsClient({ patients = [], praticien = null, recoverableLogs = [] }) {
  return (
    <Suspense fallback={
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#f8fafc] dark:bg-[#0b1121]">
        <Loader2 size={40} className="text-[#4931F7] animate-spin mb-4" />
        <p className="text-gray-500 font-bold animate-pulse">Chargement…</p>
      </div>
    }>
      <PatientsContent patients={patients} praticien={praticien} recoverableLogs={recoverableLogs} />
    </Suspense>
  );
}
