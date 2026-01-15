"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithGoogle, getUserByUid, getUserByName, createUserInFirestore, saveUserToLocalStorage, isAdmin } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth";
import { User } from "@/types";
import { showToast } from "@/lib/toast";

export default function LoginPage() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();

  // Google 로그인 처리
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      const firebaseUser = result.user;
      
      // Firestore에서 사용자 정보 확인
      let userData = await getUserByUid(firebaseUser.uid);
      
      if (!userData) {
        // 신규 사용자 - Firestore에 등록
        await createUserInFirestore(
          firebaseUser.uid,
          firebaseUser.email || "",
          firebaseUser.displayName || "",
          firebaseUser.photoURL || undefined
        );
        userData = await getUserByUid(firebaseUser.uid);
        
        if (!userData) {
          showToast.error("회원 등록에 실패했습니다. 관리자에게 문의하세요.");
          setGoogleLoading(false);
          return;
        }
      }
      
      // 관리자 권한 확인
      const adminStatus = await isAdmin(firebaseUser.uid);
      
      // 로컬 스토리지에 저장
      saveUserToLocalStorage({ ...userData, isAdmin: adminStatus }, "google");
      
      if (adminStatus) {
        router.push("/admin");
      } else if (userData.isActive) {
        router.push("/dashboard");
      } else {
        alert("현재 활동 중인 회원이 아닙니다. 관리자에게 문의하세요.");
      }
    } catch (error: any) {
      console.error("Google login error:", error);
      showToast.error("로그인에 실패했습니다: " + (error.message || "알 수 없는 오류"));
    }
    setGoogleLoading(false);
  };

  // 이름 기반 로그인 (기존 호환성)
  const handleNameLogin = async () => {
    if (!name.trim()) return alert("이름을 입력해주세요.");

    // 관리자 키워드 확인
    if (name === "admin" || name === "admin1234") {
      router.push("/admin");
      return;
    }

    setLoading(true);

    try {
      const userData = await getUserByName(name.trim());

      if (!userData) {
        alert("등록된 회원이 아닙니다. (예: 정민우)");
        setLoading(false);
        return;
      }

      // 로컬 스토리지에 저장
      saveUserToLocalStorage(userData, "name");

      if (!userData.isActive) {
        alert("현재 활동 중인 회원이 아닙니다.");
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error(error);
      alert("시스템 오류가 발생했습니다.");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <h1 className="text-3xl font-bold text-center text-blue-600 mb-2">G-Bird</h1>
        <p className="text-center text-gray-500 mb-8">배드민턴 클럽 운영 플랫폼</p>
        
        <div className="space-y-4">
          {/* Google 로그인 */}
          <button
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="w-full bg-white border-2 border-gray-300 text-gray-700 py-4 rounded-lg font-bold hover:bg-gray-50 transition disabled:bg-gray-100 flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {googleLoading ? "로그인 중..." : "Google로 로그인"}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">또는</span>
            </div>
          </div>

          {/* 이름 기반 로그인 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">성명</label>
            <input
              type="text"
              placeholder="이름 입력 (관리자는 admin 입력)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNameLogin()}
              className="w-full p-4 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none text-black"
            />
          </div>
          <button 
            onClick={handleNameLogin}
            disabled={loading || googleLoading}
            className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold hover:bg-blue-700 transition disabled:bg-gray-400"
          >
            {loading ? "확인 중..." : "이름으로 입장하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
