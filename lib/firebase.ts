// lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// G-Bird Platform Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyB-is1dk1guXKyuoOtBaRUGslHm83q44YU",
  authDomain: "g-bird-platform.firebaseapp.com",
  projectId: "g-bird-platform",
  storageBucket: "g-bird-platform.firebasestorage.app",
  messagingSenderId: "232822964557",
  appId: "1:232822964557:web:0025de008149297e923704"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);