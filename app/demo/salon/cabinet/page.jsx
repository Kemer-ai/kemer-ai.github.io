"use client";
// Espace cabinet de l'app (vue responsable, app/cabinet/admin) : il lit /api/cabinet, servi ici
// par l'API factice avec les 5 praticiens.
import CabinetAdminPage from "@/components/cabinet/CabinetAdmin";

export default function CabinetDemo() {
  return <CabinetAdminPage />;
}
