import CodePatient from "./CodePatient";

// Export statique : un seul code d'accès (celui du QR du chevalet de la démo).
export function generateStaticParams() {
  return [{ code: "demo" }];
}

export default function Page({ params }) {
  return <CodePatient params={params} />;
}
