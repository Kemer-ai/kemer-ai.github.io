# kemer-demo-live

Démo de Kemer pour les salons : l'interface complète, alimentée par des patients et des comptes rendus **fictifs**.
Site statique, sans serveur ni base : aucune donnée réelle n'y transite.

- **Adresse** (après déploiement) : `https://<organisation>.github.io/kemer-demo-live/`
- **Parcours** : consultation live (podologie, soin de pédicurie), facture et ordonnance en fin de consultation,
  Mes Patients, comptabilité, profil, cabinet de 5 praticiens, et parcours patient par QR.
- **QR du chevalet** (Profil) : le patient tape les 3 premières lettres de son nom. `DEL` ouvre un devis à signer,
  `GIR` une facture, `ROU` une ordonnance. Les documents sont préparés (`app/demo/salon/data.js`).

## Lancer en local

```bash
npm install
npm run dev            # http://localhost:3000/demo/salon/
```

Pour reproduire le site tel que GitHub Pages le sert :

```bash
BASE_PATH=/kemer-demo-live npm run build   # écrit le site dans out/
```

## Déploiement

Le workflow `.github/workflows/pages.yml` construit et publie sur GitHub Pages à chaque push sur `main`.
Réglage unique : *Settings → Pages → Source : GitHub Actions*.

## Comment ça marche

Les composants viennent de l'application (`kemer-app`), copiés tels quels : accueil, Mes Patients, comptabilité,
profil, pages patient. Rien n'est réécrit, le rendu est celui de l'app.
Ce qui est propre à la démo est dans `app/demo/salon/` :

- `mock-api.js` : les appels `/api/*` de l'app reçoivent une réponse locale (aucune requête ne part).
- `faux-micro.js` : reconnaissance vocale et enregistreur simulés (dictées scriptées, pas de micro requis).
- `data.js` : patients, CR, cabinet, factures et documents patient fictifs.

**Instantané de `kemer-app` au commit `e7c421f`.** Les copies ne suivent pas l'app : pour les rafraîchir, recopier
les fichiers de `app/`, `components/` et `lib/` depuis `kemer-app` (la liste est celle des imports de `app/demo/salon/`).

## À savoir

- Il faut **internet** sur le poste et le téléphone : l'image du QR vient de `api.qrserver.com`, et les PDF
  chargent leurs polices depuis `cdn.jsdelivr.net`.
- Le QR encode l'adresse d'ouverture de la démo : ouvrir la démo via son adresse publique, pas `localhost`.
- `npm run lint` ne couvre que `app/demo` (le reste est du code de l'app, copié).
