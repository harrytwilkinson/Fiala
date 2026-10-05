# Peptide Compass

A mobile-first web app to **learn about**, **accurately mix**, and **track** peptide use.

## Features

- **Library**: a searchable list of common peptides covering what people use them for, how they work in the body, how strong the evidence is, side effects, regulatory status and storage. Content lives in [`src/data/peptides.ts`](src/data/peptides.ts).
- **Reconstitution calculator**: enter the mg in the vial, the mL of bacteriostatic water and your dose (mcg or mg). It shows the concentration, how many units to draw on a U-100 insulin syringe (with a syringe picture), and doses per vial. It also warns when a dose won't fit the syringe, is too small to measure, or falls between markings. A reverse helper tells you how much water to add so each dose lands on a round number of units.
- **Dose tracker**: log the peptide, dose, injection site, time and notes. It reminds you which site you used last so you can rotate, and exports to CSV. Data stays on the device (localStorage).
- **Installable and offline-ready**: add it to a phone's home screen as "Peptide Compass" and it runs full-screen like a native app. After the first visit it works without a connection (`public/manifest.webmanifest`, `public/sw.js`).

## Calculator math

```
concentration (mg/mL) = vial mg ÷ water mL
dose volume (mL)      = dose mg ÷ concentration
syringe units         = dose volume × 100   (U-100: 100 units = 1 mL)
```

## Development

```bash
npm install
npm run dev        # start the dev server
npm test           # unit tests for the calculator math
npm run build      # typecheck + production build to dist/
```

Stack: React 19, TypeScript, Vite and Vitest, with no backend.

## Deployment

Every push to `main` runs the tests, builds the app and publishes it to GitHub Pages via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):

**https://harrytwilkinson.github.io/Peptide-Compass/**

One-time setup: in the repo go to **Settings → Pages → Build and deployment → Source** and pick **GitHub Actions**.
Pull requests run the tests and build via [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Disclaimer

Peptide Compass is for education and personal record-keeping only and is not medical advice. Many peptides are not approved for human use. Talk to a qualified healthcare professional before using any peptide.
