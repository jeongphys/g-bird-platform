// app/admin/accounting/page.tsx
"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, writeBatch, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function AccountingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("orders"); // orders | inventory

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 상단 네비게이션 */}
      <div className="bg-white p-4 shadow sticky top-0 z-10">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => router.push("/admin")} className="text-gray-500 font-bold">← 메뉴</button>
          <h1 className="text-xl font-bold">회계/재고 관리</h1>
          <div className="w-10"></div> {/* 레이아웃 균형용 공백 */}
        </div>

        {/* 탭 버튼 */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex-1 py-2 rounded-lg font-bold text-sm transition ${
              activeTab === "orders" ? "bg-green-600 text-white shadow" : "bg-gray-100 text-gray-600"
            }`}
          >
            🛒 주문 승인
          </button>
          <button
            onClick={() => setActiveTab("inventory")}
            className={`flex-1 py-2 rounded-lg font-bold text-sm transition ${
              activeTab === "inventory" ? "bg-blue-600 text-white shadow" : "bg-gray-100 text-gray-600"
            }`}
          >
            📦 재고 현황
          </button>
        </div>
      </div>

      {/* 본문 콘텐츠 */}
      <div className="p-4 max-w-4xl mx-auto">
        {activeTab === "orders" ? <OrderManager /> : <InventoryManager />}
      </div>
    </div>
  );
}

// ============================================================================
// 1. 주문 관리 컴포넌트 (승인/반려)
// 
// 기능:
// - pending 상태의 주문 목록 조회
// - 입금 확인 후 주문 승인 (재고 차감 확정)
// - 주문 반려 (재고는 이미 차감되지 않았으므로 복구 불필요)
// ============================================================================
function OrderManager() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 대기중(pending)인 주문만 불러오기
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "orders"), where("status", "==", "pending"));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // 최신순 정렬 (createdAt 문자열 기준)
      list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(list);
    } catch (e) {
      console.error(e);
      alert("주문 목록을 불러오지 못했습니다.");
    }
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  /**
   * 주문 승인 처리
   * 
   * 프로세스:
   * 1. 주문 상태를 "approved"로 변경
   * 2. 재고 차감 (isSold: true, soldTo: userName)
   * 
   * 중요: 구매 신청 시점에는 재고를 차감하지 않았으므로,
   * 승인 시점에 재고를 차감하여 확정합니다.
   */
  const handleApprove = async (order: any) => {
    if(!confirm("입금 확인 완료? 승인하시겠습니까?")) return;
    try {
      const batch = writeBatch(db);
      
      // 1. 주문 상태 변경
      batch.update(doc(db, "orders", order.id), { 
        status: "approved", 
        approvedAt: new Date().toISOString() 
      });

      // 2. 재고 차감 (승인 시 확정)
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((itemId: string) => {
          const itemRef = doc(db, "inventory", itemId);
          batch.update(itemRef, { 
            isSold: true, 
            soldTo: order.userName 
          });
        });
      }

      await batch.commit();
      alert("승인되었습니다. 재고가 차감되었습니다.");
      fetchOrders();
    } catch(e) {
      console.error(e);
      alert("처리 실패");
    }
  };

  /**
   * 주문 반려 처리
   * 
   * 프로세스:
   * 1. 주문 상태를 "rejected"로 변경
   * 2. 반려 사유 기록
   * 
   * 중요: 구매 신청 시점에 재고를 차감하지 않았으므로,
   * 반려 시 재고 복구가 필요하지 않습니다.
   */
  const handleReject = async (order: any) => {
    const reason = prompt("반려 사유를 입력하세요 (예: 미입금, 중복주문)");
    if(!reason) return;

    try {
      // 주문 상태만 변경 (재고는 이미 차감되지 않았으므로 복구 불필요)
      await updateDoc(doc(db, "orders", order.id), { 
        status: "rejected", 
        rejectReason: reason 
      });

      alert("반려 처리되었습니다.");
      fetchOrders();
    } catch (e) {
      console.error(e);
      alert("오류가 발생했습니다.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-gray-700">입금 대기 목록 ({orders.length}건)</h2>
        <button onClick={fetchOrders} className="text-sm bg-white border px-3 py-1 rounded">새로고침</button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">로딩 중...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-lg border border-dashed text-gray-400">
          대기 중인 주문이 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => (
            <div key={order.id} className="bg-white p-4 rounded-lg shadow border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-bold text-lg text-blue-800">{order.userName}</div>
                  <div className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-red-600 text-lg">
                    {order.totalPrice?.toLocaleString()}원
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-2 rounded text-sm mb-3">
                <span className="font-bold mr-2">주문내역:</span>
                {order.items?.join(", ")}
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={() => handleReject(order)} 
                  className="flex-1 border border-red-200 text-red-600 py-2 rounded font-bold text-sm hover:bg-red-50"
                >
                  반려
                </button>
                <button 
                  onClick={() => handleApprove(order)} 
                  className="flex-1 bg-blue-600 text-white py-2 rounded font-bold text-sm hover:bg-blue-700"
                >
                  승인 (입금확인)
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 2. 재고 관리 컴포넌트
// ============================================================================
function InventoryManager() {
  const [stock, setStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStock = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, "inventory"));
    const list = snap.docs.map(d => d.data());
    // 정렬: 박스 -> 번호
    list.sort((a: any, b: any) => (a.box - b.box) || (a.number - b.number));
    setStock(list);
    setLoading(false);
  };

  useEffect(() => { fetchStock(); }, []);

  // 전체 초기화 (학기초 리셋용)
  const resetStock = async () => {
    const code = prompt("정말 초기화하려면 '초기화'라고 입력하세요.\n(주의: 모든 셔틀콕이 판매 가능 상태로 바뀝니다)");
    if (code !== "초기화") return;

    setLoading(true);
    const batch = writeBatch(db);
    stock.forEach(item => {
      // isSold가 true인 것만 되돌려도 되지만, 안전하게 전체 갱신
      batch.update(doc(db, "inventory", item.id), { isSold: false, soldTo: null });
    });
    await batch.commit();
    alert("모든 재고가 초기화되었습니다.");
    fetchStock();
  };

  const soldCount = stock.filter(i => i.isSold).length;

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4 border-b pb-4">
        <div>
          <h2 className="font-bold">재고 현황판</h2>
          <p className="text-xs text-gray-500">
            총 {stock.length}개 중 <span className="text-red-500 font-bold">{soldCount}개 판매됨</span>
          </p>
        </div>
        <button onClick={resetStock} className="bg-red-100 text-red-700 px-3 py-1 rounded text-xs font-bold border border-red-200">
          ⚠️ 전체 초기화
        </button>
      </div>

      {loading ? (
        <div className="text-center py-4">로딩 중...</div>
      ) : (
        <div className="grid grid-cols-5 gap-1 sm:grid-cols-10">
          {stock.map(item => (
            <div 
              key={item.id} 
              className={`
                text-center p-1 border rounded text-[10px] sm:text-xs font-medium
                ${item.isSold ? 'bg-gray-300 text-gray-500' : 'bg-green-50 text-green-700 border-green-200'}
              `}
              title={item.isSold ? `판매됨 (${item.soldTo})` : '판매가능'}
            >
              {item.number}
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-4 flex gap-4 text-xs text-gray-500 justify-end">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-50 border border-green-200 rounded"></div> 판매가능
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-300 border border-gray-400 rounded"></div> 판매됨
        </div>
      </div>
    </div>
  );
}
