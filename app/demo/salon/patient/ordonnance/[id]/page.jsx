// Récupération de l'ordonnance : la page patient de l'app (components/patient), servie par l'API factice.
import OrdonnancePatient from "@/components/patient/OrdonnancePatient";

export function generateStaticParams() {
  return [{ id: "demo-qr-ordonnance" }];
}

export default function Page({ params }) {
  return <OrdonnancePatient params={params} />;
}
