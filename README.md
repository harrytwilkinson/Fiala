# Fiala

*Formerly Peptide Compass.* A mobile-first web and native app to **learn about**, **accurately mix**, and **track** peptide use.

## Features

- **Library**: a searchable list of common peptides covering what people use them for, how they work in the body, how strong the evidence is, side effects, who should avoid it, how it's taken, half-life, regulatory status, storage, and live "look up the evidence" searches of PubMed, ClinicalTrials.gov and (for approved medicines) official labels. A glossary explains the terms. Content lives in [`src/data/peptides.ts`](src/data/peptides.ts).
- **Stacks & blends**: GLOW, KLOW, Wolverine (BPC-157 + TB-500), CJC-1295 + Ipamorelin and CagriSema, each with what's in it, typical vial labels, why people combine them, evidence, risks and regulatory status. Content lives in [`src/data/stacks.ts`](src/data/stacks.ts); stacks can be logged and scheduled like peptides.
- **Reconstitution & syringe converter**: a general unit converter that isn't tied to any compound and never suggests a dose. Enter the mg in the vial, the mL of bacteriostatic water and the prescribed dose (mcg or mg). It shows the concentration, how many units to draw on a U-100 insulin syringe (with a syringe picture), and doses per vial. It also warns when a dose won't fit the syringe, is too small to measure, or falls between markings. A reverse helper tells you how much water to add so each dose lands on a round number of units. A **blend mode** handles vials holding several peptides: enter each one's amount and the prescribed dose of one, and it shows the units to draw and how much of every peptide that draw contains.
- **First-run walkthrough**: five short cards introduce the library, converter and tracker, explain that data stays on the device, and ask the user to acknowledge that the app is not medical advice. It can be replayed from "How Fiala works" on the home screen.
- **Today**: the home screen lists today's scheduled doses with one-tap "Mark taken", vials that need attention, and what's coming up this week.
- **Dose log**: log the peptide, dose (mcg, mg or syringe units), the vial it came from, injection site, time and notes. It reminds you which site you used last so you can rotate, and exports to CSV.
- **Body**: log weight (kg, lb or stone & lb) and waist, see latest and recent change, and a weight chart over 1, 3, 6 months or all time, with optional ticks marking doses of a chosen peptide.
- **Side effects**: a journal of symptoms with severity, time and possibly-related peptide, plus a 30-day summary; a severe entry prompts the user to contact a clinician.
- **Injection-site map**: when logging a dose, tap the site on a front/back body outline; sites used in the last 3 days and last week are highlighted to help rotation.
- **Vial inventory**: record each mixed vial (amount, water, date mixed, discard-after days). Remaining peptide and doses left are worked out from the doses logged against it, with warnings when a vial is running low or past its discard date. The converter can save its result straight to a vial.
- **Schedules and reminders**: weekly ("Mon, Thu") or every-N-days routines with a time, start and end date. "Add to calendar" downloads an `.ics` file, so the phone's own calendar gives recurring reminders even when the app is closed, with no server needed.
- **News**: a feed of new PubMed studies, ClinicalTrials.gov trial updates and FDA announcements that mention peptides in the library, plus Fiala's own posts. Each item is labelled (e.g. "Randomised trial", "Lab or animal study", "Recruiting · Phase 3") and tagged with its peptides. Follow peptides to see their news first; each library page shows its latest research. The last feed is saved for offline use.
- **Search-friendly library pages**: every peptide also has a plain web page at `getfiala.com/peptides/<id>/` (plus an index at `/peptides/`, `sitemap.xml` and `robots.txt`) so search engines can find the library; the app itself uses `#/` addresses, which they don't index. The pages are generated after each build by [`scripts/build-pages.ts`](scripts/build-pages.ts), include the peptide's latest news, and link into the app. Each library entry in the app has a **Share** button for its page.
- **Backup & restore**: save every dose, vial, schedule, measurement and side-effect note to one JSON file (via the phone's share sheet where supported, otherwise a download), and restore it on any device. Restores show a preview first, then either merge (keeping existing records) or replace everything. Damaged records are skipped. The home screen nudges you if you haven't backed up in 30 days, and the app requests persistent storage.
- **Privacy policy and support pages**: standalone pages at `privacy.html` and `support.html` (also used as the App Store / Play URLs), linked from the home screen, walkthrough and backup screen, and available offline.
- All tracking data stays on the device (localStorage). Data saved before the rename (under `peptide-compass:*` keys) is moved to `fiala:*` automatically, and old backup files still restore.
- **Native iOS & Android apps** (Capacitor): real dose-reminder notifications, native share sheet for backups and exports, native icons and splash screens, and a store build that compiles out the converter. See [NATIVE.md](NATIVE.md).
- **Installable and offline-ready**: add it to a phone's home screen as "Fiala" and it runs full-screen like a native app. After the first visit it works without a connection (`public/manifest.webmanifest`, `public/sw.js`).

## Converter math

```
concentration (mg/mL) = vial mg ÷ water mL
dose volume (mL)      = dose mg ÷ concentration
syringe units         = dose volume × 100   (U-100: 100 units = 1 mL)
```

## News feed

`scripts/build-news.ts` (`npm run news`) writes `public/news.json`. It searches each source for every library peptide (search terms come from names and aliases; overly broad aliases are excluded in `src/lib/newsBuild.ts`), merges the results with the currently published feed at getfiala.com, and trims old items. A source that is down for a night is skipped, so the feed never empties. The deploy workflow runs it every night at 05:17 UTC and on every push to `main`.

**Writing a Fiala post:** add an entry to [`news/posts.json`](news/posts.json) and merge it to `main`:

```json
{ "id": "short-unique-slug", "date": "2026-10-05", "title": "Headline", "summary": "Plain text.", "url": "https://optional-link", "peptides": ["bpc-157"] }
```

Delete an entry to remove the post. GitHub pauses scheduled workflows after 60 days without any commits; if the feed stops updating, re-enable the workflow from the **Actions** tab.

## Tip jar

Set `SUPPORT_URL` in [`src/lib/site.ts`](src/lib/site.ts) (e.g. a Ko-fi page) to show "Support Fiala ♥" links on the home screen (website only, not the native apps) and on the library pages. Leave it empty to hide them.

## Development

```bash
npm install
npm run dev        # start the dev server
npm test           # unit tests (converter math, vials, schedules, backup, news, library data)
npm run news       # fetch the news feed into public/news.json
npm run build      # typecheck + production build to dist/
npm run native:sync        # build and copy into the iOS/Android projects (see NATIVE.md)
npm run native:sync:store  # same, without the dose converter
```

Stack: React 19, TypeScript, Vite and Vitest, with no backend; Capacitor 8 for the native apps.

## Deployment

Every push to `main` runs the tests, builds the app and publishes it to GitHub Pages via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):

**https://getfiala.com/** (custom domain; `harrytwilkinson.github.io/Fiala/` redirects there)

The custom domain is set in **Settings → Pages → Custom domain** (an Actions-deployed site needs no `CNAME` file), with DNS at Cloudflare pointing to GitHub Pages. Saved data is per website address, so data from the old github.io address doesn't carry over: back it up there and restore it on getfiala.com.

One-time setup: in the repo go to **Settings → Pages → Build and deployment → Source** and pick **GitHub Actions**.
Pull requests run the tests and build via [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Copyright

Copyright © 2026 Harry Taylor Wilkinson. All rights reserved. The code is public for transparency, but it is not open source: see [LICENSE](LICENSE). No part of Fiala may be copied, reused or redistributed without written permission.

## Disclaimer

Fiala is for education and personal record-keeping only and is not medical advice. Many peptides are not approved for human use. Talk to a qualified healthcare professional before using any peptide.
