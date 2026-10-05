# Fiala

*Formerly Peptide Compass.* A mobile-first web and native app to **learn about**, **accurately mix**, and **track** peptide use.

## Features

- **Library**: a searchable list of common peptides covering what people use them for, how they work in the body, how strong the evidence is, side effects, regulatory status and storage. Content lives in [`src/data/peptides.ts`](src/data/peptides.ts).
- **Reconstitution & syringe converter**: a general unit converter that isn't tied to any compound and never suggests a dose. Enter the mg in the vial, the mL of bacteriostatic water and the prescribed dose (mcg or mg). It shows the concentration, how many units to draw on a U-100 insulin syringe (with a syringe picture), and doses per vial. It also warns when a dose won't fit the syringe, is too small to measure, or falls between markings. A reverse helper tells you how much water to add so each dose lands on a round number of units.
- **First-run walkthrough**: five short cards introduce the library, converter and tracker, explain that data stays on the device, and ask the user to acknowledge that the app is not medical advice. It can be replayed from "How Fiala works" on the home screen.
- **Today**: the home screen lists today's scheduled doses with one-tap "Mark taken", vials that need attention, and what's coming up this week.
- **Dose log**: log the peptide, dose (mcg, mg or syringe units), the vial it came from, injection site, time and notes. It reminds you which site you used last so you can rotate, and exports to CSV.
- **Vial inventory**: record each mixed vial (amount, water, date mixed, discard-after days). Remaining peptide and doses left are worked out from the doses logged against it, with warnings when a vial is running low or past its discard date. The converter can save its result straight to a vial.
- **Schedules and reminders**: weekly ("Mon, Thu") or every-N-days routines with a time, start and end date. "Add to calendar" downloads an `.ics` file, so the phone's own calendar gives recurring reminders even when the app is closed, with no server needed.
- **Backup & restore**: save every dose, vial and schedule to one JSON file (via the phone's share sheet where supported, otherwise a download), and restore it on any device. Restores show a preview first, then either merge (keeping existing records) or replace everything. Damaged records are skipped. The home screen nudges you if you haven't backed up in 30 days, and the app requests persistent storage.
- All tracking data stays on the device (localStorage). Data saved before the rename (under `peptide-compass:*` keys) is moved to `fiala:*` automatically, and old backup files still restore.
- **Native iOS & Android apps** (Capacitor): real dose-reminder notifications, native share sheet for backups and exports, native icons and splash screens, and a store build that compiles out the converter. See [NATIVE.md](NATIVE.md).
- **Installable and offline-ready**: add it to a phone's home screen as "Fiala" and it runs full-screen like a native app. After the first visit it works without a connection (`public/manifest.webmanifest`, `public/sw.js`).

## Converter math

```
concentration (mg/mL) = vial mg ÷ water mL
dose volume (mL)      = dose mg ÷ concentration
syringe units         = dose volume × 100   (U-100: 100 units = 1 mL)
```

## Development

```bash
npm install
npm run dev        # start the dev server
npm test           # unit tests (converter math, vials, schedules, backup, library data)
npm run build      # typecheck + production build to dist/
npm run native:sync        # build and copy into the iOS/Android projects (see NATIVE.md)
npm run native:sync:store  # same, without the dose converter
```

Stack: React 19, TypeScript, Vite and Vitest, with no backend; Capacitor 8 for the native apps.

## Deployment

Every push to `main` runs the tests, builds the app and publishes it to GitHub Pages via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):

**https://harrytwilkinson.github.io/Peptide-Compass/**

(The address follows the GitHub repository name. Renaming the repository to `Fiala` in its settings changes it to `…github.io/Fiala/`; GitHub redirects git operations, but not the old Pages address.)

One-time setup: in the repo go to **Settings → Pages → Build and deployment → Source** and pick **GitHub Actions**.
Pull requests run the tests and build via [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Disclaimer

Fiala is for education and personal record-keeping only and is not medical advice. Many peptides are not approved for human use. Talk to a qualified healthcare professional before using any peptide.
