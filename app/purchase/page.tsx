"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query } from "firebase/firestore";

export default function PurchasePage() {
  const [inventory, setInventory] = useState<any[]>([]);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    // 1. 입장한 사용자 이름 가져오기
    const storedName = localStorage.getItem("userName");
    if (!storedName) {
      alert("로그인이 필요합니다.");
      window.location.href = "/"; // 메인으로 쫓아내기
      return;
    }
    setUserName(storedName);

    // 2. 재고 리스트 가져오기
    const fetchInventory = async () => {
      const q = query(collection(db, "inventory"));
      const snap = await getDocs(q);
      
      // 박스 번호(box) -> 낱개 번호(number) 순서로 정렬
      const list = snap.docs.map(d => d.data()).sort((a: any, b: any) => {
        if (a.box !== b.box) return a.box - b.box;
        return a.number - b.number;
      });
      setInventory(list);
    };
    fetchInventory();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">🏸 셔틀콕 구매</h1>
          <span className="text-blue-600 font-medium">환영합니다, {userName}님</span>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-bold mb-4">재고 현황</h2>
          <div className="grid grid-cols-5 gap-2 md:grid-cols-10">
            {inventory.map((item) => (
              <div 
                key={item.id} 
                className={`
                  p-2 border rounded text-center text-sm cursor-pointer transition
                  ${item.isSold ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'hover:border-blue-500 hover:text-blue-600'}
                `}
              >
                <div className="text-xs text-gray-500">{item.box}번 BOX</div>
                <div className="font-bold text-lg">{item.number}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}