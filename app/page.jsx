"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Pas de redirection serveur en export statique : la page d'accueil renvoie vers la démo.
export default function Accueil() {
  const router = useRouter();
  useEffect(() => { router.replace("/demo/salon/"); }, [router]);
  return null;
}
