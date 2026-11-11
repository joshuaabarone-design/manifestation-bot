import type { CapacitorConfig } from "@capacitor/cli";

/**
 * iOS shell for Manifest. The built web app (dist/public) is bundled into the app and served from
 * capacitor://localhost. There is deliberately NO `server.url`: the app never loads a remote site.
 * All API calls go to VITE_API_BASE_URL (set at build time).
 *
 * Bundle ID: com.joshuabarone.manifestation by default (individual Apple Developer enrollment).
 * Override with CAP_APP_ID before `npx cap sync ios` if needed.
 */
const config: CapacitorConfig = {
  appId: process.env.CAP_APP_ID || "com.joshuabarone.manifestation",
  appName: "Manifest",
  webDir: "dist/public",
  ios: {
    contentInset: "never", // the web layer handles safe areas with env(safe-area-inset-*)
    backgroundColor: "#1a1625",
    scheme: "Manifest",
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: false, // hidden by the app once the first screen renders
      backgroundColor: "#170315", // matches the icon/splash artwork
      showSpinner: false,
      launchFadeOutDuration: 250,
    },
    StatusBar: {
      style: "DARK",
      overlaysWebView: true,
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
    LocalNotifications: {
      iconColor: "#f59e0b",
    },
  },
};

export default config;
