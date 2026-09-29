// Site 100 % statique (GitHub Pages) : `next build` écrit le site dans out/.
// GitHub Pages sert un dépôt sous /<nom-du-dépôt>/ : BASE_PATH le fournit au build
// (vide en local, "/kemer-demo-live" dans le workflow de déploiement).
const basePath = process.env.BASE_PATH || "";

export default {
  output: "export",
  trailingSlash: true,
  basePath,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  turbopack: {},
};
