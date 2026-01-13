// app/admin/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminHub() {
  const [password, setPassword] = useState("");
  const [isAuth, setIsAuth] = useState(false);
  const router = useRouter();

  const handleLogin = () => {
    if (password === "admin1234") {
      setIsAuth(true);
      // 로그인 상태 유지 (세션 스토리지 등)는 생략하고 간단히 구현
      sessionStorage.setItem("adminAuth", "true");
    } else {
      alert("비밀번호가 틀렸습니다.");
    }
  };

  // 로그인 전
  if (!isAuth) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold mb-6 text-blue-900">G-Bird Admin</h1>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} 
            className="border p-4 mb-4 w-full rounded-lg text-lg text-black" placeholder="비밀번호" 
            onKeyDown={e=>e.key==='Enter' && handleLogin()} />
          <button onClick={handleLogin} className="bg-blue-800 text-white w-full py-4 rounded-lg font-bold text-lg">접속</button>
        </div>
      </div>
    );
  }

  // 로그인 후 (메뉴판)
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <h1 className="text-2xl font-bold text-center mb-8 text-gray-800">관리자 메뉴</h1>
      
      <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
        <MenuCard title="📋 출석·회원" desc="활동정보 및 학기 관리" onClick={() => router.push("/admin/attendance")} color="bg-blue-600" />
        <MenuCard title="💰 회계·재고" desc="셔틀콕 주문 및 재고" onClick={() => router.push("/admin/accounting")} color="bg-green-600" />
        <MenuCard title="🏸 경기 운영" desc="(준비중)" onClick={() => router.push("/admin/game")} color="bg-gray-400" />
        <MenuCard title="🎓 레슨 관리" desc="(준비중)" onClick={() => router.push("/admin/lesson")} color="bg-gray-400" />
      </div>
    </div>
  );
}

function MenuCard({ title, desc, onClick, color }: any) {
  return (
    <div onClick={onClick} className={`${color} text-white p-6 rounded-xl shadow-lg cursor-pointer hover:opacity-90 transition flex flex-col items-center justify-center h-40`}>
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      <p className="text-xs opacity-80">{desc}</p>
    </div>
  );
}