import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Use initializeFirestore to enable Long Polling if standard gRPC fails
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};

// Test connection
async function testConnection() {
  try {
    // Attempt a real fetch to verify backend connectivity
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.info("Firebase: Connection established successfully.");
  } catch (error: any) {
    if (error?.code === 'unavailable' || error?.message?.includes('offline')) {
      console.warn("Firebase: Operation could not be completed. The client will operate in offline mode or retry.");
    } else {
      console.error("Firebase: Unexpected connection error", error);
    }
  }
}
testConnection();
