import type { CapacitorConfig } from "@capacitor/cli";

// appId is permanent once the app is published to a store. It follows the reverse-DNS convention for
// getfiala.com (the intended domain); change it before the first upload if a different domain is used.
const config: CapacitorConfig = {
  appId: "com.getfiala.app",
  appName: "Fiala",
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
