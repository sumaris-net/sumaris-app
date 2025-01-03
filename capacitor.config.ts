import { CapacitorConfig } from '@capacitor/cli';

const production = true;
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
  '@capacitor/network',
  '@capacitor/share',
  '@capacitor/splash-screen',
  '@capacitor/status-bar',
  'cordova-sqlite-storage',
];

const config: CapacitorConfig = {
  appId: 'net.sumaris.app',
  appName: 'SUMARiS',
  webDir: 'www',
  loggingBehavior: production ? 'none' : 'debug',
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
    includePlugins: [
      ...commonIncludePlugins,
      '@e-is/capacitor-bluetooth-serial',
      '@e-is/cordova-plugin-downloader',
      '@e-is/cordova-plugin-audiomanagement',
    ],
    webContentsDebuggingEnabled: !production,
  },
  ios: {
    includePlugins: [...commonIncludePlugins],
    webContentsDebuggingEnabled: !production,
  },
  server: {
    cleartext: true,
    androidScheme: 'http',
  },
};

export default config;
