/**
 * Firebase Active Configuration — Zedecks IT
 * Substitua pelas credenciais obtidas no console.firebase.google.com
 */

export const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "ai-fj-subscript.firebaseapp.com",
  projectId: "ai-fj-subscript",
  storageBucket: "ai-fj-subscript.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:000000000000"
};

export const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey && !firebaseConfig.apiKey.includes("YOUR_FIREBASE_API_KEY");
};
