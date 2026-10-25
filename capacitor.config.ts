import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.evalscan.app',
  appName: 'EvalScan',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
