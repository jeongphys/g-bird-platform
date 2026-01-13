"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function Home() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!name.trim()) return alert("이름을 입력해주세요.");

    // [추가된 부분] 관리자 키워드 입력 시 바로 관리자 페이지로 이동
    if (name === "admin" || name === "admin1234") {
      router.push("/admin");
      return;
    }

    setLoading(true);

    try {
      // 일반 회원 로그인 로직 (기존과 동일)
      const userRef = doc(db, "users", name.trim());
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        
        localStorage.setItem("userName", userData.name);
        localStorage.setItem("shuttleDiscount", userData.shuttleDiscount || 0);
        
        if (!userData.isActive) {
          alert("현재 활동 중인 회원이 아닙니다.");
        } else {
          router.push("/purchase");
        }
      } else {
        alert("등록된 회원이 아닙니다. (예: 정민우)");
      }
    } catch (error) {
      console.error(error);
      alert("시스템 오류가 발생했습니다.");
    }
    setLoading(false);
  };

  return (
    // ... (아래 화면 코드는 기존과 동일하니 건드리지 마세요)
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <h1 className="text-3xl font-bold text-center text-blue-600 mb-2">G-Bird</h1>
        <p className="text-center text-gray-500 mb-8">배드민턴 클럽 운영 플랫폼</p>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">성명</label>
            <input
              type="text"
              placeholder="이름 입력 (관리자는 admin 입력)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="w-full p-4 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none text-black"
            />
          </div>
          <button 
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold hover:bg-blue-700 transition disabled:bg-gray-400"
          >
            {loading ? "확인 중..." : "입장하기"}
          </button>
        </div>
      </div>
    </div>
  );
}