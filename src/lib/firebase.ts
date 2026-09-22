import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Connectivity validation as mandated by skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'settings', 'connection-test'));
  } catch (error: any) {
    if (error && error.message && error.message.includes('the client is offline')) {
      console.warn('Firebase Firestore: client is currently offline or connecting...');
    }
  }
}
testConnection();
