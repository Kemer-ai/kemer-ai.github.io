import { pdf } from "@react-pdf/renderer";
import { PatientReportPDF } from "@/components/PatientReportPDF";
import { MedicalReportPDF } from "@/components/MedicalReportPDF";

/**
 * PDF du compte rendu envoyé au patient. Demande la version « patient » à /api/generate-patient-report
 * puis la met en page avec PatientReportPDF. Si la consultation est inconnue ou si la génération échoue
 * (modèle indisponible, réponse vide…), on retombe sur l'ancien PDF : l'envoi ne doit jamais être bloqué.
 * `repli: false` (aperçu du document) : pas de repli silencieux, l'erreur remonte, sinon on croirait
 * voir le nouveau PDF alors que c'est l'ancien.
 */
export async function blobCrPatient({ consultationId, reportData, branding, photos, date, repli = true }) {
  if (!repli) {
    if (!consultationId) throw new Error("Consultation inconnue.");
    const res = await fetch("/api/generate-patient-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ consultationId }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Erreur ${res.status}`);
    const { data } = await res.json();
    return pdf(<PatientReportPDF data={data} branding={branding} photos={photos} />).toBlob();
  }
  if (consultationId) {
    try {
      const res = await fetch("/api/generate-patient-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultationId }),
      });
      if (res.ok) {
        const { data } = await res.json();
        return await pdf(<PatientReportPDF data={data} branding={branding} photos={photos} />).toBlob();
      }
    } catch (err) {
      console.error("[crPatientPdf] repli sur l'ancien PDF —", err);
    }
  }
  return pdf(<MedicalReportPDF data={reportData} branding={branding} photos={photos} date={date} />).toBlob();
}
