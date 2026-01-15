"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Notice } from "@/types";
import { getUserFromLocalStorage } from "@/lib/auth";

function NoticeWriteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [order, setOrder] = useState(0);
  const [isPinned, setIsPinned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!editId);

  useEffect(() => {
    if (editId) {
      loadNotice();
    } else {
      // 새 글 작성 시 order를 현재 최대값 + 1로 설정
      loadMaxOrder();
    }
  }, [editId]);

  const loadMaxOrder = async () => {
    try {
      const { collection, query, orderBy, getDocs } = await import("firebase/firestore");
      const noticesCol = collection(db, "notices");
      const q = query(noticesCol, orderBy("order", "desc"));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const maxOrder = snapshot.docs[0].data().order || 0;
        setOrder(maxOrder + 1);
      } else {
        setOrder(1);
      }
    } catch (error) {
      console.error("Error loading max order:", error);
      setOrder(1);
    }
  };

  const loadNotice = async () => {
    try {
      const docRef = doc(db, "notices", editId!);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTitle(data.title || "");
        setContent(data.content || "");
        setOrder(data.order || 0);
        setIsPinned(data.isPinned || false);
      } else {
        alert("수정할 공지사항을 찾을 수 없습니다.");
        router.push("/admin/notice");
      }
    } catch (error) {
      console.error("Error loading notice:", error);
      alert("공지사항을 불러오는데 실패했습니다.");
    }
    setInitialLoading(false);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }
    if (!order || order < 0) {
      alert("순서를 입력해주세요.");
      return;
    }

    setLoading(true);
    const { userName } = getUserFromLocalStorage();

    try {
      const data = {
        title: title.trim(),
        content: content,
        order: Number(order),
        isPinned: isPinned,
        author: userName || "관리자",
        updatedAt: serverTimestamp()
      };

      if (editId) {
        await setDoc(doc(db, "notices", editId), data, { merge: true });
        alert("수정 완료!");
      } else {
        await addDoc(collection(db, "notices"), {
          ...data,
          createdAt: serverTimestamp()
        });
        alert("저장 완료!");
      }
      router.push("/notice");
    } catch (error) {
      console.error("Error saving notice:", error);
      alert("저장 중 오류가 발생했습니다.");
    }
    setLoading(false);
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-4 shadow sticky top-0 z-20">
        <div className="flex justify-between items-center">
          <button onClick={() => router.push("/notice")} className="text-gray-500 font-bold">← 취소</button>
          <h1 className="text-xl font-bold">{editId ? "공지사항 수정" : "새 공지 작성"}</h1>
          <button
            onClick={handleSave}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">제목 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              className="w-full p-3 border rounded-lg text-black"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">순서 * (숫자가 클수록 위로)</label>
            <input
              type="number"
              value={order}
              onChange={(e) => setOrder(Number(e.target.value))}
              placeholder="순서"
              className="w-full p-3 border rounded-lg text-black"
            />
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">고정 공지</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 입력하세요 (HTML 지원)"
              rows={15}
              className="w-full p-3 border rounded-lg text-black font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              HTML 태그를 사용할 수 있습니다. 이미지는 img 태그로 추가하세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NoticeWritePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    }>
      <NoticeWriteContent />
    </Suspense>
  );
}
