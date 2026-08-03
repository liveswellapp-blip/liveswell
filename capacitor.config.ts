import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.liveswell.app',
  appName: 'LiveSwell',
  webDir: 'dist/public',

  server: {
    // Points the native shell to the live production web app.
    // Remove this line to bundle the web app inside the binary instead.
    url: 'https://liveswell.io',
    cleartext: false,
  },

  ios: {
    // Respect the iPhone notch / Dynamic Island safe area
    contentInset: 'always',
    // Allow the WKWebView to scroll to the top via status-bar tap
    scrollEnabled: true,
    // Background color shown while the WebView is loading
    backgroundColor: '#0d1f3c',
  },

  plugins: {
    PushNotifications: {
      // Show alert banner, badge count, and play sound when app is in foreground
      presentationOptions: ['alert', 'badge', 'sound'],
    },

    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#0d1f3c',
      iosSpinnerStyle: 'small',
      spinnerColor: '#10b981',
      showSpinner: false,
    },

    StatusBar: {
      style: 'dark',
      backgroundColor: '#0d1f3c',
    },
  },
};

export default config;
