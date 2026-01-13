// lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// [중요] 본인의 Firebase 콘솔 설정값으로 교체
const firebaseConfig = {
  apiKey: "AIzaSyAlHDd0kqPbvJ-Pm7TavD1U5TYSoe0TNU0",
  authDomain: "gbird-feb78.firebaseapp.com",
  projectId: "gbird-feb78",
  storageBucket: "gbird-feb78.firebasestorage.app",
  messagingSenderId: "489327700831",
  appId: "1:489327700831:web:049e990b3902f7e692e4ea"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
