"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getUserByName, saveUserToLocalStorage } from "@/lib/auth";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  // 이름 기반 로그인
  const handleNameLogin = async () => {
    if (!name.trim()) {
      alert("이름을 입력해주세요.");
      return;
    }

    // 관리자 키워드 확인 - 비밀번호 입력을 위해 /admin으로 리다이렉트
    if (name === "admin" || name === "admin1234") {
      saveUserToLocalStorage(
        { id: "admin", name: "admin", isAdmin: true, isActive: true, shuttleDiscount: 0, attendanceScore: 0 },
        "name"
      );
      router.push("/admin");
      return;
    }

    setLoading(true);

    try {
      const userData = await getUserByName(name.trim());

      if (!userData) {
        alert("등록된 회원이 아닙니다.");
        setLoading(false);
        return;
      }

      // 로컬 스토리지에 저장
      saveUserToLocalStorage(userData, "name");

      if (!userData.isActive) {
        alert("현재 활동 중인 회원이 아닙니다.");
        setLoading(false);
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error(error);
      alert("시스템 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <h1 className="text-3xl font-bold text-center text-blue-600 mb-8">G-Bird</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">성명</label>
            <input
              type="text"
              placeholder="이름을 입력하세요"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleNameLogin()}
              className="w-full p-4 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none text-black"
              autoFocus
            />
          </div>
          <button 
            onClick={handleNameLogin}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold hover:bg-blue-700 transition disabled:bg-gray-400"
          >
            {loading ? "확인 중..." : "로그인"}
          </button>
        </div>
      </div>
    </div>
  );
}