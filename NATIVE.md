# Native apps (iOS & Android)

Fiala ships as a website **and** as native iOS/Android apps built with
[Capacitor](https://capacitorjs.com). The native apps run the same web code
inside a native shell, plus a few native-only features:

| Feature | Website | Native app |
|---|---|---|
| Dose reminders | "Add to calendar" (.ics file) | Real notifications at each scheduled time |
| Backup / CSV export | Download or Web Share | Native share sheet (Save to Files, iCloud, Drive, email…) |
| Offline | Service worker | Built in (files are bundled in the app) |
| Icon & splash screen | Web manifest | Native icons, adaptive Android icon, light/dark splash |

The `ios/` and `android/` folders are the real Xcode and Android Studio
projects. They're committed to git, as Capacitor recommends.

## Two build flavours

| Command | What it builds |
|---|---|
| `npm run native:sync` | **Full** app, including the dose converter |
| `npm run native:sync:store` | **Store** app: the converter is compiled out completely (code and UI), in case App Review objects to it under guideline 1.4.2 |

Both commands build the web app and copy it into the native projects. Run one
of them after every code change before building in Xcode or Android Studio.

## Building on your own computer

### iOS (needs a Mac)
1. Install **Xcode** from the Mac App Store (and open it once to finish setup).
2. `npm install`, then `npm run native:sync` (or `native:sync:store`).
3. `npm run ios` opens the project in Xcode.
4. In Xcode, choose a simulator or your plugged-in iPhone and press ▶︎.
   To run on a real iPhone, select the **App** target → *Signing & Capabilities*
   and pick your Apple ID team.

### Android (Mac, Windows or Linux)
1. Install **Android Studio**.
2. `npm install`, then `npm run native:sync` (or `native:sync:store`).
3. `npm run android` opens the project in Android Studio.
4. Choose an emulator or your plugged-in phone (with USB debugging on) and press ▶︎.

## Builds on GitHub (no setup needed)

The **Native apps** workflow (`.github/workflows/native.yml`) runs on every pull
request and push to `main`, and can be started by hand from the **Actions** tab:

- **Android:** builds installable debug APKs for both flavours. Download them
  from the workflow run's **Artifacts** section, unzip, and open the `.apk` on an
  Android phone (you'll be asked to allow installs from your browser/files app).
- **iOS:** compiles the app for the simulator to prove the project builds. iPhone
  installs need signing with an Apple developer account, so they're done from Xcode.

## Reminders: how they work

The app plans the next 14 days of reminders from your schedules and hands them
to the phone as individual notifications (iOS allows at most 64 pending per
app). It re-plans whenever a schedule or dose changes and whenever the app is
reopened, so as long as the app is opened at least every couple of weeks,
reminders keep coming. A reminder for today is skipped once that dose is logged.
Notification permission is requested the first time you save a schedule, or from
**Turn on reminders** on the Schedules screen.

## Before publishing to the stores

- [ ] **App ID**: `app.fiala` in `capacitor.config.ts` (matches the domain
      `fiala.app` if you register it). It can't be changed after the first
      upload; to change it, edit `capacitor.config.ts`, delete `ios/` and
      `android/`, then run `npx cap add ios`, `npx cap add android` and the icon
      command below.
- [ ] **Developer accounts**: Apple Developer Program (US$99/year) and Google Play
      Console (US$25 one-time).
- [ ] **Privacy policy URL** (required by both stores). The app collects no data;
      everything stays on the device.
- [ ] **Version numbers**: bump `CFBundleShortVersionString` / build number in
      Xcode and `versionName` / `versionCode` in `android/app/build.gradle` for
      each release.
- [ ] **Signing**: archive in Xcode (*Product → Archive*) for App Store Connect;
      generate an upload key and build a signed App Bundle (*Build → Generate
      Signed App Bundle*) in Android Studio for Play.
- [ ] **Google Play**: complete the Health apps declaration and the Data safety form.
- [ ] **App Review notes (Apple)**: explain that the converter only converts units
      for a dose the user enters, never recommends doses, and keeps all data on
      the device. If it's rejected under 1.4.2, resubmit the store flavour.
- [ ] **Medical review** of the library content.

## Regenerating icons and splash screens

Source images live in `assets/` (`icon-only.png`, `icon-foreground.png`,
`icon-background.png`, `splash.png`, `splash-dark.png`). After changing them:

```bash
npx @capacitor/assets generate --iosProject ios/App --androidProject android
```

(That tool also writes web icons and edits `public/manifest.webmanifest`; discard
those changes with `git checkout public/manifest.webmanifest` and delete the
generated top-level `icons/` folder. The website keeps its own icons.)
