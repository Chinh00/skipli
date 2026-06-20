import * as admin from 'firebase-admin';
import './env';

let db: admin.firestore.Firestore;
let firebaseAdmin: typeof admin | undefined;

try {
  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountString) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not defined in .env');
  }
  const serviceAccount = JSON.parse(serviceAccountString);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  db = admin.firestore();
  firebaseAdmin = admin;
} catch (error: any) {
  console.error('Firebase initialization failed:', error.message);
  // In a real application, you might want to exit the process if critical services fail
}

export { db, firebaseAdmin as admin };
