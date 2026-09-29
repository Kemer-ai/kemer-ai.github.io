// Formatage d'affichage des noms de patients : "jean-pierre" → "Jean-Pierre", "MARIE claire" → "Marie Claire"
export function formatPrenom(str) {
  if (!str) return str;
  return str
    .toLowerCase()
    .split(/(\s+|-)/)
    .map(part => (/^[\s-]+$/.test(part) ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join("");
}

export function formatNom(str) {
  return str ? str.toUpperCase() : str;
}
