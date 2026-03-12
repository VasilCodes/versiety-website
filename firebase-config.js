// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA2tjyQY7r3Kq4btOq5I0as3sUaEarONos",
  authDomain: "cheat-cs2-zavko.firebaseapp.com",
  projectId: "cheat-cs2-zavko",
  storageBucket: "cheat-cs2-zavko.firebasestorage.app",
  messagingSenderId: "913357891348",
  appId: "1:913357891348:web:029253bacc4e5244214401",
  measurementId: "G-JL2H57PXR3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db, analytics };
