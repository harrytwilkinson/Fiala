import type { CapacitorConfig } from "@capacitor/cli";

// appId is permanent once the app is published to a store; change it before the first upload if needed.
const config: CapacitorConfig = {
  appId: "com.peptidecompass.app",
  appName: "Peptide Compass",
  webDir: "dist",
  ios: {
    contentInset: "never",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: "#0d9488",
      showSpinner: false,
    },
    LocalNotifications: {
      iconColor: "#0d9488",
    },
  },
};

export default config;
