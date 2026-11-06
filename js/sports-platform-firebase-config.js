// Firebase Web App configuration for the NXT Gen Sports Platform.
// This is separate from the keynote booking system project.
// Target project ID: nxt-gen-sports-platform
// Browser Firebase config is public by design, but never add service-account JSON,
// Admin SDK keys, private keys, passwords, tokens, or server secrets here.
export const sportsPlatformFirebaseConfig = {
  apiKey: "AIzaSyDnQ0TlCNQzQtgxlAL-342WfnNKUHmgtks",
  authDomain: "nxt-gen-sports-platform.firebaseapp.com",
  projectId: "nxt-gen-sports-platform",
  storageBucket: "nxt-gen-sports-platform.firebasestorage.app",
  messagingSenderId: "901119488696",
  appId: "1:901119488696:web:27a810259f498e39d6ba4d",
  measurementId: "G-3HV5QD2X8X"
};

export const isSportsPlatformFirebaseConfigured = Object.values(sportsPlatformFirebaseConfig).every(
  value => typeof value === "string" && value && !value.startsWith("REPLACE_WITH_")
);