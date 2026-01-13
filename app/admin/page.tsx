// app/admin/page.tsx
"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, writeBatch, orderBy, getDoc } from "firebase/firestore";

export default function AdminPage() {
  // 1. 상태 관리
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 2. 관리자 로그인 (임시 비밀번호: admin1234)
  const handleLogin = () => {
    if (password === "admin1234") {
      setIsAdmin(true);
      fetchOrders();
    } else {
      alert("비밀번호가 틀렸습니다.");
    }
  };

  // 3. 주문 목록 불러오기 (대기중인 것만)
  const fetchOrders = async () => {
    setLoading(true);
    try {
      // status가 'pending'인 주문만 가져오기
      const q = query(
        collection(db, "orders"),
        where("status", "==", "pending")
        // orderBy("createdAt", "desc") // 인덱스 에러 방지를 위해 일단 제외 (필요시 추가 설정)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // 최신순 정렬 (클라이언트 측에서 수행)
      list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setOrders(list);
    } catch (e) {
      console.error(e);
      alert("데이터를 불러오는데 실패했습니다.");
    }
    setLoading(false);
  };

  // 4. 승인 처리 (입금 확인 완료)
  const handleApprove = async (orderId: string) => {
    if (!confirm("입금이 확인되었습니까? 승인하시겠습니까?")) return;
    
    try {
      const batch = writeBatch(db);
      const orderRef = doc(db, "orders", orderId);
      
      // 주문 상태를 'approved'로 변경
      batch.update(orderRef, { status: "approved", approvedAt: new Date().toISOString() });
      
      await batch.commit();
      alert("승인되었습니다.");
      fetchOrders(); // 목록 새로고침
    } catch (e) {
      alert("처리 실패");
    }
  };

  // 5. 반려 처리 (재고 복구)
  const handleReject = async (order: any) => {
    const reason = prompt("반려 사유를 입력해주세요 (예: 미입금, 중복신청)");
    if (!reason) return;

    try {
      const batch = writeBatch(db);
      
      // A. 주문 상태 'rejected'로 변경
      const orderRef = doc(db, "orders", order.id);
      batch.update(orderRef, { status: "rejected", rejectReason: reason });

      // B. 묶여있던 재고(inventory) 다시 풀기 (isSold = false)
      // order.items 에는 ["1-1", "1-2"] 같은 ID들이 들어있음
      for (const itemId of order.items) {
        const itemRef = doc(db, "inventory", itemId);
        batch.update(itemRef, { isSold: false, soldTo: null });
      }

      await batch.commit();
      alert("반려 및 재고 복구가 완료되었습니다.");
      fetchOrders();
    } catch (e) {
      console.error(e);
      alert("처리 중 오류가 발생했습니다.");
    }
  };

  // --- 화면 렌더링 ---

  // A. 로그인 전 화면
  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded shadow-md text-center">
          <h1 className="text-xl font-bold mb-4">관리자 접속</h1>
          <input 
            type="password" 
            placeholder="비밀번호 입력"
            className="border p-2 rounded mb-2 w-full text-black"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          <button onClick={handleLogin} className="bg-gray-800 text-white px-4 py-2 rounded w-full">
            접속
          </button>
        </div>
      </div>
    );
  }

  // B. 관리자 대시보드 화면
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">🛠 관리자 대시보드</h1>
          <button onClick={fetchOrders} className="text-sm bg-white border px-3 py-1 rounded">
            새로고침
          </button>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b bg-gray-50 font-bold flex justify-between">
            <span>입금 대기 목록 ({orders.length}건)</span>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">로딩 중...</div>
          ) : orders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">대기 중인 주문이 없습니다.</div>
          ) : (
            <ul>
              {orders.map((order) => (
                <li key={order.id} className="border-b last:border-0 p-4 hover:bg-gray-50 transition">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-bold text-lg text-blue-700 mr-2">{order.userName}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="font-bold text-lg">
                      {order.totalPrice?.toLocaleString()}원
                    </div>
                  </div>

                  <div className="bg-gray-100 p-2 rounded text-sm mb-3">
                    <span className="font-bold text-gray-600 mr-2">주문상품:</span>
                    {order.items?.join(", ")} 
                    <span className="text-gray-400 ml-2">({order.items?.length}개)</span>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button 
                      onClick={() => handleReject(order)}
                      className="px-4 py-2 border border-red-200 text-red-600 rounded hover:bg-red-50 text-sm font-bold"
                    >
                      반려 (재고복구)
                    </button>
                    <button 
                      onClick={() => handleApprove(order.id)}
                      className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-bold"
                    >
                      승인 (입금확인)
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
