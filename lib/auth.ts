// lib/auth.ts
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  User as FirebaseUser,
  onAuthStateChanged,
  UserCredential
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import { User } from "@/types";

const provider = new GoogleAuthProvider();

/**
 * Google 로그인
 */
export async function signInWithGoogle(): Promise<UserCredential> {
  return await signInWithPopup(auth, provider);
}

/**
 * 로그아웃
 */
export async function signOut(): Promise<void> {
  return await firebaseSignOut(auth);
}

/**
 * 현재 로그인한 사용자 정보 가져오기
 */
export function getCurrentUser(): FirebaseUser | null {
  return auth.currentUser;
}

/**
 * 인증 상태 변경 감지
 */
export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Firestore에서 사용자 정보 가져오기 (이름 기반)
 */
export async function getUserByName(name: string): Promise<User | null> {
  try {
    const userRef = doc(db, "users", name.trim());
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() } as User;
    }
    return null;
  } catch (error) {
    console.error("Error getting user by name:", error);
    return null;
  }
}

/**
 * Firestore에서 사용자 정보 가져오기 (UID 기반)
 */
export async function getUserByUid(uid: string): Promise<User | null> {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() } as User;
    }
    return null;
  } catch (error) {
    console.error("Error getting user by uid:", error);
    return null;
  }
}

/**
 * 신규 사용자 Firestore에 등록
 */
export async function createUserInFirestore(
  uid: string,
  email: string,
  displayName: string,
  photoURL?: string
): Promise<void> {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      name: displayName,
      email: email,
      isActive: false, // 관리자가 활성화해야 함
      shuttleDiscount: 0,
      attendanceScore: 0,
      history: {},
      photoURL: photoURL || null,
      isAdmin: false,
      createdAt: new Date().toISOString()
    });
  }
}

/**
 * 관리자 권한 확인
 */
export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const user = await getUserByUid(userId);
    if (!user) {
      // 이름 기반 로그인인 경우
      const userByName = await getUserByName(userId);
      return userByName?.isAdmin === true || userId === "admin" || userId === "admin1234";
    }
    return user.isAdmin === true;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}

/**
 * 로컬 스토리지에 사용자 정보 저장 (기존 호환성)
 */
export function saveUserToLocalStorage(user: User, authMethod: "google" | "name" = "name"): void {
  localStorage.setItem("userName", user.name);
  localStorage.setItem("userId", user.id);
  localStorage.setItem("authMethod", authMethod);
  localStorage.setItem("shuttleDiscount", String(user.shuttleDiscount || 0));
  if (user.email) {
    localStorage.setItem("userEmail", user.email);
  }
  if (user.photoURL) {
    localStorage.setItem("userPhotoURL", user.photoURL);
  }
}

/**
 * 로컬 스토리지에서 사용자 정보 가져오기
 */
export function getUserFromLocalStorage(): { 
  userName: string | null; 
  userId: string | null;
  authMethod: "google" | "name" | null;
} {
  return {
    userName: localStorage.getItem("userName"),
    userId: localStorage.getItem("userId"),
    authMethod: (localStorage.getItem("authMethod") as "google" | "name" | null) || "name"
  };
}

/**
 * 로컬 스토리지 초기화
 */
export function clearLocalStorage(): void {
  localStorage.removeItem("userName");
  localStorage.removeItem("userId");
  localStorage.removeItem("authMethod");
  localStorage.removeItem("shuttleDiscount");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userPhotoURL");
}
