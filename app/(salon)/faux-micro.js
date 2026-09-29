// La démo n'utilise jamais le vrai micro : les blocs de l'app (soin de pédicurie, ordonnance) sont
// pilotés par une dictée scriptée. Ces doublures reprennent l'interface du navigateur que ces blocs
// appellent, sans rien modifier de leur code.

let texte = "";
let position = 0;
let rapide = false;

export const definirDictee = (t) => { texte = t; position = 0; };
export const definirVitesse = (r) => { rapide = r; };

// Web Speech : émet la dictée par morceaux de 3 mots (provisoire, puis définitif), comme Chrome.
export class FausseReconnaissance {
  constructor() {
    this.lang = "";
    this.continuous = false;
    this.interimResults = false;
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
    this.actif = false;
    this.minuteur = null;
  }
  start() {
    this.actif = true;
    const mots = texte.split(" ").filter(Boolean);
    const suivant = () => {
      if (!this.actif) return;
      if (position >= mots.length) { this.actif = false; position = 0; this.onend?.(); return; }
      const morceau = mots.slice(position, position + 3).join(" ");
      this.onresult?.({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: morceau } }] });
      this.minuteur = setTimeout(() => {
        if (!this.actif) return;
        position += 3;
        this.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: morceau } }] });
        this.minuteur = setTimeout(suivant, rapide ? 60 : 260);
      }, rapide ? 80 : 340);
    };
    this.minuteur = setTimeout(suivant, 300);
  }
  stop() {
    const actif = this.actif;
    this.actif = false;
    clearTimeout(this.minuteur);
    // Arrêt avant la fin de la dictée : la note contient quand même tout le texte, comme le CR complet
    // que la démo affiche à l'arrêt, même après quelques secondes d'enregistrement.
    const mots = texte.split(" ").filter(Boolean);
    if (actif && position < mots.length) {
      const reste = mots.slice(position).join(" ");
      position = 0;
      this.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: reste } }] });
    }
    this.onend?.();
  }
}

export function installerFausseReconnaissance() {
  const avant = { a: window.SpeechRecognition, b: window.webkitSpeechRecognition };
  window.SpeechRecognition = FausseReconnaissance;
  window.webkitSpeechRecognition = FausseReconnaissance;
  return () => { window.SpeechRecognition = avant.a; window.webkitSpeechRecognition = avant.b; };
}

// Enregistreur audio : la dictée d'ordonnance envoie un blob à /api/ordonnance-dictation, dont la
// réponse est scriptée. Ni permission ni micro nécessaires.
export function installerFauxEnregistreur() {
  const md = navigator.mediaDevices;
  const vraiGetUserMedia = md?.getUserMedia;
  const VraiMediaRecorder = window.MediaRecorder;
  const flux = { getTracks: () => [{ stop() {} }] };
  if (md) md.getUserMedia = async () => flux;
  class FauxMediaRecorder {
    constructor() { this.state = "inactive"; this.mimeType = "audio/webm"; this.stream = flux; }
    start() { this.state = "recording"; }
    pause() {}
    resume() {}
    stop() {
      this.state = "inactive";
      this.ondataavailable?.({ data: new Blob([new Uint8Array(64)], { type: "audio/webm" }) });
      this.onstop?.();
    }
    static isTypeSupported() { return true; }
  }
  window.MediaRecorder = FauxMediaRecorder;
  return () => {
    if (md) md.getUserMedia = vraiGetUserMedia;
    window.MediaRecorder = VraiMediaRecorder;
  };
}
