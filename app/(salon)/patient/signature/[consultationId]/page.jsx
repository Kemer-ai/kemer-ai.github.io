// Signature du devis / téléchargement de la facture : la page patient de l'app (components/patient), servie par
// l'API factice, avec une signature fictive qui se trace toute seule (signature-animee.jsx). Les identifiants
// sont ceux des documents préparés (data.js).
import SignaturePatient from "@/components/patient/SignaturePatient";
import SignatureAnimee from "../../../signature-animee";

export function generateStaticParams() {
  return [{ consultationId: "demo-qr-devis" }, { consultationId: "demo-qr-pedicurie" }];
}

export default function Page({ params }) {
  return <SignatureAnimee><SignaturePatient params={params} /></SignatureAnimee>;
}
