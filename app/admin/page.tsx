"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, writeBatch, orderBy, setDoc, deleteDoc } from "firebase/firestore";

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState("orders"); // orders | members | inventory

  // --- 로그인 처리 ---
  const handleLogin = () => {
    if (password === "admin1234") setIsAdmin(true);
    else alert("비밀번호 불일치");
  };

  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded shadow text-center">
          <h1 className="font-bold mb-4">관리자 접속</h1>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} 
            className="border p-2 mb-2 w-full text-black" placeholder="비밀번호" 
            onKeyDown={e=>e.key==='Enter' && handleLogin()} />
          <button onClick={handleLogin} className="bg-gray-800 text-white w-full py-2 rounded">접속</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">🛠 G-Bird 관리자</h1>
          <div className="space-x-2">
            <button onClick={()=>setActiveTab("orders")} className={`px-4 py-2 rounded ${activeTab==="orders"?"bg-blue-600 text-white":"bg-white"}`}>주문 관리</button>
            <button onClick={()=>setActiveTab("members")} className={`px-4 py-2 rounded ${activeTab==="members"?"bg-blue-600 text-white":"bg-white"}`}>회원 관리</button>
            <button onClick={()=>setActiveTab("inventory")} className={`px-4 py-2 rounded ${activeTab==="inventory"?"bg-blue-600 text-white":"bg-white"}`}>재고 관리</button>
          </div>
        </div>

        {activeTab === "orders" && <OrderManager />}
        {activeTab === "members" && <MemberManager />}
        {activeTab === "inventory" && <InventoryManager />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// 1. 주문 관리 컴포넌트
// ---------------------------------------------------------
function OrderManager() {
  const [orders, setOrders] = useState<any[]>([]);

  const fetchOrders = async () => {
    const q = query(collection(db, "orders"), where("status", "==", "pending"));
    const snap = await getDocs(q);
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // 최신순 정렬
    list.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setOrders(list);
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleApprove = async (id: string) => {
    if(!confirm("승인하시겠습니까?")) return;
    const batch = writeBatch(db);
    batch.update(doc(db, "orders", id), { status: "approved", approvedAt: new Date().toISOString() });
    await batch.commit();
    fetchOrders();
  };

  const handleReject = async (order: any) => {
    const reason = prompt("반려 사유:");
    if(!reason) return;
    const batch = writeBatch(db);
    batch.update(doc(db, "orders", order.id), { status: "rejected", rejectReason: reason });
    order.items.forEach((itemId: string) => {
      batch.update(doc(db, "inventory", itemId), { isSold: false, soldTo: null });
    });
    await batch.commit();
    fetchOrders();
  };

  return (
    <div className="bg-white p-6 rounded shadow">
      <h2 className="font-bold text-lg mb-4">입금 대기 목록</h2>
      {orders.length === 0 ? <p className="text-gray-500">대기 중인 주문이 없습니다.</p> : (
        <ul className="divide-y">
          {orders.map(order => (
            <li key={order.id} className="py-4 flex justify-between items-center">
              <div>
                <span className="font-bold text-blue-600 mr-2">{order.userName}</span>
                <span className="text-sm text-gray-500">{order.items.join(", ")}</span>
                <div className="font-bold">{order.totalPrice.toLocaleString()}원</div>
              </div>
              <div className="space-x-2">
                <button onClick={()=>handleReject(order)} className="text-red-500 text-sm border border-red-200 px-3 py-1 rounded">반려</button>
                <button onClick={()=>handleApprove(order.id)} className="bg-blue-600 text-white text-sm px-4 py-1 rounded">승인</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------
// 2. 회원 관리 컴포넌트 (신규 기능!)
// ---------------------------------------------------------
function MemberManager() {
  const [members, setMembers] = useState<any[]>([]);
  const [newName, setNewName] = useState("");
  const [newScore, setNewScore] = useState("");

  const fetchMembers = async () => {
    const snap = await getDocs(collection(db, "users"));
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // 이름순 정렬
    list.sort((a: any, b: any) => a.name.localeCompare(b.name));
    setMembers(list);
  };

  useEffect(() => { fetchMembers(); }, []);

  // 회원 추가/수정
  const handleAddMember = async () => {
    if (!newName) return alert("이름을 입력하세요");
    // 점수에 따른 할인액 자동 계산 로직 (예시: 점수 * 100원, 최대 2000원 등 규칙 적용 가능)
    // 여기서는 단순하게 입력값을 받거나 기본값 처리
    const score = Number(newScore) || 0;
    const discount = score >= 10 ? 1000 : (score >= 5 ? 500 : 0); // 예시 규칙

    await setDoc(doc(db, "users", newName), {
      name: newName,
      attendanceScore: score,
      shuttleDiscount: discount,
      isActive: true,
      status: "active"
    });
    alert(`${newName} 회원 저장 완료 (할인액: ${discount}원)`);
    setNewName("");
    setNewScore("");
    fetchMembers();
  };

  const handleDelete = async (id: string) => {
    if(!confirm("정말 삭제하시겠습니까?")) return;
    await deleteDoc(doc(db, "users", id));
    fetchMembers();
  };

  return (
    <div className="bg-white p-6 rounded shadow">
      <div className="flex gap-2 mb-6 bg-gray-50 p-4 rounded">
        <input placeholder="이름 (예: 홍길동(수학))" value={newName} onChange={e=>setNewName(e.target.value)} className="border p-2 rounded flex-1 text-black"/>
        <input placeholder="출석점수 (숫자)" type="number" value={newScore} onChange={e=>setNewScore(e.target.value)} className="border p-2 rounded w-24 text-black"/>
        <button onClick={handleAddMember} className="bg-green-600 text-white px-4 rounded font-bold">추가/수정</button>
      </div>

      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b text-gray-500 text-sm">
            <th className="py-2">이름</th>
            <th>점수</th>
            <th>할인액</th>
            <th>상태</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          {members.map(m => (
            <tr key={m.id} className="border-b hover:bg-gray-50">
              <td className="py-2 font-bold">{m.name}</td>
              <td>{m.attendanceScore}점</td>
              <td className="text-blue-600 font-bold">-{m.shuttleDiscount}원</td>
              <td>
                <span className={`text-xs px-2 py-1 rounded ${m.isActive?'bg-green-100 text-green-800':'bg-red-100 text-red-800'}`}>
                  {m.isActive ? "활동" : "비활동"}
                </span>
              </td>
              <td>
                <button onClick={()=>handleDelete(m.id)} className="text-xs text-red-500 underline">삭제</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------
// 3. 재고 관리 컴포넌트 (초간단 버전)
// ---------------------------------------------------------
function InventoryManager() {
  const [stock, setStock] = useState<any[]>([]);

  const fetchStock = async () => {
    const snap = await getDocs(collection(db, "inventory"));
    const list = snap.docs.map(d => d.data());
    list.sort((a: any, b: any) => (a.box - b.box) || (a.number - b.number));
    setStock(list);
  };

  useEffect(() => { fetchStock(); }, []);

  const resetStock = async () => {
    if(!confirm("모든 재고를 '판매 가능' 상태로 초기화하시겠습니까? (위험)")) return;
    // 실제로는 배치 처리가 필요하지만 여기선 간단히 구현
    const batch = writeBatch(db);
    stock.forEach(item => {
      batch.update(doc(db, "inventory", item.id), { isSold: false, soldTo: null });
    });
    await batch.commit();
    alert("초기화되었습니다.");
    fetchStock();
  };

  return (
    <div className="bg-white p-6 rounded shadow">
      <div className="flex justify-between mb-4">
        <h2 className="font-bold">재고 현황 ({stock.filter(i=>!i.isSold).length} / {stock.length})</h2>
        <button onClick={resetStock} className="bg-red-600 text-white text-xs px-3 py-1 rounded">전체 초기화</button>
      </div>
      <div className="grid grid-cols-10 gap-1">
        {stock.map(item => (
          <div key={item.id} className={`text-center text-xs p-1 border ${item.isSold?'bg-gray-300':'bg-green-50'}`}>
            {item.id}
          </div>
        ))}
      </div>
    </div>
  );
}