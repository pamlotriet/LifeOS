import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lotriet.lifeos',
  appName: 'LifeOS',
  webDir: 'dist/lifeos/browser',
  zoomEnabled: false,
  plugins: {
    FirebaseAuthentication: {
      providers: ['google.com'],
    },
  },
};

export default config;
