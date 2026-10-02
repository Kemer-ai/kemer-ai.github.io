"use client";
// Page de signature du patient, avec une signature fictive qui apparaît toute seule.
//
// La page réelle (app/patient/signature) attend que le patient signe au doigt sur un canvas
// (react-signature-canvas). Pour la démo, on pose sur ce canvas l'image de la signature (signature-png.js, la
// même que celle des PDF) avec un tracé au stylo. Le canvas
// contient ensuite la signature : la page l'enregistre telle quelle (getTrimmedCanvas lit les pixels).
// Elle réapparaît à chaque canvas vierge (étape devis, puis facture, ou après « Effacer »).
//
// La bibliothèque décide qu'un canvas est « vide » d'après ses propres traits, pas d'après les pixels : on lui
// donne un point, posé sur le point du « i » de la signature (déjà de l'encre : il ne se voit pas).

import { useEffect, useRef } from "react";
import { SIGNATURE_PREENREGISTREE } from "./signature-png";
import { traitsLisses } from "./signature-factice";

const ATTENTE_AVANT_TRACE = 500; // ms : le temps de lire la page avant que la signature n'apparaisse
const DUREE_TRACE = 1300; // ms : durée du tracé
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

// Les traits, prêts à tracer : points lissés, longueur cumulée (pour que le stylo avance à vitesse régulière).
const MARGE = { x: 0.04, y: 0.08 }; // même marge que l'image (signature-png.js)
const traits = traitsLisses(0.0015);
const total = traits.reduce((n, t) => n + t.length, 0);

// Trace la signature au stylo, directement sur le canvas : même épaisseur que l'image (pleine au milieu du
// trait, déliée aux extrémités). Renvoie une promesse (false si interrompu).
function tracer(canvas, image, reduit, annule) {
  const ctx = canvas.getContext("2d");
  const cw = canvas.width;
  const ch = canvas.height;
  const echelle = Math.min((cw * 0.9) / image.width, (ch * 0.86) / image.height);
  const geometrie = { largeur: image.width * echelle, hauteur: image.height * echelle };
  geometrie.x = (cw - geometrie.largeur) / 2;
  geometrie.y = (ch - geometrie.hauteur) / 2;
  const vers = ([x, y]) => [
    geometrie.x + (MARGE.x + x * (1 - 2 * MARGE.x)) * geometrie.largeur,
    geometrie.y + (MARGE.y + y * (1 - 2 * MARGE.y)) * geometrie.hauteur,
  ];

  // La page applique un facteur d'échelle d'écran (Retina) : on dessine en pixels bruts.
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = "#001F3F";
  let posees = 0; // points déjà posés, tous traits confondus
  const poser = (cible) => {
    let debut = 0;
    traits.forEach((trait) => {
      const n = trait.length;
      for (let i = Math.max(0, posees - debut); i < n && debut + i < cible; i++) {
        const rayon = (1.6 + 0.9 * Math.pow(Math.sin((Math.PI * i) / (n - 1)), 0.5)) * echelle;
        const [x, y] = vers(trait[i]);
        ctx.beginPath();
        ctx.arc(x, y, rayon, 0, Math.PI * 2);
        ctx.fill();
      }
      debut += n;
    });
    posees = Math.max(posees, cible);
  };

  return new Promise((resolve) => {
    const fin = () => { ctx.restore(); marquerNonVide(canvas, geometrie); resolve(true); };
    if (reduit) { poser(total); fin(); return; }
    const debut = performance.now();
    const image_ = (maintenant) => {
      if (annule() || !canvas.isConnected) { ctx.restore(); resolve(false); return; }
      const progression = Math.min(1, (maintenant - debut) / DUREE_TRACE);
      poser(Math.round(total * progression));
      if (progression < 1) requestAnimationFrame(image_);
      else fin();
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
    let version = 0; // un redimensionnement efface le canvas : le tracé en cours est abandonné

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
        await tracer(canvas, image, reduit, () => !vivant || version !== maVersion);
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
