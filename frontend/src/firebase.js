import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || "AIzaSyC5dsgxb4OvGPDnoh40K4hJFBqOWPWCWCY",
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || "greenbuddy-ai.firebaseapp.com",
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || "greenbuddy-ai",
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || "greenbuddy-ai.firebasestorage.app",
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "357620780954",
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || "1:357620780954:web:1c0f7f8847e7a0ffde7423",
  measurementId: import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID || "G-MCB6T2VBZB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore
export const db = getFirestore(app);

// Initialize Firebase Analytics (guarded for environments that support it)
export let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {});
}

export { app };
export default app;

