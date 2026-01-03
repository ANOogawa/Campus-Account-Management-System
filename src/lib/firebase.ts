
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let app: App;

if (getApps().length === 0) {
  // Production: Use Application Default Credentials (ADC) or service account from env
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    app = initializeApp();
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
     // Optional: For local dev with a specific key file content
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    app = initializeApp({
      credential: cert(serviceAccount),
    });
  } else {
      // Fallback or ADC
      app = initializeApp();
  }
} else {
  app = getApps()[0];
}

export const db = getFirestore(app);
