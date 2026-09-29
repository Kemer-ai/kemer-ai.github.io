const DB_NAME = "kemer-audio-v1";
const STORE = "pending";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => e.target.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Sauvegarde un enregistrement en attente.
 * Clé = userId_timestamp → unique par enregistrement, plusieurs peuvent coexister.
 * data peut contenir { blob, mimeType, ... } ou { gcsPath, ... } selon ce qui est disponible.
 */
export async function savePendingAudio(userId, { blob, mimeType, patientId, patientName, timestamp, gcsPath }) {
  const db = await openDB();
  const key = `${userId}_${timestamp}`;
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(
      { blob: blob ?? null, mimeType: mimeType ?? null, patientId, patientName, timestamp, gcsPath: gcsPath ?? null, key },
      key
    );
    tx.oncomplete = () => resolve(key);
    tx.onerror = () => reject(tx.error);
  });
}

/** Retourne tous les enregistrements en attente pour un praticien, du plus récent au plus ancien. */
export async function getAllPendingAudios(userId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const all = req.result || [];
      resolve(
        all
          .filter((r) => r.key?.startsWith(`${userId}_`))
          .sort((a, b) => b.timestamp - a.timestamp)
      );
    };
    req.onerror = () => reject(req.error);
  });
}

/** Retourne tous les enregistrements en attente, tous utilisateurs confondus (usage page récupération). */
export async function getAllPendingAudiosAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result || []).sort((a, b) => b.timestamp - a.timestamp));
    req.onerror = () => reject(req.error);
  });
}

/** Supprime un enregistrement par sa clé exacte (userId_timestamp). */
export async function deletePendingAudioByKey(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

// --- Compat ascendante (ancien format, clé = userId seul) ---

export async function getPendingAudio(userId) {
  const all = await getAllPendingAudios(userId);
  return all[0] || null;
}

export async function deletePendingAudio(userId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(userId);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}
