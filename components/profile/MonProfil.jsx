"use client";
import React, { useState, useRef, useEffect } from "react";
import { Mail, Lock, Save, Printer, Loader2, Trash2, UploadCloud, Scissors, CheckCircle, Crop, Eye, X, AlertTriangle, Camera, Power, CreditCard, ExternalLink, CalendarDays, Sparkles, AlertCircle, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

// Import de la librairie de Drag & Drop et du Worker PDF
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import * as pdfjsLib from "pdfjs-dist/build/pdf";

// --- ABONNEMENT PRO (avec Stripe) ---
function AbonnementPro({ subscription, onPortal, portalLoading }) {
  const periodEnd = subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd * 1000).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const statusMap = {
    active: { label: "Actif", color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400" },
    past_due: { label: "Paiement en retard", color: "text-orange-600 bg-orange-50 dark:bg-orange-500/10 dark:text-orange-400" },
    canceled: { label: "Résilié", color: "text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400" },
    trialing: { label: "Période d'essai", color: "text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400" },
  };
  const statusInfo = statusMap[subscription.status] || { label: subscription.status, color: "text-slate-500 bg-slate-100" };

  return (
    <div className="bg-slate-50 dark:bg-[#0b1121] rounded-2xl border border-slate-200/60 dark:border-white/5 overflow-hidden">
      <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#4931F7]/10 flex items-center justify-center shrink-0">
            <CreditCard size={18} className="text-[#4931F7]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-black text-[#001F3F] dark:text-white">Kemer Pro</p>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
              {subscription.cancelAtPeriodEnd && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-orange-600 bg-orange-50 dark:bg-orange-500/10 dark:text-orange-400">
                  Résiliation programmée
                </span>
              )}
            </div>
            {periodEnd && (
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                <CalendarDays size={11} />
                {subscription.cancelAtPeriodEnd
                  ? `Accès jusqu'au ${periodEnd}`
                  : `Prochain renouvellement le ${periodEnd}`
                }
              </p>
            )}
          </div>
        </div>

        <button
          onClick={onPortal}
          disabled={portalLoading}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#4931F7] text-white text-sm font-black rounded-xl hover:bg-[#3b26c6] transition-all shrink-0 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
        >
          {portalLoading ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
          Gérer l'abonnement
        </button>
      </div>

      {subscription.status === "past_due" && (
        <div className="px-5 pb-4 flex items-start gap-2 text-orange-600 dark:text-orange-400">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <p className="text-xs font-medium">Votre dernier paiement a échoué. Mettez à jour votre moyen de paiement pour conserver votre accès.</p>
        </div>
      )}
    </div>
  );
}

// --- ABONNEMENT PRO (sans ID Stripe enregistré) ---
function AbonnementProSansStripe({ onPortal, portalLoading }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-slate-50 dark:bg-[#0b1121] rounded-2xl border border-slate-200/60 dark:border-white/5">
      <div className="flex items-center gap-4 flex-1">
        <div className="w-10 h-10 rounded-xl bg-[#4931F7]/10 flex items-center justify-center shrink-0">
          <CreditCard size={18} className="text-[#4931F7]" />
        </div>
        <div>
          <p className="text-sm font-black text-[#001F3F] dark:text-white">Kemer Pro</p>
          <p className="text-xs text-slate-400 mt-0.5">Abonnement actif</p>
        </div>
      </div>
      <button
        onClick={onPortal}
        disabled={portalLoading}
        className="flex items-center gap-2 px-5 py-2.5 bg-[#4931F7] text-white text-sm font-black rounded-xl hover:bg-[#3b26c6] transition-all shrink-0 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
      >
        {portalLoading ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
        Gérer l'abonnement
      </button>
    </div>
  );
}

// --- ABONNEMENT BÊTA ---
function AbonnementBeta() {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 bg-slate-50 dark:bg-[#0b1121] rounded-2xl border border-slate-200/60 dark:border-white/5">
      <div className="w-10 h-10 rounded-xl bg-[#4ECDC4]/10 flex items-center justify-center shrink-0">
        <Sparkles size={18} className="text-[#4ECDC4]" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-black text-[#001F3F] dark:text-white">Programme Bêta</p>
        <p className="text-xs text-slate-400 mt-0.5">Accès bêta gratuit — merci pour votre participation !</p>
      </div>
      <a
        href="https://kemer.ai/tarifs"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-5 py-2.5 bg-[#001F3F] !text-white text-sm font-black rounded-xl hover:bg-[#001F3F]/80 transition-all shrink-0 active:scale-95"
      >
        Passer à Pro <ExternalLink size={13} />
      </a>
    </div>
  );
}

// --- COMPOSANT INPUT CLASSIQUE ---
function SettingsInput({ label, value, onChange, placeholder, type = "text", icon, name }) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">{label}</label>
      <div className="relative">
        {icon && <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>}
        <input name={name} type={type} value={value} onChange={onChange} placeholder={placeholder} className={`w-full bg-slate-50 dark:bg-[#0b1121] border border-slate-200/60 dark:border-white/5 rounded-xl p-4 text-sm font-bold text-[#001F3F] dark:text-white placeholder:text-slate-400 focus:border-[#4931F7] outline-none transition-all ${icon ? 'pl-11' : 'pl-4'}`} />
      </div>
    </div>
  );
}

// --- PAGE PRINCIPALE ---
export default function MonProfil({ user, qrUrl }) {  
  const router = useRouter();

  useEffect(() => {
    // Route API dédiée pour garantir Content-Type: text/javascript (requis par Safari pour les module workers)
    pdfjsLib.GlobalWorkerOptions.workerSrc = "/api/pdf-worker";
  }, []);

  const [formData, setFormData] = useState({
    prenom: user?.prenom || "",
    nom: user?.nom || "",
    email: user?.email || "",
    photo: user?.photo || "",
    headerImage: user?.headerImage || "",
    footerImage: user?.footerImage || "",
  });

  // Valeurs sauvegardées en DB — référence pour détecter les changements non enregistrés
  // (déclaré ici, avant l'effet de résolution d'images ci-dessous, qui le référence)
  const [savedDocs, setSavedDocs] = useState({
    headerImage: user?.headerImage || "",
    footerImage: user?.footerImage || "",
  });

  // Le bucket GCS est privé — résout les URL publiques stockées en base vers
  // des data: URL affichables, via le proxy (lecture par le service account).
  // Met aussi à jour savedDocs (déclaré plus bas) pour header/footer afin que
  // la détection de changements non sauvegardés ne se déclenche pas à tort.
  useEffect(() => {
    ["photo", "headerImage", "footerImage"].forEach(async (field) => {
      const url = user?.[field];
      if (!url || !url.startsWith("https://")) return;
      try {
        const res = await fetch(`/api/image-proxy?url=${encodeURIComponent(url)}`);
        if (!res.ok) return;
        const dataUrl = await res.text();
        if (!dataUrl.startsWith("data:")) return;
        setFormData(prev => ({ ...prev, [field]: dataUrl }));
        if (field === "headerImage" || field === "footerImage") {
          setSavedDocs(prev => ({ ...prev, [field]: dataUrl }));
        }
      } catch { /* garde l'URL originale */ }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const [subscription, setSubscription] = useState(null);
  const [subLoading, setSubLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    fetch("/api/stripe/subscription")
      .then(r => r.json())
      .then(data => setSubscription(data))
      .catch(() => {})
      .finally(() => setSubLoading(false));
  }, []);

  const handleOpenPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert(data.error || "Erreur lors de l'ouverture du portail. Réessayez.");
    } catch {
      alert("Erreur lors de l'ouverture du portail. Réessayez.");
    } finally {
      setPortalLoading(false);
    }
  };

  // ── Electron : démarrage au login ─────────────────────────────────────────
  const [isElectron, setIsElectron] = useState(false);
  const [openAtLogin, setOpenAtLogin] = useState(false);

  useEffect(() => {
    if (!window.electronAPI?.loginItem) return;
    setIsElectron(true);
    window.electronAPI.loginItem.getSettings().then((s) => {
      setOpenAtLogin(s?.openAtLogin ?? false);
    });
  }, []);

  const handleToggleOpenAtLogin = async (val) => {
    setOpenAtLogin(val);
    await window.electronAPI?.loginItem?.setOpenAtLogin(val);
  };

  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [rawDocumentImage, setRawDocumentImage] = useState(null);

  // ETATS DU CROPPER & PREVIEW
  const [editState, setEditState] = useState({ isOpen: false, type: null });
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const imgRef = useRef(null);

  const hasUnsavedDocChanges =
    formData.headerImage !== savedDocs.headerImage ||
    formData.footerImage !== savedDocs.footerImage;

  // Bloquer la navigation navigateur si changements non sauvegardés
  useEffect(() => {
    const handler = (e) => {
      if (hasUnsavedDocChanges) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedDocChanges]);

  const sendErrorLog = async (context, error) => {
    try {
      await fetch("/api/log-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context,
          error: error?.message || String(error),
          userId: user?.id,
          userEmail: user?.email,
        }),
      });
    } catch (_) {}
  };

  const handlePasswordChange = (e) => setPasswords(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleInputChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 256;
        const canvas = document.createElement("canvas");
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext("2d");
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        setFormData(prev => ({ ...prev, photo: cleanDataUrl(canvas.toDataURL("image/jpeg", 0.85)) }));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = null;
  };

  // ✂️ IMPORT & DÉCOUPE AUTO PAR IA
  const processMagicCrop = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsScanning(true);

    try {
      let imageBase64 = "";

      if (file.type === "application/pdf") {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1); 
        const viewport = page.getViewport({ scale: 1.5 });
        const canvasPdf = document.createElement("canvas");
        canvasPdf.width = viewport.width;
        canvasPdf.height = viewport.height;
        const ctxPdf = canvasPdf.getContext("2d");
        await page.render({ canvasContext: ctxPdf, viewport }).promise;
        imageBase64 = canvasPdf.toDataURL("image/jpeg", 0.8);
      } else {
        imageBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
      }

      setRawDocumentImage(imageBase64);

      const res = await fetch("/api/extract-branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: imageBase64 })
      });
      
      let headerRatio = 0.15, footerRatio = 0.10;
      if (res.ok) {
        const data = await res.json();
        headerRatio = Math.min(Math.max(data.headerRatio || 0.15, 0.05), 0.35);
        footerRatio = Math.min(Math.max(data.footerRatio || 0.10, 0.05), 0.25);
      }

      const img = new Image();
      img.src = imageBase64;
      img.onload = () => {
        const canvasHeader = document.createElement("canvas");
        canvasHeader.width = img.width; canvasHeader.height = img.height * headerRatio;
        const ctxH = canvasHeader.getContext("2d");
        ctxH.drawImage(img, 0, 0, img.width, canvasHeader.height, 0, 0, canvasHeader.width, canvasHeader.height);
        
        const canvasFooter = document.createElement("canvas");
        canvasFooter.width = img.width; canvasFooter.height = img.height * footerRatio;
        const ctxF = canvasFooter.getContext("2d");
        ctxF.drawImage(img, 0, img.height - canvasFooter.height, img.width, canvasFooter.height, 0, 0, canvasFooter.width, canvasFooter.height);

        setFormData(prev => ({
          ...prev,
          headerImage: cleanDataUrl(canvasHeader.toDataURL("image/png")),
          footerImage: cleanDataUrl(canvasFooter.toDataURL("image/png"))
        }));

        setIsScanning(false);
        setScanSuccess(true);
        setTimeout(() => setScanSuccess(false), 3000);
      };

    } catch (err) {
      sendErrorLog("Import facture type — MonProfil (processMagicCrop)", err);
      alert("Erreur lors de l'analyse du document.");
      setIsScanning(false);
    }
  };

  // 🟢 OUVRIR L'OUTIL DE RECADRAGE DRAG & DROP
  const openEditor = (type) => {
    if (!rawDocumentImage) return;
    setEditState({ isOpen: true, type });
    if (type === 'header') {
      setCrop({ unit: '%', x: 0, y: 0, width: 100, height: 15 });
    } else {
      setCrop({ unit: '%', x: 0, y: 85, width: 100, height: 15 });
    }
  };

  // 🟢 APPLIQUER LA NOUVELLE DÉCOUPE
  const applyManualCrop = () => {
    if (!completedCrop || !imgRef.current) return;

    const image = imgRef.current;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const canvas = document.createElement("canvas");
    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;
    const ctx = canvas.getContext("2d");

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const base64Crop = cleanDataUrl(canvas.toDataURL("image/png"));

    if (editState.type === 'header') {
      setFormData(p => ({ ...p, headerImage: base64Crop }));
    } else {
      setFormData(p => ({ ...p, footerImage: base64Crop }));
    }
    
    setEditState({ isOpen: false, type: null });
  };

  // Supprime les caractères de contrôle non imprimables d'une chaîne (évite les erreurs JSON)
  const sanitizeStr = (v) => (typeof v === 'string' ? v.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') : v);
  const sanitizeFormData = (fd) => Object.fromEntries(Object.entries(fd).map(([k, v]) => [k, sanitizeStr(v)]));

  // Safari bug : canvas.toDataURL() peut insérer des \n tous les ~76 chars dans le base64.
  // On les supprime du segment base64 uniquement, pour éviter l'erreur JSON côté serveur.
  const cleanDataUrl = (dataUrl) => {
    if (typeof dataUrl !== 'string' || !dataUrl.includes(',')) return dataUrl;
    const [header, b64] = dataUrl.split(',');
    return header + ',' + b64.replace(/[\r\n\s]/g, '');
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true); setMessage({ type: "", text: "" });
    try {
      const cleanData = sanitizeFormData(formData);
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ praticienId: user.id, ...cleanData, ...(passwords.newPassword && { newPassword: sanitizeStr(passwords.newPassword) }) })
      });
      if (!res.ok) throw new Error("Échec");
      setMessage({ type: "success", text: "Profil mis à jour avec succès !" });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setSavedDocs({ headerImage: formData.headerImage, footerImage: formData.footerImage });
      router.refresh();
    } catch (error) {
      setMessage({ type: "error", text: "Erreur d'enregistrement." });
    } finally {
      setIsSaving(false); setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    }
  };

  const handlePrintQR = () => {
    const iframe = document.createElement("iframe");

    iframe.style.position = "absolute";
    iframe.style.top = "-10000px";
    iframe.style.left = "-10000px";
    iframe.style.width = "1000px";
    iframe.style.height = "1000px";

    document.body.appendChild(iframe);

    const html = `
      <html>
        <head>
          <title>Chevalet - ${formData.prenom} ${formData.nom}</title>

          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800;900&display=swap" rel="stylesheet">

          <style>
            @page { size: A4 portrait; margin: 0; }

            body {
              font-family: 'Montserrat', sans-serif !important;
              display: flex;
              justify-content: flex-start;
              align-items: flex-start;
              padding: 10mm;
              height: auto;
              margin: 0;
              background: white;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .card {
              width: 90mm;
              height: 130mm;
              border: 2px dashed #cbd5e1;
              border-radius: 24px;
              padding: 20px;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: space-between;
              text-align: center;
            }

            .header h1 {
              color: #001F3F;
              font-size: 18px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: -0.5px;
              margin: 0;
            }

            .user-role {
              color: #4931F7;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 2px;
              margin: 6px 0 15px 0;
            }

            .qr-section {
              flex: 1;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              width: 100%;
              gap: 10px;
            }

            img {
              width: 50mm;
              height: 50mm;
              display: block;
            }

            .scan-callout {
              color: #4931F7;
              font-size: 18px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 2px;
              margin: 0;
            }

            .footer {
              background-color: #f8fafc;
              border-radius: 16px;
              padding: 14px;
              width: 100%;
              box-sizing: border-box;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 8px;
            }

            .icon-phone {
              background-color: #001F3F;
              color: white;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .icon-phone svg {
              width: 16px;
              height: 16px;
            }

            p.instruction {
              color: #001F3F;
              font-size: 10px;
              font-weight: 600;
              margin: 0;
              line-height: 1.4;
              max-width: 200px;
            }
          </style>
        </head>
        <body>
          <div class="card">

            <div class="header">
              <h1>${formData.prenom} ${formData.nom}</h1>
              <p class="user-role">${user?.role || "Podologue"}</p>
            </div>

            <div class="qr-section">
              <img src="${qrUrl}" />
              <p class="scan-callout">Scannez-moi</p>
            </div>

            <div class="footer">
              <div class="icon-phone">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                  <path d="M12 18h.01"></path>
                </svg>
              </div>
              <p class="instruction">Ouvrez l'appareil photo de votre smartphone pour obtenir vos documents.</p>
            </div>

          </div>

          <script>
            window.onload = function() {
              document.fonts.ready.then(function() {
                setTimeout(function() {
                  window.print();
                }, 400);
              });
            };
          </script>
        </body>
      </html>
    `;

    iframe.contentWindow.document.open();
    iframe.contentWindow.document.write(html);
    iframe.contentWindow.document.close();

    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 8000);
  };

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-10 relative">
      
      <style dangerouslySetInnerHTML={{__html: `
        .ReactCrop { display: block !important; max-width: 100% !important; }
        .ReactCrop__crop-selection { border: 2px dashed #4931F7 !important; background-color: rgba(73, 49, 247, 0.1) !important; }
        .ReactCrop img { max-height: none !important; width: 100% !important; }
        .ReactCrop__drag-handle::after { background-color: #4931F7 !important; border-radius: 50% !important; width: 14px !important; height: 14px !important; border: 2px solid white !important; }
      `}} />

      {/* BLOC : QR CODE & PROFIL */}
      <div className="flex flex-col md:flex-row gap-8 items-start md:items-center bg-transparent sm:bg-gray-50 dark:sm:bg-[#0b1121]/50 p-0 sm:p-6 sm:rounded-[2rem] sm:border border-gray-100 dark:border-white/5">

        {/* Avatar */}
        <div className="relative shrink-0 self-center md:self-auto">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-[#151e32] shadow-xl bg-gradient-to-br from-[#4931F7] to-[#4ECDC4] flex items-center justify-center">
            {formData.photo ? (
              <img src={formData.photo} alt="Photo de profil" className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-black text-white select-none">
                {(formData.prenom?.[0] || "").toUpperCase()}{(formData.nom?.[0] || "").toUpperCase()}
              </span>
            )}
          </div>
          <label className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#4931F7] text-white flex items-center justify-center cursor-pointer shadow-lg hover:bg-[#3b26c6] transition-colors" title="Changer la photo">
            <Camera size={14} />
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </label>
          {formData.photo && (
            <button
              onClick={() => setFormData(p => ({ ...p, photo: "" }))}
              className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md hover:bg-red-600 transition-colors"
              title="Supprimer la photo"
            >
              <X size={10} />
            </button>
          )}
        </div>

        <div className="flex-1 w-full">
          <h2 className="text-2xl font-black text-[#001F3F] dark:text-white leading-none mb-2">{formData.prenom} {formData.nom}</h2>
          <p className="text-[11px] text-[#4931F7] font-black tracking-widest uppercase mb-4">{user?.role || "Praticien"}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">Ce QR Code permet à vos patients de télécharger leurs documents instantanément de manière sécurisée.</p>
          <button onClick={handlePrintQR} className="mt-6 flex items-center justify-center gap-3 w-full sm:w-auto bg-[#001F3F] text-white px-6 py-3.5 rounded-xl font-bold text-sm hover:bg-[#001F3F]/80 transition-all shadow-none sm:shadow-lg shadow-[#001F3F]/20 active:scale-95"><Printer size={18} /> Imprimer le chevalet</button>
        </div>

        <div className="w-full sm:w-40 h-auto sm:h-40 bg-gray-50 sm:bg-white rounded-3xl p-6 sm:p-3 sm:shadow-md sm:border border-gray-200 dark:border-transparent shrink-0 flex items-center justify-center self-center md:self-auto">
          <img src={qrUrl} alt="QR Code" className="w-48 sm:w-full h-48 sm:h-full object-contain rounded-xl mix-blend-multiply dark:mix-blend-normal" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 pt-4">
        <SettingsInput name="prenom" label="Prénom" value={formData.prenom} onChange={handleInputChange} />
        <SettingsInput name="nom" label="Nom" value={formData.nom} onChange={handleInputChange} />
        <SettingsInput name="email" label="Email Professionnel" value={formData.email} onChange={handleInputChange} icon={<Mail size={16} />} />
      </div>

      {/* PARAMÈTRES ELECTRON */}
      {isElectron && (
        <div className="pt-8 border-t border-gray-100 dark:border-white/5 mt-8">
          <h3 className="text-lg font-black text-[#001F3F] dark:text-white mb-6 uppercase tracking-tight">Application de bureau</h3>
          <div className="flex items-center justify-between p-5 bg-slate-50 dark:bg-[#0b1121] rounded-2xl border border-slate-200/60 dark:border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#4931F7]/10 flex items-center justify-center shrink-0">
                <Power size={18} className="text-[#4931F7]" />
              </div>
              <div>
                <p className="text-sm font-black text-[#001F3F] dark:text-white">Lancer Kemer au démarrage</p>
                <p className="text-xs text-slate-400 mt-0.5">Kemer démarre automatiquement à l'ouverture de session</p>
              </div>
            </div>
            <button
              onClick={() => handleToggleOpenAtLogin(!openAtLogin)}
              className={`relative w-12 h-6 rounded-full transition-colors duration-200 shrink-0 ${openAtLogin ? 'bg-[#4931F7]' : 'bg-slate-200 dark:bg-white/10'}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${openAtLogin ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </div>
      )}

      {/* MON ABONNEMENT */}
      <div className="pt-8 border-t border-gray-100 dark:border-white/5 mt-8">
        <h3 className="text-lg font-black text-[#001F3F] dark:text-white mb-6 uppercase tracking-tight">Mon Abonnement</h3>

        {subLoading ? (
          <div className="flex items-center gap-3 p-5 bg-slate-50 dark:bg-[#0b1121] rounded-2xl border border-slate-200/60 dark:border-white/5">
            <Loader2 size={18} className="animate-spin text-[#4931F7]" />
            <span className="text-sm text-slate-400 font-medium">Chargement de l'abonnement...</span>
          </div>
        ) : (subscription?.abonnement === "pro" || subscription?.abonnement === "kemer") && subscription?.subscription ? (
          <AbonnementPro subscription={subscription.subscription} onPortal={handleOpenPortal} portalLoading={portalLoading} />
        ) : subscription?.abonnement === "pro" || subscription?.abonnement === "kemer" ? (
          <AbonnementProSansStripe onPortal={handleOpenPortal} portalLoading={portalLoading} />
        ) : (
          <AbonnementBeta />
        )}
      </div>

      {/* SÉCURITÉ */}
      <div className="pt-8 border-t border-gray-100 dark:border-white/5 mt-8">
        <h3 className="text-lg font-black text-[#001F3F] dark:text-white mb-6 uppercase tracking-tight">Sécurité du compte</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SettingsInput name="currentPassword" label="Mot de passe actuel" type="password" placeholder="••••••••" value={passwords.currentPassword} onChange={handlePasswordChange} icon={<Lock size={16} />} />
          <SettingsInput name="newPassword" label="Nouveau mot de passe" type="password" placeholder="••••••••" value={passwords.newPassword} onChange={handlePasswordChange} icon={<Lock size={16} />} />
          <SettingsInput name="confirmPassword" label="Confirmer mot de passe" type="password" placeholder="••••••••" value={passwords.confirmPassword} onChange={handlePasswordChange} icon={<Lock size={16} />} />
        </div>
      </div>

      {/* ZONE DE DANGER */}
      <div className="pt-8 border-t border-gray-100 dark:border-white/5 mt-8">
        <h3 className="text-lg font-black text-[#001F3F] dark:text-white mb-6 uppercase tracking-tight">Zone de danger</h3>
        <div className="flex items-center justify-between gap-4 p-5 bg-red-50/60 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center shrink-0">
              <ShieldAlert size={18} className="text-red-500" />
            </div>
            <div>
              <p className="text-sm font-black text-[#001F3F] dark:text-white">Clôturer mon compte</p>
              <p className="text-xs text-slate-400 mt-0.5">Exportez vos données puis désactivez votre accès à Kemer</p>
            </div>
          </div>
          <button
            onClick={() => router.push("/profile/cloture-compte")}
            className="px-4 py-2.5 rounded-xl border-2 border-red-500 text-red-500 text-xs font-black hover:bg-red-100 dark:hover:bg-red-500/10 transition-colors shrink-0"
          >
            Gérer
          </button>
        </div>
      </div>

      {/* DESIGN DE VOS DOCUMENTS */}
      <div className="pt-8 border-t border-gray-100 dark:border-white/5 mt-8">
        <h3 className="text-lg font-black text-[#001F3F] dark:text-white mb-6 uppercase tracking-tight">Design de vos documents</h3>

        {hasUnsavedDocChanges && (
          <div className="flex items-start gap-3 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 rounded-xl px-4 py-3 mb-5">
            <AlertTriangle size={16} className="text-orange-500 shrink-0 mt-0.5" />
            <p className="text-sm font-bold text-orange-700 dark:text-orange-400">
              En-tête ou pied de page modifié — pensez à cliquer sur <span className="underline">Enregistrer</span> pour ne pas perdre vos changements.
            </p>
          </div>
        )}

        <div className="bg-gradient-to-r from-[#4931F7]/5 to-[#4ECDC4]/5 border-2 border-dashed border-[#4931F7]/30 rounded-[2rem] p-8 text-center relative overflow-hidden group hover:border-[#4931F7] transition-colors mb-6">
          {isScanning ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-2">
              <Scissors size={40} className="text-[#4931F7] animate-pulse" />
              <p className="text-sm font-bold text-[#001F3F] dark:text-white">Lecture de votre document...</p>
              <Loader2 size={24} className="animate-spin text-[#4ECDC4]" />
            </div>
          ) : scanSuccess ? (
            <div className="flex flex-col items-center justify-center space-y-4 py-2">
              <CheckCircle size={40} className="text-green-500" />
              <p className="text-sm font-bold text-green-600">Extraction terminée ! Vérifiez les aperçus.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="bg-white dark:bg-[#0b1121] p-4 rounded-full shadow-sm group-hover:scale-110 transition-transform"><UploadCloud size={32} className="text-[#4931F7]" /></div>
              <div>
                <h3 className="text-base font-black text-[#001F3F] dark:text-white">Scanner une ancienne facture</h3>
                <p className="text-xs text-slate-500 mt-2 max-w-sm mx-auto">Importez un PDF ou une image. L'IA extrait votre en-tête et pied de page. <br/>Vous pourrez ensuite ajuster manuellement la zone de coupe.</p>
              </div>
              <label className="bg-[#001F3F] text-white px-6 py-3 rounded-xl text-sm font-bold cursor-pointer hover:bg-slate-800 transition-colors shadow-lg active:scale-95">
                Importer un document
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={processMagicCrop} />
              </label>
            </div>
          )}
        </div>

        {/* APERÇUS CLIQUABLES */}
        {(formData.headerImage || formData.footerImage) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-[#0b1121] p-6 rounded-[2rem] border border-slate-200/50 dark:border-white/5 relative">
            <h4 className="absolute top-3 left-6 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><CheckCircle size={14} className="text-green-500"/> Résultat de l'extraction</h4>
            
            {formData.headerImage && (
              <div className="relative group bg-white dark:bg-[#151e32] p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center mt-6 transition-all hover:border-[#4931F7]/50">
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-2 w-full text-left">En-tête</p>
                <img src={formData.headerImage} alt="Header" className="w-full max-h-32 object-contain rounded-lg bg-white" />
                <div className="absolute inset-0 bg-white/80 dark:bg-[#151e32]/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-4 backdrop-blur-sm">
                  {rawDocumentImage && <button onClick={() => openEditor('header')} className="flex items-center gap-2 bg-[#4931F7] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md hover:bg-[#3b26c6]"><Crop size={14}/> Modifier la zone</button>}
                  <button onClick={() => setFormData(p => ({...p, headerImage: ""}))} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 shadow-md"><Trash2 size={14}/></button>
                </div>
              </div>
            )}

            {formData.footerImage && (
              <div className="relative group bg-white dark:bg-[#151e32] p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center mt-6 transition-all hover:border-[#4931F7]/50">
                <p className="text-[9px] font-bold text-slate-400 uppercase mb-2 w-full text-left">Pied de page</p>
                <img src={formData.footerImage} alt="Footer" className="w-full max-h-32 object-contain rounded-lg bg-white" />
                <div className="absolute inset-0 bg-white/80 dark:bg-[#151e32]/80 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-4 backdrop-blur-sm">
                  {rawDocumentImage && <button onClick={() => openEditor('footer')} className="flex items-center gap-2 bg-[#4931F7] text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md hover:bg-[#3b26c6]"><Crop size={14}/> Modifier la zone</button>}
                  <button onClick={() => setFormData(p => ({...p, footerImage: ""}))} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 shadow-md"><Trash2 size={14}/></button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* BOUTONS D'ACTIONS */}
      <div className="pt-6 pb-[150px] sm:pb-0 flex flex-col sm:flex-row items-center gap-4">
        <button onClick={handleSave} disabled={isSaving || isScanning} className="w-full sm:w-auto bg-[#4931F7] text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-none sm:shadow-lg shadow-[#4931F7]/30 flex items-center justify-center gap-3 hover:bg-[#3b26c6] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Enregistrer
        </button>

        <button onClick={() => setShowPreview(true)} className="w-full sm:w-auto bg-white dark:bg-white/5 text-[#001F3F] dark:text-white border border-slate-200 dark:border-white/10 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-50 transition-all">
          <Eye size={18} /> Aperçu de la facture
        </button>

        {message.text && <p className={`text-sm font-bold animate-pulse ${message.type === 'error' ? 'text-red-500' : 'text-green-500'}`}>{message.text}</p>}
      </div>

      {/* 🟢 MODAL DE RECADRAGE DRAG & DROP */}
      {editState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#001F3F]/90 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-[#0b1121] w-full max-w-3xl rounded-[2.5rem] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            
            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-[#151e32]">
              <h3 className="text-sm font-black text-[#001F3F] dark:text-white uppercase tracking-widest">Ajuster {editState.type === 'header' ? "l'en-tête" : "le pied de page"}</h3>
              <p className="text-[10px] font-bold text-slate-400">Faites défiler pour voir tout le document</p>
            </div>

            <div className="relative bg-gray-200 dark:bg-black/50 overflow-y-auto custom-scrollbar" style={{ height: '70vh' }}>
               <div className="p-8 flex justify-center">
                  <ReactCrop 
                     crop={crop} 
                     onChange={(pixelCrop, percentCrop) => setCrop(percentCrop)}
                     onComplete={(c) => setCompletedCrop(c)}
                     className="shadow-2xl rounded-sm"
                  >
                    <img 
                       ref={imgRef}
                       src={rawDocumentImage} 
                       alt="Document" 
                       className="w-full h-auto bg-white" 
                       onLoad={(e) => {
                          if (editState.type === 'footer') {
                             e.currentTarget.parentElement.parentElement.scrollTo(0, e.currentTarget.height);
                          }
                       }}
                    />
                  </ReactCrop>
               </div>
            </div>

            <div className="p-6 bg-white dark:bg-[#0b1121] border-t border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-4">
                <button onClick={() => setEditState({ isOpen: false, type: null })} className="flex-1 py-4 text-sm font-bold text-slate-500 bg-slate-100 dark:bg-white/5 rounded-2xl hover:bg-slate-200 transition-colors">Annuler</button>
                <button onClick={applyManualCrop} className="flex-1 py-4 text-sm font-black text-white bg-[#4931F7] rounded-2xl hover:bg-[#3b26c6] shadow-xl shadow-[#4931F7]/30 transition-all active:scale-95 flex items-center justify-center gap-2">
                  <CheckCircle size={18}/> Valider la zone
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 🟢 MODALE DE PRÉVISUALISATION A4 */}
      {showPreview && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-[#001F3F]/90 backdrop-blur-md p-4">
          
          <div className="w-full flex justify-center max-w-3xl mb-4">
            <button 
              onClick={() => setShowPreview(false)}
              className="text-white flex items-center gap-2 text-sm font-black hover:text-[#4ECDC4] transition-colors bg-white/10 px-6 py-2.5 rounded-full"
            >
              <X size={20} /> Fermer l'aperçu
            </button>
          </div>

          <div 
            className="bg-white shadow-2xl rounded-sm overflow-hidden flex flex-col relative" 
            style={{ height: '80vh', width: 'calc(80vh * (210 / 297))', maxWidth: '100%' }}
          >
            <div className="w-full relative">
              {formData.headerImage ? (
                <img src={formData.headerImage} alt="Header Preview" className="w-full" style={{ maxHeight: '20vh', objectFit: 'contain', objectPosition: 'top' }} />
              ) : (
                <div className="p-4 border-b border-dashed border-slate-200 text-slate-300 text-center italic text-[10px]">Aucun en-tête configuré</div>
              )}
            </div>

            <div className="flex-1 p-6 flex flex-col justify-start">
              <div className="flex justify-end mb-6">
                 <div className="w-1/2 h-16 bg-slate-50 rounded border border-slate-100 p-3">
                    <div className="w-10 h-1.5 bg-slate-200 mb-2 rounded"></div>
                    <div className="w-20 h-2 bg-slate-300 mb-1.5 rounded"></div>
                    <div className="w-16 h-1.5 bg-slate-200 rounded"></div>
                 </div>
              </div>
              
              <div className="space-y-3 w-full">
                <div className="h-3 bg-slate-100 w-1/3 rounded"></div>
                <div className="border-t border-slate-200 pt-3">
                  <div className="h-6 bg-slate-50 w-full rounded mb-1.5"></div>
                  <div className="h-6 bg-slate-50 w-full rounded mb-1.5"></div>
                  <div className="h-6 bg-slate-50 w-full rounded mb-1.5"></div>
                </div>
              </div>

              <div className="flex justify-end mt-6">
                <div className="w-24 h-6 bg-[#4931F7]/10 rounded flex items-center justify-center text-[#4931F7] font-black text-[9px] uppercase tracking-widest">Total : 0.00 €</div>
              </div>
            </div>

            <div className="absolute bottom-0 left-[10%] right-[10%] w-[80%] flex justify-center pb-3">
              {formData.footerImage ? (
                <img src={formData.footerImage} alt="Footer Preview" className="w-full" style={{ maxHeight: '15vh', objectFit: 'contain', objectPosition: 'bottom' }} />
              ) : (
                <div className="w-full border-t border-dashed border-slate-200 py-3 text-slate-300 text-center italic text-[10px]">Aucun pied de page configuré</div>
              )}
            </div>
          </div>

        </div>
      )}


      {/* BARRE FIXE — modifications non enregistrées */}
      {hasUnsavedDocChanges && (
        <div className="fixed bottom-0 left-0 right-0 z-[150] flex items-center justify-between gap-4 px-6 py-4 bg-orange-500 text-white shadow-2xl animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-3">
            <AlertTriangle size={17} className="shrink-0" />
            <p className="text-sm font-bold">En-tête ou pied de page modifié — pensez à enregistrer.</p>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-white text-orange-600 px-5 py-2 rounded-xl font-black text-sm hover:bg-orange-50 transition-colors shrink-0 disabled:opacity-60"
          >
            {isSaving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Enregistrer
          </button>
        </div>
      )}

    </div>
  );
}