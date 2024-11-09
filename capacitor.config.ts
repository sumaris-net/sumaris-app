import { CapacitorConfig } from '@capacitor/cli';

// Capacitor plugins (common)
const commonIncludePlugins = [
  '@capacitor-community/native-audio',
  '@capacitor/app',
  '@capacitor/browser',
  '@capacitor/camera',
  '@capacitor/clipboard',
  '@capacitor/geolocation',
  '@capacitor/haptics',
  '@capacitor/keyboard',
  '@capacitor/share',
  '@capacitor/splash-screen',
  '@capacitor/status-bar',
];

const config: CapacitorConfig = {
  appId: 'net.sumaris.app',
  appName: 'SUMARiS',
  webDir: 'www',
  bundledWebRuntime: false,
  loggingBehavior: 'none',
  plugins: {
    SplashScreen: {
      showSpinner: true,
      androidSpinnerStyle: 'horizontal',
      launchAutoHide: false,
    },
  },
  android: {
    buildOptions: {
      releaseType: 'APK',
    },
    includePlugins: [...commonIncludePlugins, '@e-is/capacitor-bluetooth-serial'],
  },
  ios: {
    includePlugins: [...commonIncludePlugins],
  },
  server: {
    cleartext: true,
  },
};

export default config;
