// src/lib/firebase.js
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

let app;

if (!getApps().length) {
  app = initializeApp({
    apiKey: "AIzaSyD2115W7tFegmCB4YwCjwrSgzFaqvxVM0A",
    authDomain: "real-time-chat-applicati-72db3.firebaseapp.com",
    projectId: "real-time-chat-applicati-72db3",
    storageBucket: "real-time-chat-applicati-72db3.appspot.com",
    messagingSenderId: "177702262319",
    appId: "1:177702262319:web:19c9ac6634e76a0f0418da",
    measurementId: "G-BXM03TJS64",
  });
} else {
  app = getApps()[0];
}

const auth = getAuth(app);
const firestore = getFirestore(app);

export { app, auth, firestore };
