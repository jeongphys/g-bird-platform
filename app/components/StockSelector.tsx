/**
 * StockSelector 컴포넌트
 * 
 * 셔틀콕 재고 선택 및 구매 신청 기능을 제공합니다.
 * 
 * 핵심 비즈니스 로직:
 * 1. 순차 판매: 박스 번호 순서대로만 구매 가능 (1-1 -> 1-2 -> ... -> 2-1 -> ...)
 * 2. 승인 절차: 구매 신청 시 재고 차감하지 않음, 관리자 승인 시 재고 차감 확정
 * 3. 중복 방지: pending 주문의 아이템은 다른 사용자가 신청할 수 없음
 * 4. 동시성 제어: Firebase Transaction을 사용하여 중복 구매 원천 차단
 */
"use client";
import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, doc, runTransaction, query, where, getDocs } from "firebase/firestore";

interface InventoryItem {
  id: string;
  box: number;
  number: number;
  isSold: boolean;
  soldTo?: string | null;
}

interface Props {
  inventory: InventoryItem[]; // 전체 재고 리스트
  userName: string; // 구매자 이름
}

export default function StockSelector({ inventory, userName }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);

  // 가격 상수 (개당 16,000원 - 필요시 수정)
  const PRICE_PER_UNIT = 16000;
  const totalPrice = selectedIds.length * PRICE_PER_UNIT;

  /**
   * 재고 아이템 클릭 핸들러
   * 
   * 순차 판매 규칙:
   * - 박스 번호, 낱개 번호 순서대로만 선택 가능
   * - 취소는 마지막으로 선택한 것부터만 가능 (LIFO)
   * - 최대 5개까지 구매 가능
   */
  const handleItemClick = (item: InventoryItem) => {
    // A. 이미 팔린 건 무시
    if (item.isSold) return;

    const isSelected = selectedIds.includes(item.id);

    if (isSelected) {
      // [취소 로직] 무조건 "마지막에 선택한 것"만 취소 가능
      if (item.id !== selectedIds[selectedIds.length - 1]) {
        alert("취소는 마지막으로 담은 것부터 순서대로 가능합니다.");
        return;
      }
      setSelectedIds(prev => prev.slice(0, -1)); // 마지막 1개 제거
    } else {
      // [선택 로직] "내 앞에 있는 녀석"들이 다 팔리거나 선택되어야 함
      
      // 현재 '선택 가능한(안 팔린)' 녀석들만 추림
      const availableItems = inventory.filter(i => !i.isSold);
      
      // 그 중에서 내가 아직 선택 안 한 것들 중 '가장 첫 번째' 녀석인가?
      // (이미 selectedIds에 들어있는 애들은 건너뛰고, 그 다음 타자여야 함)
      const nextTarget = availableItems.find(i => !selectedIds.includes(i.id));

      if (item.id !== nextTarget?.id) {
        alert("박스 번호, 낱개 번호 순서대로 담아야 합니다.");
        return;
      }

      // 최대 5개 제한 (필요 시 수정)
      if (selectedIds.length >= 5) {
        alert("1인당 최대 5개까지만 구매 가능합니다.");
        return;
      }

      setSelectedIds(prev => [...prev, item.id]);
    }
  };

  /**
   * 구매 신청 처리
   * 
   * 프로세스:
   * 1. pending 주문 확인 (중복 신청 방지)
   * 2. 재고 확인 (이미 판매된 아이템 체크)
   * 3. 주문서 생성 (status: "pending")
   * 4. 재고는 차감하지 않음 (관리자 승인 시 차감)
   */
  const handleSubmit = async () => {
    if (selectedIds.length === 0) return alert("상품을 선택해주세요.");
    if (!confirm(`${totalPrice.toLocaleString()}원 구매 신청하시겠습니까?`)) return;

    setProcessing(true);
    try {
      // A. pending 주문 확인 (중복 신청 방지) - 트랜잭션 외부에서 먼저 확인
      const pendingOrdersQuery = query(
        collection(db, "orders"),
        where("status", "==", "pending")
      );
      const pendingSnap = await getDocs(pendingOrdersQuery);
      const reservedItems = new Set<string>();
      pendingSnap.forEach(doc => {
        const orderData = doc.data();
        if (orderData.items && Array.isArray(orderData.items)) {
          orderData.items.forEach((itemId: string) => reservedItems.add(itemId));
        }
      });

      // 선택한 아이템이 pending 주문에 포함되어 있는지 확인
      for (const id of selectedIds) {
        if (reservedItems.has(id)) {
          throw new Error(`죄송합니다. ${id}번 셔틀콕은 이미 다른 주문에서 신청 중입니다.`);
        }
      }

      // B. 트랜잭션으로 재고 확인 및 주문서 생성
      await runTransaction(db, async (transaction) => {
        // 재고 확인 (그 사이에 누가 사갔을까봐) - 차감은 하지 않음
        for (const id of selectedIds) {
          const itemRef = doc(db, "inventory", id);
          const itemDoc = await transaction.get(itemRef);
          if (!itemDoc.exists() || itemDoc.data().isSold) {
            throw new Error(`죄송합니다. ${id}번 셔틀콕이 방금 판매되었습니다.`);
          }
        }

        // 주문서만 생성 (재고는 차감하지 않음, 승인 시 차감)
        const orderRef = doc(collection(db, "orders"));
        transaction.set(orderRef, {
          userName,
          items: selectedIds,
          totalPrice,
          status: "pending", // 입금 대기 상태
          createdAt: new Date().toISOString()
        });
      });

      alert("신청 완료! 입금 후 총무 승인을 기다려주세요.");
      setSelectedIds([]); // 선택 초기화
      window.location.reload(); // 새로고침해서 현황 업데이트
    } catch (e: any) {
      alert("구매 실패: " + e.message);
    }
    setProcessing(false);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border">
      <div className="mb-4 flex justify-between items-end">
        <div>
          <h2 className="text-lg font-bold">재고 선택</h2>
          <p className="text-xs text-gray-500">박스 번호 순서대로 선택해주세요.</p>
        </div>
        <div className="text-right">
          <span className="block text-xs text-gray-500">총 결제금액</span>
          <span className="text-xl font-bold text-blue-600">{totalPrice.toLocaleString()}원</span>
        </div>
      </div>

      {/* 재고 그리드 */}
      <div className="grid grid-cols-5 gap-2 mb-6">
        {inventory.map((item) => {
          const isSelected = selectedIds.includes(item.id);
          return (
            <div
              key={item.id}
              onClick={() => handleItemClick(item)}
              className={`
                p-2 border rounded text-center cursor-pointer transition relative
                ${item.isSold ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : ''}
                ${isSelected ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-300' : 'hover:border-blue-500'}
              `}
            >
              <div className="text-[10px] opacity-70">{item.box}번 BOX</div>
              <div className="font-bold">{item.number}</div>
              {/* 선택된 순서 표시 (뱃지) */}
              {isSelected && (
                <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-xs w-5 h-5 flex items-center justify-center rounded-full font-bold shadow">
                  {selectedIds.indexOf(item.id) + 1}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSubmit}
        disabled={processing || selectedIds.length === 0}
        className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold hover:bg-blue-700 transition disabled:bg-gray-400"
      >
        {processing ? "처리 중..." : "구매 신청하기"}
      </button>
    </div>
  );
}
