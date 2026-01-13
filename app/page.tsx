"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase"; // src 없이 경로 지정
import { doc, getDoc } from "firebase/firestore";

export default function Home() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!name.trim()) return alert("이름을 입력해주세요.");
    setLoading(true);

    try {
      // 입력한 이름으로 DB 조회 (예: '정민우')
      const userRef = doc(db, "users", name.trim());
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        
        // 브라우저에 임시 저장 (이름, 할인액 등)
        localStorage.setItem("userName", userData.name);
        localStorage.setItem("shuttleDiscount", userData.shuttleDiscount || 0);
        
        // 활동 회원이 아니면 경고 (선택사항)
        if (!userData.isActive) {
          alert("현재 활동 중인 회원이 아닙니다.");
        } else {
          router.push("/purchase"); // 구매 페이지로 이동
        }
      } else {
        alert("등록된 회원이 아닙니다. (예: 홍길동(물리))");
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">성명</label>
            <input
              type="text"
              placeholder="예: 정민우"
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