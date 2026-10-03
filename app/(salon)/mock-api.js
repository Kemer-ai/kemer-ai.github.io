// Les vrais composants de l'app appellent /api/* (sauvegarde, envoi d'e-mail, notifications…).
// Dans la démo, aucun de ces appels ne doit partir : ils reçoivent une réponse factice locale.
// Tout ce qui n'est pas /api/ (polices, images, scripts) passe normalement.
import { normaliser } from "@/lib/patientReport";
import { courrierAdressage, resumeConfrere, courrierVide } from "./textes-factices";
import { CABINET_DEMO, PRATICIEN_DEMO, ORDONNANCE_DICTEE, CONSULTATIONS_QR, DOCUMENTS_QR, PATIENTS_COMPTA, EQUIPE } from "./data";

// Consultations connues de la démo : la version « patient » d'un CR est mise en page par le vrai
// PatientReportPDF à partir de textes préparés, sans appel au modèle.
const registre = new Map();
export const enregistrerCR = (consultation, patient, brut) =>
  registre.set(consultation.id, { consultation, patient, brut });

// Documents « en attente » côté patient (QR) : lisibles par les vraies pages /patient/*.
CONSULTATIONS_QR.forEach((c) => registre.set(c.id, { consultation: c, patient: c.patient, brut: null }));

// Le contexte de la démo s'abonne ici : chaque soin, facture ou ordonnance créé par les blocs de
// l'app doit apparaître dans le dossier du patient, la comptabilité et les Récents.
let ecouteur = null;
export const ecouterConsultations = (l) => { ecouteur = l; return () => { if (ecouteur === l) ecouteur = null; }; };

const nouvelle = (patientId, extra) => ({
  id: `demo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  patientId, praticienId: "demo-praticien", createdAt: new Date().toISOString(),
  typeConsultation: null, motif: null, reportData: null, transcription: null,
  devisData: null, factureData: null, ordonnanceData: null, signatureDevis: null, signatureFacture: null,
  photos: null, notes: null, ...extra,
});

function creer(patientId, extra) {
  const c = nouvelle(patientId, extra);
  const patient = ecouteur?.patient(patientId);
  if (patient) registre.set(c.id, { consultation: c, patient, brut: null });
  ecouteur?.ajout(c);
  return json({ success: true, consultationId: c.id });
}

// Le cabinet vit en mémoire : inviter, retirer un membre ou régler un pourcentage se voit tout de
// suite, sans qu'aucun e-mail ne parte. « Réinitialiser » le remet à l'état d'origine.
let cabinet = structuredClone(CABINET_DEMO);
export const reinitialiserCabinet = () => { cabinet = structuredClone(CABINET_DEMO); };

// Texte « généré » rangé dans le CR de la consultation (comme le fait la vraie route), pour qu'il survive à la navigation.
function rangerDansLeCR(id, e, patch) {
  const maj = { ...e.consultation, reportData: { ...e.consultation.reportData, ...patch } };
  registre.set(id, { ...e, consultation: maj });
  ecouteur?.maj(maj);
}
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function cheminApi(input) {
  const url = typeof input === "string" ? input : input?.url;
  if (!url) return null;
  if (url.startsWith("/api/")) return url;
  if (url.startsWith(window.location.origin + "/api/")) return url.slice(window.location.origin.length);
  return null;
}

const corps = (init) => { try { return JSON.parse(init?.body || "{}"); } catch { return {}; } };

export function installerApiFactice() {
  const original = window.fetch;
  window.fetch = async (input, init) => {
    const chemin = cheminApi(input);
    if (!chemin) return original(input, init);
    const methode = (init?.method || "GET").toUpperCase();
    const [route] = chemin.split("?");

    if (route === "/api/generate-patient-report" && methode === "POST") {
      const e = registre.get(corps(init).consultationId);
      if (!e) return json({ error: "Consultation introuvable" }, 404);
      const { consultation: c, patient: p } = e;
      return json({
        data: normaliser(e.brut, {
          patient: { prenom: p.prenom, nom: p.nom, dateNaissanceFr: p.dateNaissance ? new Date(p.dateNaissance).toLocaleDateString("fr-FR", { timeZone: "UTC" }) : null },
          date: new Date(c.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }),
        }),
      });
    }

    const fiche = route.match(/^\/api\/consultations\/([^/]+)$/);
    if (fiche && methode === "GET") {
      const e = registre.get(fiche[1]);
      return e ? json({ ...e.consultation, patient: e.patient }) : json({ error: "Introuvable" }, 404);
    }
    if (fiche && methode === "PUT") {
      const e = registre.get(fiche[1]);
      const patch = corps(init);
      if (e) {
        const maj = { ...e.consultation, ...patch };
        if (patch.devisData) maj.devisData = { ...(e.consultation.devisData || {}), ...patch.devisData };
        registre.set(fiche[1], { ...e, consultation: maj });
        ecouteur?.maj(maj);
      } else {
        ecouteur?.majPaiement(fiche[1], patch); // règlement de la comptabilité
      }
      return json({ success: true });
    }
    // Signature du patient (page /patient/signature) : mêmes effets que la vraie route.
    const signature = route.match(/^\/api\/consultations\/([^/]+)\/sign$/);
    if (signature && methode === "POST") {
      const id = signature[1];
      const { signature: image, type } = corps(init);
      if (!image) return json({ error: "Signature manquante" }, 400);
      // Les documents du parcours QR du visiteur (demo-qr-*) ne gardent pas la signature : chaque visiteur
      // repart d'un document à signer.
      if (id.startsWith("demo-qr-")) return json({ success: true });
      const e = registre.get(id);
      if (!e) return json({ error: "Consultation introuvable" }, 404);
      let maj = e.consultation;
      if (type === "pedicurie" || type === "ordonnance") {
        // Ne pas écraser une vraie signature par « DOWNLOADED ».
        if (!maj.signatureFacture || maj.signatureFacture === "DOWNLOADED") maj = { ...maj, signatureFacture: "DOWNLOADED" };
      } else if (type === "devis") {
        maj = {
          ...maj, signatureDevis: image,
          devisData: maj.devisData ? { ...maj.devisData, status: "SIGNED", signedAt: new Date().toISOString() } : null,
        };
      } else if (type === "facture") {
        maj = { ...maj, signatureFacture: image };
      } else {
        return json({ error: "Type de signature inconnu" }, 400);
      }
      registre.set(id, { ...e, consultation: maj });
      ecouteur?.maj(maj); // le dossier du patient, la comptabilité et les PDF voient la signature
      return json({ success: true });
    }
    if (fiche && methode === "DELETE") {
      registre.delete(fiche[1]);
      ecouteur?.suppr(fiche[1]);
      return json({ success: true });
    }

    // Comptabilité : « Ajouter un règlement ». Rattaché à un CR existant s'il est choisi, sinon nouvelle séance.
    if (methode === "POST" && route === "/api/consultation/payment") {
      const { patientId, montant, modePaiement, date, consultationId } = corps(init);
      const devisData = {
        items: [{ description: "Séance bilan podologique", quantity: 1, unitPrice: montant }],
        totalAmount: String(montant), status: "SIGNED", modePaiement, factureDate: date || new Date().toISOString(),
      };
      const lie = consultationId && registre.get(consultationId);
      if (lie) {
        const maj = { ...lie.consultation, typeConsultation: "facturation", devisData };
        registre.set(consultationId, { ...lie, consultation: maj });
        ecouteur?.maj(maj);
        return json({ success: true, consultationId });
      }
      const patient = ecouteur?.patient(patientId) || PATIENTS_COMPTA.find((p) => p.id === patientId);
      const thomas = EQUIPE[0];
      const tx = {
        id: `demo-pay-${Date.now()}`, createdAt: date || new Date().toISOString(), typeConsultation: "facturation",
        patientId, patient: patient && { id: patient.id, prenom: patient.prenom, nom: patient.nom },
        praticienId: thomas.id, praticien: { id: thomas.id, prenom: thomas.prenom, nom: thomas.nom, cabinetRole: thomas.cabinetRole, pourcentageReversement: thomas.pourcentageReversement },
        reportData: null, factureData: null, signatureFacture: null, devisData,
      };
      ecouteur?.ajoutPaiement(tx);
      return json({ success: true, consultationId: tx.id });
    }

    if (methode === "POST" && route === "/api/facturation") {
      const { patientId, devisData, typeConsultation, motif } = corps(init);
      return creer(patientId, { typeConsultation: "facturation", motif, devisData: { ...devisData, sousType: typeConsultation } });
    }
    if (methode === "POST" && route === "/api/pedicurie-facture") {
      const { patientId, transcription } = corps(init);
      return creer(patientId, { typeConsultation: "pedicurie", motif: "Soin de Pédicurie", transcription });
    }
    if (methode === "POST" && route === "/api/ordonnance") {
      const { patientId, ordonnanceData } = corps(init);
      return creer(patientId, { typeConsultation: "ordonnance", motif: "Prescription médicale", ordonnanceData });
    }
    if (methode === "POST" && route === "/api/ordonnance-dictation") {
      await new Promise((r) => setTimeout(r, 1400)); // le temps d'« analyser » la dictée
      return json({ items: ORDONNANCE_DICTEE });
    }

    if (route === "/api/patient/check-devis" && methode === "POST") {
      // Comme l'app, mais sans refuser : un visiteur ne connaît pas le nom d'un patient fictif.
      // Un code connu ouvre son document ; tout autre code ouvre le devis à signer.
      const code = String(corps(init).securityCode || "").replace(/[^a-zA-Z]/g, "").slice(0, 3).toUpperCase();
      await new Promise((r) => setTimeout(r, 500));
      return json(DOCUMENTS_QR[code] || DOCUMENTS_QR.DEL);
    }

    if (route === "/api/cabinet") {
      if (methode === "PATCH") { cabinet = { ...cabinet, ...corps(init) }; return json({ success: true }); }
      if (methode === "GET") return json({ ...cabinet, isOwner: true });
      return json({ success: true });
    }
    if (route === "/api/cabinet/invite" && methode === "POST") {
      const { email, role } = corps(init);
      const jour = 24 * 3600 * 1000;
      cabinet = { ...cabinet, invitations: [...cabinet.invitations, { id: `inv-${Date.now()}`, email, role, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 7 * jour).toISOString() }] };
      return json({ success: true });
    }
    const membre = route.match(/^\/api\/cabinet\/members\/([^/]+)$/);
    if (membre) {
      if (methode === "DELETE") cabinet = { ...cabinet, membres: cabinet.membres.filter((m) => m.id !== membre[1]) };
      if (methode === "PATCH") cabinet = { ...cabinet, membres: cabinet.membres.map((m) => (m.id === membre[1] ? { ...m, pourcentageReversement: corps(init).pourcentageReversement } : m)) };
      return json({ success: true });
    }

    // Courrier d'adressage et résumé pour les confrères : aucun modèle d'IA, un texte assemblé à partir du CR
    // (textes-factices.js), après le temps d'une « génération ».
    if ((route === "/api/generate-courrier-adressage" || route === "/api/generate-confrere-summary") && methode === "POST") {
      const id = corps(init).consultationId;
      const e = registre.get(id);
      await attendre(1400);
      if (!e) return json({ error: "Consultation introuvable" }, 404);
      const rd = e.consultation.reportData;
      if (courrierVide(rd)) return json({ error: "Aucun compte rendu disponible pour générer le document." }, 400);
      if (route === "/api/generate-courrier-adressage") {
        const courrier = courrierAdressage({ reportData: rd, patient: e.patient, praticien: PRATICIEN_DEMO });
        rangerDansLeCR(id, e, { courrier_adressage: courrier });
        return json({ courrier_adressage: courrier });
      }
      const resume = resumeConfrere(rd);
      rangerDansLeCR(id, e, { resume_confreres: resume });
      return json({ resume_confreres: resume });
    }
    // Envoi du courrier au médecin : rien ne part, la démo répond « envoyé ».
    if (route === "/api/send-courrier-medecin" && methode === "POST") {
      await attendre(900);
      return json({ success: true });
    }

    if (route === "/api/stripe/subscription") {
      return json({
        abonnement: "pro",
        subscription: { status: "active", currentPeriodEnd: Math.floor(Date.now() / 1000) + 19 * 24 * 3600, cancelAtPeriodEnd: false },
      });
    }
    if (route === "/api/stripe/portal") return json({ error: "Le portail de facturation n'est pas disponible dans la démo." });
    if (route.startsWith("/api/notifications")) return json([]);
    if (route.startsWith("/api/image-proxy")) return new Response(null, { status: 404 });
    if (route === "/api/patients" && methode === "POST") {
      const p = { ...corps(init), id: `demo-${Date.now()}`, consultations: [], createdAt: new Date().toISOString() };
      ecouteur?.patientAjout(p);
      return json(p);
    }
    const fichePatient = route.match(/^\/api\/patients\/([^/]+)$/);
    if (fichePatient && methode === "PUT") { ecouteur?.patientMaj(fichePatient[1], corps(init)); return json({ success: true }); }
    if (fichePatient && methode === "DELETE") { ecouteur?.patientSuppr(fichePatient[1]); return json({ success: true }); }
    return json({ ok: true, success: true });
  };
  return () => { window.fetch = original; };
}
