import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  addDoc,
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js";
import { sportsPlatformFirebaseConfig, isSportsPlatformFirebaseConfigured } from "./sports-platform-firebase-config.js";

let app;
let auth;
let db;

if (isSportsPlatformFirebaseConfigured) {
  app = initializeApp(sportsPlatformFirebaseConfig, "nxt-gen-sports-platform");
  auth = getAuth(app);
  db = getFirestore(app);
}

export {
  auth,
  db,
  isSportsPlatformFirebaseConfigured,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  addDoc,
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
};