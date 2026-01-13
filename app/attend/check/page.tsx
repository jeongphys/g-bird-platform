"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

// 기기 식별 ID 생성기 (브라우저 로컬스토리지에 영구 저장)
function getDeviceId() {
  if (typeof window === 'undefined') return "unknown";
  let id = localStorage.getItem("device_id");
  if (!id) {
    id = Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem("device_id", id);
  }
  return id;
}

function CheckContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const date = searchParams.get("date");

  const [status, setStatus] = useState("ready"); // ready, loading, success, fail
  const [msg, setMsg] = useState("");
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  const handleCheckIn = async () => {
    const userName = localStorage.getItem("userName");
    if (!userName) {
      alert("로그인이 필요합니다. 메인화면에서 이름을 입력해주세요.");
      router.push("/");
      return;
    }

    if (!code || !date) {
      setStatus("fail");
      setMsg("잘못된 QR 코드입니다.");
      return;
    }

    setStatus("loading");
    const deviceId = getDeviceId();

    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName, code, date, deviceId }),
      });

      const data = await res.json();

      if (data.success) {
        setStatus("success");
        setMsg(`${userName}님 출석 완료!`);
        if (data.warning) setWarningMsg(data.warning);
      } else {
        setStatus("fail");
        setMsg(data.message || "출석 처리에 실패했습니다.");
      }
    } catch (e) {
      setStatus("fail");
      setMsg("네트워크 오류가 발생했습니다.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 text-center">
      {status === "ready" && (
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
          <h1 className="text-xl font-bold mb-4">🏸 G-Bird 출석 체크</h1>
          <p className="text-gray-600 mb-8">아래 버튼을 누르면 출석이 인정됩니다.</p>
          <button 
            onClick={handleCheckIn}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 shadow-lg transform transition active:scale-95"
          >
            출석하기
          </button>
        </div>
      )}

      {status === "loading" && (
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mb-6"></div>
          <h2 className="text-lg font-bold text-gray-600">처리 중입니다...</h2>
        </div>
      )}

      {status === "success" && (
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm border-t-4 border-green-500">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-600 mb-2">출석 완료!</h2>
          <p className="text-gray-800 text-lg font-medium">{msg}</p>
          
          {warningMsg && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded font-bold">
              ⚠ {warningMsg}
            </div>
          )}
          
          <div className="mt-6 p-4 bg-gray-100 rounded-lg text-sm text-gray-600">
            오늘도 즐거운 운동 되세요! 🏸
          </div>
          <button onClick={() => router.push("/")} className="mt-6 w-full py-3 border rounded text-gray-500 hover:bg-gray-50">홈으로 이동</button>
        </div>
      )}

      {status === "fail" && (
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm border-t-4 border-red-500">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-red-600 mb-2">출석 실패</h2>
          <p className="text-gray-600 mb-6">{msg}</p>
          <button onClick={() => setStatus("ready")} className="w-full bg-gray-200 text-gray-800 py-3 rounded-lg font-bold hover:bg-gray-300">
            다시 시도하기
          </button>
        </div>
      )}
    </div>
  );
}

export default function CheckPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CheckContent />
    </Suspense>
  );
}
