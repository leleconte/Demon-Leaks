/*
  DEMON LEAKS — FIREBASE CONFIG
  Configurazione Web App Firebase fornita dalla console Firebase.
  La Staff Zone importa autonomamente Firebase Auth e Firestore:
  NON inserire qui import { initializeApp } ... e NON chiamare initializeApp().
*/
window.DEMON_FIREBASE = {
  ENABLED: true,

  ADMIN_EMAIL: "demonleaks@gmail.com",

  // Backend serverless Demon Leaks.
  // Dopo il deploy del Worker sostituisci questo valore.
  DISCORD_AUTH_BASE_URL: "https://demon-leaks.contepierraffaele.workers.dev",

  SITE_URL: "https://demonleaks.xyz",

  // Linkvertise Publisher ID.
  LINKVERTISE_PUBLISHER_ID: 8419880,

  // Modalità richiesta: al primo segnale sospetto il Worker nega,
  // blocca il Discord ID e invia il Security Log.
  STRICT_ANTIBYPASS: true,

  CONFIG: {
    apiKey: "AIzaSyBOLItgYQCY96OEFM--83ERiuFJSo8lzPo",
    authDomain: "demon-leaks.firebaseapp.com",
    projectId: "demon-leaks",
    storageBucket: "demon-leaks.firebasestorage.app",
    messagingSenderId: "413320240424",
    appId: "1:413320240424:web:081dec1bd3adc1c70c441d",
    measurementId: "G-R7DNMCJXH5"
  }
};
