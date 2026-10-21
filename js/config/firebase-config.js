/**
 * Firebase Active Configuration — Zedecks IT
 * Substitua pelas credenciais obtidas no console.firebase.google.com
 */

const firebaseConfig = {
  apiKey: "AIzaSyAchV5ekzAN-YQ6niQWAYqu02CaN_CAYb0",
  authDomain: "fj-megason.firebaseapp.com",
  projectId: "fj-megason",
  storageBucket: "fj-megason.firebasestorage.app",
  messagingSenderId: "164495964021",
  appId: "1:164495964021:web:3ec8cfa5781b1d1de5853c",
  measurementId: "G-C9CHNRPMER"
};

export const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("YOUR_FIREBASE_API_KEY");
};
