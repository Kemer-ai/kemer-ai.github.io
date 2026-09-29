/**
 * Pré-charge les images GCS en base64 pour @react-pdf/renderer
 * (les URL https:// ne sont pas accessibles depuis le renderer PDF côté client)
 */
export async function resolveImages(branding) {
  if (!branding) return branding;
  const fields = ['logo', 'photo', 'headerImage', 'footerImage'];
  const result = { ...branding };
  await Promise.all(
    fields.map(async (field) => {
      const url = result[field];
      if (url && url.startsWith('https://')) {
        try {
          // Le bucket GCS est privé — passe par le proxy serveur (lecture via
          // le service account) plutôt qu'un fetch direct de l'URL publique.
          // Le proxy répond déjà avec le corps en "data:...;base64,..." (texte).
          const res = await fetch(`/api/image-proxy?url=${encodeURIComponent(url)}`);
          if (!res.ok) return;
          const dataUrl = await res.text();
          if (dataUrl.startsWith('data:')) result[field] = dataUrl;
        } catch { /* garde l'URL originale */ }
      }
    })
  );
  return result;
}
