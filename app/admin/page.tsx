// app/admin/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUserFromLocalStorage, getCurrentUser, isAdmin, signOut } from "@/lib/auth";
import AuthGuard from "@/app/components/AuthGuard";

export default function AdminHub() {
  const [password, setPassword] = useState("");
  const [isAuth, setIsAuth] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAdminAuth = async () => {
      const { userName, userId, authMethod } = getUserFromLocalStorage();
      const firebaseUser = getCurrentUser();
      
      // 세션 스토리지 확인 (비밀번호 인증 완료 여부)
      const sessionAuth = sessionStorage.getItem("adminAuth");
      
      // 세션 인증이 있으면 통과 (비밀번호 입력 완료)
      if (sessionAuth === "true") {
        setIsAuth(true);
        setChecking(false);
        return;
      }
      
      // admin 이름으로 로그인했지만 비밀번호 입력 전이면 비밀번호 입력 화면 표시
      if (userName === "admin" || userName === "admin1234" || userId === "admin" || userId === "admin1234") {
        setIsAuth(false); // 비밀번호 입력 필요
        setChecking(false);
        return;
      }
      
      // Firebase Auth 사용자이고 관리자 권한 확인
      if (firebaseUser) {
        const adminStatus = await isAdmin(firebaseUser.uid);
        if (adminStatus) {
          // Firebase 관리자도 비밀번호 입력 필요
          setIsAuth(false);
        }
      }
      
      setChecking(false);
    };
    
    checkAdminAuth();
  }, []);

  const handleLogin = () => {
    if (password === "admin1234") {
      setIsAuth(true);
      sessionStorage.setItem("adminAuth", "true");
    } else {
      alert("비밀번호가 틀렸습니다.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      sessionStorage.removeItem("adminAuth");
      localStorage.clear();
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // 로딩 중
  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">확인 중...</p>
        </div>
      </div>
    );
  }

  // 로그인 전
  if (!isAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold mb-6 text-blue-900">G-Bird Admin</h1>
          <input 
            type="password" 
            value={password} 
            onChange={e=>setPassword(e.target.value)} 
            className="border p-4 mb-4 w-full rounded-lg text-lg text-black" 
            placeholder="비밀번호" 
            onKeyDown={e=>e.key==='Enter' && handleLogin()} 
          />
          <button 
            onClick={handleLogin} 
            className="bg-blue-800 text-white w-full py-4 rounded-lg font-bold text-lg hover:bg-blue-900"
          >
            접속
          </button>
          <button 
            onClick={() => router.push("/")} 
            className="mt-2 text-sm text-gray-500 hover:text-gray-700"
          >
            일반 로그인으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 로그인 후 (메뉴판)
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="flex justify-between items-center mb-8 max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-gray-800">관리자 메뉴</h1>
        <button 
          onClick={handleLogout}
          className="text-sm bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
        >
          로그아웃
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
        <MenuCard title="📋 출석" desc="학기별 출석 관리" onClick={() => router.push("/admin/attendance")} color="bg-blue-600" />
        <MenuCard title="👥 회원" desc="회원 관리 및 활동정보" onClick={() => router.push("/admin/members")} color="bg-purple-600" />
        <MenuCard title="💰 회계·재고" desc="셔틀콕 주문 및 재고" onClick={() => router.push("/admin/accounting")} color="bg-green-600" />
        <MenuCard title="🏸 경기 운영" desc="(준비중)" onClick={() => router.push("/admin/game")} color="bg-gray-400" />
        <MenuCard title="🎓 레슨 관리" desc="(준비중)" onClick={() => router.push("/admin/lesson")} color="bg-gray-400" />
      </div>
    </div>
  );
}

interface MenuCardProps {
  title: string;
  desc: string;
  onClick: () => void;
  color: string;
}

function MenuCard({ title, desc, onClick, color }: MenuCardProps) {
  return (
    <div onClick={onClick} className={`${color} text-white p-6 rounded-xl shadow-lg cursor-pointer hover:opacity-90 transition flex flex-col items-center justify-center h-40`}>
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      <p className="text-xs opacity-80">{desc}</p>
    </div>
  );
}