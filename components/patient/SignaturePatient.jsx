"use client";

import { useRef, useState, useEffect, use } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Loader2, CheckCircle, AlertCircle, Download, FileQuestion, RefreshCw } from 'lucide-react';
import { PDFDownloadLink, pdf } from "@react-pdf/renderer";
import { InvoicePDF } from "@/components/InvoicePDF";
import { OrdonnancePDF } from "@/components/OrdonnancePDF";

export default function PatientSignaturePage({ params }) {
  const resolvedParams = use(params);
  const consultationId = resolvedParams?.consultationId || resolvedParams?.id;

  const sigCanvas = useRef(null);
  const [consultation, setConsultation] = useState(null);
  const [devisData, setDevisData] = useState(null);
  const [resolvedBranding, setResolvedBranding] = useState(null);

  // 🟢 NOUVELLE MACHINE À ÉTATS POUR GÉRER L'AFFICHAGE
  // loading | no_document | already_signed | invalid | signing | success
  const [pageState, setPageState] = useState('loading');

  const [step, setStep] = useState('devis');
  const [isSigning, setIsSigning] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingOrdo, setIsDownloadingOrdo] = useState(false);
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [sigDevis, setSigDevis] = useState(null);
  const [currentSignature, setCurrentSignature] = useState(null);
  const [ordonnanceData, setOrdonnanceData] = useState(null);

  // Cacher la navigation globale (Navbar, Footer...)
  useEffect(() => {
    const elementsToHide = document.querySelectorAll('nav, header, footer, .bottom-bar');
    elementsToHide.forEach(el => el.style.display = 'none');
    return () => elementsToHide.forEach(el => el.style.display = '');
  }, []);

  // Pré-charge les images GCS en base64 pour @react-pdf/renderer
  const resolveImages = async (branding) => {
    if (!branding) return branding;
    const fields = ['logo', 'photo', 'headerImage', 'footerImage'];
    const result = { ...branding };
    await Promise.all(
      fields.map(async (field) => {
        const url = result[field];
        if (url && url.startsWith('https://')) {
          try {
            const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(url)}`;
            const res = await fetch(proxyUrl);
            if (!res.ok) return;
            const dataUrl = await res.text();
            if (dataUrl.startsWith('data:')) result[field] = dataUrl;
          } catch {
            // En cas d'erreur réseau, on garde l'URL originale
          }
        }
      })
    );
    return result;
  };

  // Fonction de nettoyage des prix
  const sanitizeDevisData = (rawConsultation) => {
    if (!rawConsultation?.devisData) return null;
    let data;
    try {
      data = typeof rawConsultation.devisData === 'string' ? JSON.parse(rawConsultation.devisData) : rawConsultation.devisData;
    } catch (e) { return null; }

    if (!data || !Array.isArray(data.items)) data = { items: [], ...data }; 
    const branding = rawConsultation.praticien || {};

    const cleanItems = data.items.map(item => {
      let price = item.unitPrice;
      const desc = (item.description || "").toLowerCase();

      if (price === undefined || isNaN(parseFloat(price)) || String(price).includes("standard")) {
        if (desc.includes("bilan")) price = branding.prixBilan || "50";
        else if (desc.includes("semelle") || desc.includes("orthèse")) price = branding.prixSemelles || "150";
        else if (desc.includes("pédi")) price = branding.prixPedicurie || "35";
        else price = "0";
      }
      return { ...item, unitPrice: price };
    });

    const newTotalHT = cleanItems.reduce((acc, item) => acc + (parseFloat(item.unitPrice) * (parseInt(item.quantity) || 1)), 0);

    // Sanitize devisItems (semelles uniquement) si présents
    let cleanDevisItems, cleanDevisTotalAmount;
    if (data.devisItems?.length) {
      cleanDevisItems = cleanItems.filter(i =>
        i.description?.toLowerCase().includes('semelle') || i.description?.toLowerCase().includes('orthèse')
      );
      const devisTotal = cleanDevisItems.reduce((acc, i) => acc + (parseFloat(i.unitPrice) * (parseInt(i.quantity) || 1)), 0);
      cleanDevisTotalAmount = `${devisTotal.toFixed(2)} €`;
    }

    return {
      ...data,
      items: cleanItems,
      totalAmount: `${newTotalHT.toFixed(2)} €`,
      ...(cleanDevisItems && { devisItems: cleanDevisItems, devisTotalAmount: cleanDevisTotalAmount }),
    };
  };

  // 🟢 CHARGEMENT ET VÉRIFICATION INTELLIGENTE
  const loadConsultation = async () => {
    setPageState('loading');
    try {
      const res = await fetch(`/api/consultations/${consultationId}`);
      if (!res.ok) { setPageState('invalid'); return; }

      const data = await res.json();

      // Extraire ordonnanceData si présente
      const parsedOrdo = data.ordonnanceData
        ? (typeof data.ordonnanceData === 'string' ? JSON.parse(data.ordonnanceData) : data.ordonnanceData)
        : null;
      if (parsedOrdo?.items?.length) setOrdonnanceData(parsedOrdo);

      // Pédicurie : téléchargement direct sans signature
      if (data.typeConsultation === 'pedicurie') {
        // Déjà téléchargé → on le signale
        if (data.signatureFacture) {
          setPageState('already_signed');
          return;
        }
        const facture = typeof data.factureData === 'string' ? JSON.parse(data.factureData) : data.factureData;
        const resolved = await resolveImages(data.praticien || {});
        setConsultation({ ...data, praticien: resolved });
        setResolvedBranding(resolved);
        setDevisData(facture);
        setPageState('pedicurie');
        return;
      }

      const parsedDevis = typeof data.devisData === 'string' ? JSON.parse(data.devisData) : data.devisData;

      if (!parsedDevis || parsedDevis.status !== "AWAITING_SIGNATURE") {
        if (data.signatureFacture || parsedDevis?.status === "SIGNED") {
          const resolved = await resolveImages(data.praticien || {});
          const cleanData = sanitizeDevisData(data);
          setConsultation({ ...data, praticien: resolved });
          setResolvedBranding(resolved);
          setDevisData(cleanData);
          setCurrentSignature(data.signatureFacture || null);
          setPageState('already_signed');
        } else {
          setPageState('no_document');
        }
        return;
      }

      const cleanData = sanitizeDevisData(data);
      const resolved = await resolveImages(data.praticien || {});
      setConsultation({ ...data, praticien: resolved });
      setResolvedBranding(resolved);
      setDevisData(cleanData);
      setPageState('signing');

    } catch (error) {
      console.error("Erreur :", error);
      setPageState('invalid');
    }
  };

  useEffect(() => {
    if (consultationId) loadConsultation();
  }, [consultationId]);

  const clearSignature = () => sigCanvas.current?.clear();

  const handleNextStep = async () => {
    if (sigCanvas.current?.isEmpty()) {
      alert("Veuillez signer avant de valider.");
      return;
    }

    setIsSigning(true);
    const signatureBase64 = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');

    try {
      await fetch(`/api/consultations/${consultationId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: signatureBase64, type: step }),
      });

      if (step === 'devis') {
        setSigDevis(signatureBase64);
        sigCanvas.current.clear();
        setStep('facture');
      } else {
        setCurrentSignature(signatureBase64);
        setPageState('success');
      }
    } catch (error) {
      alert("Erreur lors de la sauvegarde.");
    } finally {
      setIsSigning(false);
    }
  };

  // ==========================================
  // VUES DE STATUTS (DANS LE THEME BLEU FONCÉ)
  // ==========================================

  if (pageState === 'loading') return (
    <div className="fixed inset-0 z-[999] bg-slate-50 flex flex-col items-center justify-center p-6 text-center text-[#001F3F]">
      <Loader2 size={40} className="text-[#4931F7] animate-spin mb-4" />
      <p className="font-bold animate-pulse">Chargement sécurisé...</p>
    </div>
  );

  if (pageState === 'no_document') return (
    <div className="fixed inset-0 z-[999] bg-slate-50 flex flex-col items-center justify-center p-6 text-center text-[#001F3F]">
      <div className="w-20 h-20 bg-[#4931F7]/10 text-[#4931F7] rounded-3xl flex items-center justify-center mb-6">
        <FileQuestion size={40} />
      </div>
      <h1 className="text-2xl font-black mb-2">Aucun document</h1>
      <p className="text-slate-500 mb-10 max-w-xs">
        Votre praticien prépare actuellement vos documents. Veuillez patienter un instant.
      </p>
      <button onClick={loadConsultation} className="flex items-center gap-2 px-6 py-3 bg-[#4931F7] text-white font-bold rounded-2xl hover:bg-[#3b26c6] active:scale-95 transition-all">
        <RefreshCw size={18} /> Actualiser
      </button>
    </div>
  );

  if (pageState === 'pedicurie') return (
    <div className="fixed inset-0 z-[999] bg-slate-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
      <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
        <CheckCircle size={40} />
      </div>
      <h1 className="text-2xl font-black text-[#001F3F] mb-2">Votre Facture</h1>
      <p className="text-slate-500 mb-2 max-w-xs">Soin de Pédicurie</p>
      <p className="text-2xl font-black text-[#4931F7] mb-10">{devisData?.totalAmount}</p>
      <div className="w-full max-w-xs space-y-4">
        <button
          disabled={isDownloading}
          onClick={async () => {
            setIsDownloading(true);
            try {
              await fetch(`/api/consultations/${consultationId}/sign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signature: 'DIRECT_DOWNLOAD', type: 'pedicurie' }),
              });
              const blob = await pdf(
                <InvoicePDF data={devisData} patient={consultation?.patient} signature={null} type="facture" branding={resolvedBranding || consultation?.praticien} hideSig={true} />
              ).toBlob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `Facture_Pedicurie_${consultation?.patient?.nom || 'patient'}.pdf`;
              a.target = '_blank'; a.rel = 'noopener noreferrer';
              document.body.appendChild(a); a.click(); document.body.removeChild(a);
              setTimeout(() => URL.revokeObjectURL(url), 500);
            } catch { alert("Erreur lors du téléchargement. Veuillez réessayer."); }
            finally { setIsDownloading(false); }
          }}
          className="w-full flex items-center justify-center gap-3 bg-[#4931F7] text-white py-4 rounded-2xl font-bold shadow-lg shadow-[#4931F7]/30 active:scale-95 transition-all disabled:opacity-60"
        >
          {isDownloading ? <Loader2 className="animate-spin" size={20} /> : <><Download size={20} /> Télécharger ma Facture</>}
        </button>
        {ordonnanceData?.items?.length > 0 && (
          <button
            disabled={isDownloadingOrdo}
            onClick={async () => {
              setIsDownloadingOrdo(true);
              try {
                const blob = await pdf(
                  <OrdonnancePDF data={ordonnanceData} patient={consultation?.patient} branding={resolvedBranding || consultation?.praticien} />
                ).toBlob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = `Ordonnance_${consultation?.patient?.nom || 'patient'}.pdf`;
                a.target = '_blank'; a.rel = 'noopener noreferrer';
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 500);
              } catch { alert("Erreur lors du téléchargement. Veuillez réessayer."); }
              finally { setIsDownloadingOrdo(false); }
            }}
            className="w-full flex items-center justify-center gap-3 bg-[#4ECDC4] text-white py-4 rounded-2xl font-bold shadow-lg shadow-[#4ECDC4]/30 active:scale-95 transition-all disabled:opacity-60"
          >
            {isDownloadingOrdo ? <Loader2 className="animate-spin" size={20} /> : <><Download size={20} /> Télécharger mon Ordonnance</>}
          </button>
        )}
        <p className="text-xs text-slate-400 pt-2">Vous pouvez fermer cette page après le téléchargement.</p>
      </div>
    </div>
  );

  if (pageState === 'already_signed') return (
    <div className="fixed inset-0 z-[999] bg-slate-50 flex flex-col items-center justify-center p-6 text-center text-[#001F3F]">
      <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
        <CheckCircle size={40} />
      </div>
      <h1 className="text-2xl font-black mb-2">Documents Signés</h1>
      {(devisData || ordonnanceData) ? (
        <div className="w-full max-w-xs space-y-3 mt-6">
          {devisData && (
            <PDFDownloadLink
              document={<InvoicePDF data={devisData} patient={consultation?.patient} signature={currentSignature} type="facture" branding={resolvedBranding || consultation?.praticien} />}
              fileName={`Facture_${consultation?.patient?.nom || 'patient'}.pdf`}
              className="w-full flex items-center justify-center gap-3 bg-[#4931F7] text-white py-4 rounded-2xl font-bold shadow-lg shadow-[#4931F7]/30 active:scale-95 transition-all"
            >
              {({ loading }) => loading ? <Loader2 className="animate-spin" size={20} /> : <><Download size={20} /> Télécharger ma Facture</>}
            </PDFDownloadLink>
          )}
          {ordonnanceData?.items?.length > 0 && (
            <button
              disabled={isDownloadingOrdo}
              onClick={async () => {
                setIsDownloadingOrdo(true);
                try {
                  const blob = await pdf(
                    <OrdonnancePDF data={ordonnanceData} patient={consultation?.patient} branding={resolvedBranding || consultation?.praticien} />
                  ).toBlob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = `Ordonnance_${consultation?.patient?.nom || 'patient'}.pdf`;
                  a.target = '_blank'; a.rel = 'noopener noreferrer';
                  document.body.appendChild(a); a.click(); document.body.removeChild(a);
                  setTimeout(() => URL.revokeObjectURL(url), 500);
                } catch { alert("Erreur lors du téléchargement."); }
                finally { setIsDownloadingOrdo(false); }
              }}
              className="w-full flex items-center justify-center gap-3 bg-[#4ECDC4] text-white py-4 rounded-2xl font-bold shadow-lg shadow-[#4ECDC4]/30 active:scale-95 transition-all disabled:opacity-60"
            >
              {isDownloadingOrdo ? <Loader2 className="animate-spin" size={20} /> : <><Download size={20} /> Télécharger mon Ordonnance</>}
            </button>
          )}
        </div>
      ) : (
        <p className="text-slate-500 max-w-xs mt-2">
          Vous avez déjà signé et validé vos documents. Vous pouvez fermer cette page.
        </p>
      )}
    </div>
  );

  if (pageState === 'invalid') return (
    <div className="fixed inset-0 z-[999] bg-slate-50 flex flex-col items-center justify-center p-6 text-center text-[#001F3F]">
      <div className="w-16 h-16 bg-red-100 text-red-500 rounded-3xl flex items-center justify-center mb-6">
        <AlertCircle size={32} />
      </div>
      <h1 className="text-2xl font-black mb-2">Lien expiré ou invalide</h1>
      <p className="text-slate-500 mb-8 max-w-xs">
        Cette session de signature est introuvable ou a expiré.
      </p>
      <button onClick={loadConsultation} className="text-sm font-bold text-[#4931F7] underline underline-offset-4">
        Réessayer
      </button>
    </div>
  );

  if (pageState === 'success') return (
    <div className="fixed inset-0 z-[999] bg-slate-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
      <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
        <CheckCircle size={40} />
      </div>
      <h1 className="text-2xl font-black text-[#001F3F] mb-2">Terminé !</h1>
      <p className="text-slate-600 mb-10">Votre facture acquittée a été validée avec succès.</p>
      
      <div className="w-full max-w-xs space-y-4">
        {/* Facture */}
        <button
          disabled={isDownloading}
          onClick={async () => {
            setIsDownloading(true);
            try {
              const branding = devisData?.nomenclatureSelected
                ? { ...(resolvedBranding || consultation?.praticien), nomenclature: devisData.nomenclatureSelected }
                : (resolvedBranding || consultation?.praticien);
              const blob = await pdf(
                <InvoicePDF data={devisData} patient={consultation?.patient} signature={currentSignature} type="facture" branding={branding} />
              ).toBlob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = `Facture_${consultation?.patient?.nom || 'patient'}.pdf`;
              a.target = '_blank'; a.rel = 'noopener noreferrer';
              document.body.appendChild(a); a.click(); document.body.removeChild(a);
              setTimeout(() => URL.revokeObjectURL(url), 500);
            } catch { alert("Erreur lors du téléchargement."); }
            finally { setIsDownloading(false); }
          }}
          className="w-full flex items-center justify-center gap-3 bg-[#4931F7] text-white py-4 rounded-2xl font-bold shadow-lg shadow-[#4931F7]/30 active:scale-95 transition-all disabled:opacity-60"
        >
          {isDownloading ? <Loader2 className="animate-spin" size={20} /> : <><Download size={20} /> Télécharger ma Facture</>}
        </button>

        {/* Ordonnance */}
        {ordonnanceData?.items?.length > 0 && (
          <>
            <button
              disabled={isDownloadingOrdo}
              onClick={async () => {
                setIsDownloadingOrdo(true);
                try {
                  const blob = await pdf(
                    <OrdonnancePDF data={ordonnanceData} patient={consultation?.patient} branding={resolvedBranding || consultation?.praticien} />
                  ).toBlob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = `Ordonnance_${consultation?.patient?.nom || 'patient'}.pdf`;
                  a.target = '_blank'; a.rel = 'noopener noreferrer';
                  document.body.appendChild(a); a.click(); document.body.removeChild(a);
                  setTimeout(() => URL.revokeObjectURL(url), 500);
                } catch { alert("Erreur lors du téléchargement."); }
                finally { setIsDownloadingOrdo(false); }
              }}
              className="w-full flex items-center justify-center gap-3 bg-[#4ECDC4] text-white py-4 rounded-2xl font-bold shadow-lg shadow-[#4ECDC4]/30 active:scale-95 transition-all disabled:opacity-60"
            >
              {isDownloadingOrdo ? <Loader2 className="animate-spin" size={20} /> : <><Download size={20} /> Télécharger mon Ordonnance</>}
            </button>

            {/* Tout télécharger */}
            <button
              disabled={isDownloadingAll}
              onClick={async () => {
                setIsDownloadingAll(true);
                try {
                  const branding = devisData?.nomenclatureSelected
                    ? { ...(resolvedBranding || consultation?.praticien), nomenclature: devisData.nomenclatureSelected }
                    : (resolvedBranding || consultation?.praticien);
                  const triggerDownload = (blob, name) => new Promise(resolve => {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = name; a.target = '_blank'; a.rel = 'noopener noreferrer';
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    setTimeout(() => { URL.revokeObjectURL(url); resolve(); }, 800);
                  });
                  const [blobF, blobO] = await Promise.all([
                    pdf(<InvoicePDF data={devisData} patient={consultation?.patient} signature={currentSignature} type="facture" branding={branding} />).toBlob(),
                    pdf(<OrdonnancePDF data={ordonnanceData} patient={consultation?.patient} branding={resolvedBranding || consultation?.praticien} />).toBlob(),
                  ]);
                  await triggerDownload(blobF, `Facture_${consultation?.patient?.nom || 'patient'}.pdf`);
                  await triggerDownload(blobO, `Ordonnance_${consultation?.patient?.nom || 'patient'}.pdf`);
                } catch { alert("Erreur lors du téléchargement."); }
                finally { setIsDownloadingAll(false); }
              }}
              className="w-full flex items-center justify-center gap-3 bg-slate-200 text-slate-600 py-4 rounded-2xl font-bold active:scale-95 transition-all disabled:opacity-60"
            >
              {isDownloadingAll ? <Loader2 className="animate-spin" size={20} /> : <><Download size={20} /> Tout télécharger</>}
            </button>
          </>
        )}

        <p className="text-xs text-slate-400 pt-2">Vous pouvez maintenant fermer cette page.</p>
      </div>
    </div>
  );

  // ==========================================
  // VUE DE SIGNATURE (pageState === 'signing')
  // ==========================================

  return (
    <div className="fixed inset-0 z-[999] bg-slate-50 overflow-y-auto flex flex-col p-4 sm:p-6">
      <div className="w-full max-w-md mx-auto flex flex-col min-h-full pb-8">
        
        {/* Indicateur de progression — toujours visible (devis → facture) */}
        <div className="flex items-center gap-3 mb-4 px-1">
          <div className={`flex items-center gap-2 text-sm font-bold ${step === 'devis' ? 'text-[#4931F7]' : 'text-green-500'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${step === 'devis' ? 'bg-[#4931F7] text-white' : 'bg-green-500 text-white'}`}>
              {step === 'devis' ? '1' : <CheckCircle size={14} />}
            </div>
            {devisData?.devisItems?.length ? 'Devis semelles' : 'Devis'}
          </div>
          <div className="flex-1 h-0.5 bg-slate-200 rounded" />
          <div className={`flex items-center gap-2 text-sm font-bold ${step === 'facture' ? 'text-[#4931F7]' : 'text-slate-300'}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${step === 'facture' ? 'bg-[#4931F7] text-white' : 'bg-slate-200 text-slate-400'}`}>
              2
            </div>
            Facture
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200/60 mb-6 shrink-0">
          <h1 className="text-3xl font-black text-[#001F3F] mb-1 tracking-tight">
            {step === 'devis' ? (devisData?.devisItems?.length ? 'Devis semelles' : 'Devis') : 'Facture Acquittée'}
          </h1>
          <p className="text-xs text-slate-400 font-medium mb-5">
            {step === 'devis' ? 'Signez pour accepter le devis ci-dessous.' : 'Signez pour valider votre facture acquittée.'}
          </p>

          <div className="space-y-2">
            {devisData?.items?.map((item, index) => (
              <div key={index} className="flex justify-between items-center text-base py-3 border-b border-slate-100 last:border-0">
                <span className="text-slate-600 font-medium pr-4">{item.quantity}x {item.description}</span>
                <span className="font-bold text-[#001F3F] whitespace-nowrap">{parseFloat(item.unitPrice).toFixed(2)} €</span>
              </div>
            ))}
            <div className="mt-6 pt-4 flex justify-between items-center border-t-2 border-slate-100">
              <span className="font-black text-lg text-slate-400">TOTAL HT</span>
              <span className="font-black text-2xl text-[#4931F7]">{devisData?.totalAmount}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-[2rem] shadow-sm border border-slate-200/60 flex flex-col shrink-0">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Signer ici</h2>
          <p className="text-xs text-slate-400 mb-4">
            {step === 'devis' ? (devisData?.devisItems?.length ? 'Signature du devis semelles — étape 1/2.' : 'Signature du devis — étape 1/2.') : 'Signature de la facture — étape 2/2.'}
          </p>

          <div className="w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 relative overflow-hidden mb-6">
            <SignatureCanvas
              ref={sigCanvas}
              penColor="#001F3F"
              canvasProps={{ className: 'w-full h-full absolute top-0 left-0 touch-none' }}
            />
          </div>

          <div className="flex gap-3 mt-auto">
            <button onClick={clearSignature} className="w-1/3 py-4 rounded-xl border-2 border-slate-100 text-slate-500 font-bold hover:bg-slate-50 active:scale-95 transition-all">Effacer</button>
            <button
              onClick={handleNextStep}
              disabled={isSigning}
              className="w-2/3 py-4 rounded-xl bg-[#4931F7] text-white font-bold shadow-lg shadow-[#4931F7]/30 hover:bg-[#3b26c6] active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {isSigning ? <Loader2 className="animate-spin" /> : step === 'devis' ? <>{devisData?.devisItems?.length ? 'Signer le devis semelles' : 'Signer le devis'} →</> : <>Finaliser <CheckCircle size={18} /></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}