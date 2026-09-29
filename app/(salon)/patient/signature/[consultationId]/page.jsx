// Signature du devis / téléchargement de la facture : la page patient de l'app (components/patient),
// servie par l'API factice. Les identifiants sont ceux des documents préparés (data.js).
import SignaturePatient from "@/components/patient/SignaturePatient";

export function generateStaticParams() {
  return [{ consultationId: "demo-qr-devis" }, { consultationId: "demo-qr-pedicurie" }];
}

export default function Page({ params }) {
  return <SignaturePatient params={params} />;
}
