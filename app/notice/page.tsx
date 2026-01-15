"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Notice } from "@/types";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { getUserFromLocalStorage } from "@/lib/auth";

export default function NoticeListPage() {
  const router = useRouter();
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const { userName } = getUserFromLocalStorage();
    setIsAdmin(userName === "admin" || userName === "admin1234");
    loadNotices();
  }, []);

  const loadNotices = async () => {
    try {
      const noticesCol = collection(db, "notices");
      // order 필드가 있으면 order로, 없으면 createdAt으로 정렬
      const q = query(noticesCol, orderBy("order", "desc"));
      const snapshot = await getDocs(q);
      
      const list: Notice[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          title: data.title || "",
          content: data.content || "",
          author: data.author || "관리자",
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString(),
          isPinned: data.isPinned || false
        });
      });

      // 고정 공지 먼저, 그 다음 일반 공지
      list.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setNotices(list);
    } catch (error) {
      console.error("Error loading notices:", error);
      alert("공지사항을 불러오는데 실패했습니다.");
    }
    setLoading(false);
  };


  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-4 shadow sticky top-0 z-20">
        <div className="flex justify-between items-center">
          <button onClick={() => router.push("/")} className="text-gray-500 font-bold">← 홈</button>
          <h1 className="text-xl font-bold">공지사항</h1>
          {isAdmin && (
            <button
              onClick={() => router.push("/admin/notice/write")}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700"
            >
              + 새 글 작성
            </button>
          )}
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto">
        {loading ? (
          <div className="text-center py-10 text-gray-500">로딩 중...</div>
        ) : notices.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-lg border border-dashed text-gray-400">
            공지사항이 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {notices.map(notice => (
              <div
                key={notice.id}
                onClick={() => router.push(`/notice/${notice.id}`)}
                className="bg-white p-4 rounded-lg shadow border border-gray-100 cursor-pointer hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {notice.isPinned && (
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">고정</span>
                      )}
                      <h2 className="text-lg font-bold text-gray-800">{notice.title}</h2>
                    </div>
                    <p className="text-sm text-gray-500">
                      {format(new Date(notice.createdAt), "yyyy년 MM월 dd일", { locale: ko })}
                    </p>
                  </div>
                  <span className="text-gray-400">→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
