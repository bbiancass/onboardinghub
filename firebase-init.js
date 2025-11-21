// firebase-init.js

// Import the function you need from the core 'firebase/app' module
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration (copy from the Firebase Console)
const firebaseConfig = {
    apiKey: "AIzaSyA6bBl5akHrpzes9aggnX3SBCXZbg1DqgA",
    authDomain: "transferz-onboarding-hub.firebaseapp.com",
    projectId: "transferz-onboarding-hub",
    storageBucket: "transferz-onboarding-hub.firebasestorage.app",
    messagingSenderId: "342428388670",
    appId: "1:342428388670:web:3ce08e882e54de7ac3b06f",
    measurementId: "G-T3KYGVD4PZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Initialize Services
const auth = getAuth(app);
const db = getFirestore(app);

console.log("Firebase App Initialized!");
console.log("Auth Service Initialized!");
console.log("Firestore Service Initialized!");

// Export the app instance or any other services you set up
export { app, auth, db };