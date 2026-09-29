// Couleur pseudo-aléatoire mais stable pour un avatar (hash de l'id)
const AVATAR_PALETTE = [
  { bg: "bg-[#4931F7]/15", text: "text-[#4931F7]" },
  { bg: "bg-[#4ECDC4]/15", text: "text-teal-600" },
  { bg: "bg-amber-500/15", text: "text-amber-600" },
  { bg: "bg-rose-500/15", text: "text-rose-600" },
  { bg: "bg-sky-500/15", text: "text-sky-600" },
  { bg: "bg-fuchsia-500/15", text: "text-fuchsia-600" },
  { bg: "bg-emerald-500/15", text: "text-emerald-600" },
  { bg: "bg-orange-500/15", text: "text-orange-600" },
];

export function avatarColor(id) {
  let hash = 0;
  for (let i = 0; i < (id || "").length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}
