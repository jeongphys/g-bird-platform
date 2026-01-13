"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query } from "firebase/firestore";
import StockSelector from "@/app/components/StockSelector"; // 방금 만든 부품 가져오기

export default function PurchasePage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. 로그인 체크
    const storedName = localStorage.getItem("userName");
    if (!storedName) {
      alert("로그인이 필요합니다.");
      window.location.href = "/";
      return;
    }
    setUserName(storedName);

    // 2. 재고 실시간 구독 (누가 사면 내 화면도 바로 바뀜!)
    const q = query(collection(db, "inventory"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => d.data()).sort((a: any, b: any) => {
        // 박스 번호 -> 번호 순 정렬
        if (a.box !== b.box) return a.box - b.box;
        return a.number - b.number;
      });
      setInventory(list);
      setLoading(false);
    });

    return () => unsubscribe(); // 페이지 나갈 때 연결 끊기
  }, []);

  if (loading) return <div className="p-8 text-center">재고 불러오는 중...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">🏸 셔틀콕 구매</h1>
          <div className="text-right">
            <span className="block text-sm text-gray-500">접속자</span>
            <span className="font-bold text-blue-600">{userName}</span>
          </div>
        </div>

        {/* 여기에 핵심 부품 장착 */}
        <StockSelector inventory={inventory} userName={userName} />

        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          <p className="font-bold mb-1">📢 필독 사항</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>박스 번호 순서대로만 구매 가능합니다.</li>
            <li>구매 신청 후 취소는 불가하니 신중히 선택해주세요.</li>
            <li>신청 후 총무 계좌로 입금해주셔야 승인됩니다.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}