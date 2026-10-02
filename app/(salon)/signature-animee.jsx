"use client";
// Page de signature du patient, avec une signature fictive qui apparaît toute seule.
//
// La page réelle (app/patient/signature) attend que le patient signe au doigt sur un canvas
// (react-signature-canvas). Pour la démo, on pose sur ce canvas l'image de la signature (signature-png.js, la
// même que celle des PDF) avec un balayage en diagonale (du bas à gauche vers le haut à droite) à bord très doux et une montée d'opacité. Le canvas
// contient ensuite la signature : la page l'enregistre telle quelle (getTrimmedCanvas lit les pixels).
// Elle réapparaît à chaque canvas vierge (étape devis, puis facture, ou après « Effacer »).
//
// La bibliothèque décide qu'un canvas est « vide » d'après ses propres traits, pas d'après les pixels : on lui
// donne un point, posé sur le point du « i » de la signature (déjà de l'encre : il ne se voit pas).

import { useEffect, useRef } from "react";
import { SIGNATURE_PREENREGISTREE } from "./signature-png";

const ATTENTE_AVANT_TRACE = 500; // ms : le temps de lire la page avant que la signature n'apparaisse
const DUREE_TRACE = 1000; // ms : durée du balayage
const BORD_DOUX = 0.45; // largeur du dégradé du balayage, en part de la diagonale de la signature
// Le point du « i » dans la signature (voir signature-factice.js et la marge de signature-png.js).
const POINT = { x: 0.04 + 0.576 * 0.92, y: 0.08 + 0.38 * 0.84 };

const estVide = (canvas) => {
  try {
    const octets = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < octets.length; i += 4) if (octets[i] !== 0) return false;
    return true;
  } catch {
    return false;
  }
};

let imageEnCache = null;
const chargerImage = () => {
  if (!imageEnCache) {
    imageEnCache = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = SIGNATURE_PREENREGISTREE;
    });
  }
  return imageEnCache;
};

const ralentir = (p) => 1 - Math.pow(1 - p, 2.2); // départ vif, arrivée douce

function envoyer(type, cible, clientX, clientY) {
  cible.dispatchEvent(new MouseEvent(type, {
    bubbles: true, cancelable: true, view: window, button: 0, buttons: type === "mouseup" ? 0 : 1, clientX, clientY,
  }));
}

// Un appui puis un relâchement : la bibliothèque compte désormais une signature.
function marquerNonVide(canvas, geometrie) {
  const r = canvas.getBoundingClientRect();
  const clientX = r.left + ((geometrie.x + POINT.x * geometrie.largeur) / canvas.width) * r.width;
  const clientY = r.top + ((geometrie.y + POINT.y * geometrie.hauteur) / canvas.height) * r.height;
  envoyer("mouseup", document, clientX, clientY);
  envoyer("mousedown", canvas, clientX, clientY);
  envoyer("mouseup", document, clientX, clientY);
}

// Pose la signature sur le canvas par un balayage ; renvoie une promesse (false si interrompu).
function balayer(canvas, image, reduit, annule) {
  const ctx = canvas.getContext("2d");
  const cw = canvas.width;
  const ch = canvas.height;
  const echelle = Math.min((cw * 0.9) / image.width, (ch * 0.86) / image.height);
  const geometrie = { largeur: image.width * echelle, hauteur: image.height * echelle };
  geometrie.x = (cw - geometrie.largeur) / 2;
  geometrie.y = (ch - geometrie.hauteur) / 2;
  const tampon = document.createElement("canvas");
  tampon.width = cw;
  tampon.height = ch;
  const tc = tampon.getContext("2d");
  // Le balayage suit la diagonale : du coin bas-gauche au coin haut-droit de la signature.
  const diagonale = Math.hypot(geometrie.largeur, geometrie.hauteur);
  const ux = geometrie.largeur / diagonale;
  const uy = -geometrie.hauteur / diagonale;
  const ox = geometrie.x;
  const oy = geometrie.y + geometrie.hauteur;
  const bord = BORD_DOUX * diagonale;

  const dessiner = (progression) => {
    // 1. La signature seule, 2. un masque dont le bord doux avance en diagonale.
    tc.globalCompositeOperation = "source-over";
    tc.clearRect(0, 0, cw, ch);
    tc.drawImage(image, geometrie.x, geometrie.y, geometrie.largeur, geometrie.hauteur);
    const front = (diagonale + bord) * ralentir(progression);
    const masque = tc.createLinearGradient(ox + ux * (front - bord), oy + uy * (front - bord), ox + ux * front, oy + uy * front);
    masque.addColorStop(0, "rgba(0,0,0,1)");
    masque.addColorStop(1, "rgba(0,0,0,0)");
    tc.globalCompositeOperation = "destination-in";
    tc.fillStyle = masque;
    tc.fillRect(0, 0, cw, ch);
    // 3. Sur le canvas de la page, avec une opacité qui monte. La page y applique un facteur d'échelle d'écran
    //    (écrans Retina) : on dessine en pixels bruts, donc transformation remise à zéro le temps du dessin.
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cw, ch);
    ctx.globalAlpha = Math.min(1, 0.25 + progression * 1.5);
    ctx.drawImage(tampon, 0, 0);
    ctx.restore();
  };

  return new Promise((resolve) => {
    if (reduit) { dessiner(1); marquerNonVide(canvas, geometrie); resolve(true); return; }
    const debut = performance.now();
    const image_ = (maintenant) => {
      if (annule() || !canvas.isConnected) { resolve(false); return; }
      const progression = Math.min(1, (maintenant - debut) / DUREE_TRACE);
      dessiner(progression);
      if (progression < 1) requestAnimationFrame(image_);
      else { marquerNonVide(canvas, geometrie); resolve(true); }
    };
    requestAnimationFrame(image_);
  });
}

export default function SignatureAnimee({ children }) {
  const racine = useRef(null);

  useEffect(() => {
    const reduit = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let vivant = true;
    let enCours = false;
    let minuteur = null;
    let version = 0; // un redimensionnement efface le canvas : le balayage en cours est abandonné

    function interrompre() {
      version += 1;
      clearTimeout(minuteur);
      minuteur = null;
      enCours = false;
    }

    async function lancer(canvas) {
      enCours = true;
      const maVersion = version;
      try {
        const image = await chargerImage();
        await balayer(canvas, image, reduit, () => !vivant || version !== maVersion);
      } catch {
        /* image illisible : la page reste utilisable, le patient signe au doigt */
      }
      if (version === maVersion) enCours = false;
    }

    // Surveille la page : dès qu'un canvas de signature vierge est visible, la signature apparaît.
    const veille = setInterval(() => {
      if (!vivant || enCours) return;
      const canvas = racine.current?.querySelector("canvas");
      if (!canvas || canvas.offsetWidth === 0 || !estVide(canvas)) { clearTimeout(minuteur); minuteur = null; return; }
      if (minuteur) return;
      minuteur = setTimeout(() => {
        minuteur = null;
        const c = racine.current?.querySelector("canvas");
        if (vivant && !enCours && c && estVide(c)) lancer(c);
      }, ATTENTE_AVANT_TRACE);
    }, 200);

    window.addEventListener("resize", interrompre);
    return () => {
      vivant = false;
      clearInterval(veille);
      window.removeEventListener("resize", interrompre);
      clearTimeout(minuteur);
    };
  }, []);

  return <div ref={racine}>{children}</div>;
}
