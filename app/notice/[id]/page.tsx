"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, deleteDoc } from "firebase/firestore";
import { Notice } from "@/types";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { getUserFromLocalStorage, isAdmin } from "@/lib/auth";

export default function NoticeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const noticeId = params.id as string;
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [userIsAdmin, setUserIsAdmin] = useState(false);

  useEffect(() => {
    loadNotice();
    checkAdmin();
  }, [noticeId]);

  const checkAdmin = async () => {
    const { userName, userId } = getUserFromLocalStorage();
    const adminStatus = userName === "admin" || userName === "admin1234" || 
                       (userId ? await isAdmin(userId) : false);
    setUserIsAdmin(!!adminStatus);
  };

  const loadNotice = async () => {
    try {
      const docRef = doc(db, "notices", noticeId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setNotice({
          id: docSnap.id,
          title: data.title || "",
          content: data.content || "",
          author: data.author || "관리자",
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString(),
          isPinned: data.isPinned || false
        });
      } else {
        alert("공지사항을 찾을 수 없습니다.");
        router.push("/notice");
      }
    } catch (error) {
      console.error("Error loading notice:", error);
      alert("공지사항을 불러오는데 실패했습니다.");
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (deletePassword !== "gbird980413mwj") {
      alert("비밀번호가 틀렸습니다.");
      return;
    }

    try {
      await deleteDoc(doc(db, "notices", noticeId));
      alert("공지사항이 삭제되었습니다.");
      router.push("/notice");
    } catch (error) {
      console.error("Error deleting notice:", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!notice) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-4 shadow sticky top-0 z-20">
        <div className="flex justify-between items-center">
          <button onClick={() => router.push("/notice")} className="text-gray-500 font-bold">← 목록</button>
          <h1 className="text-xl font-bold">공지사항</h1>
          {userIsAdmin && (
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/admin/notice/write?edit=${noticeId}`)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700"
              >
                수정
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-700"
              >
                삭제
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              {notice.isPinned && (
                <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">고정</span>
              )}
              <h1 className="text-2xl font-bold text-gray-800">{notice.title}</h1>
            </div>
            <p className="text-sm text-gray-500">
              {format(new Date(notice.createdAt), "yyyy년 MM월 dd일 HH:mm", { locale: ko })}
            </p>
          </div>
          <hr className="my-4" />
          <div 
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: notice.content }}
          />
        </div>
      </div>

      {/* 삭제 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">공지사항 삭제</h2>
            <p className="text-gray-600 mb-4">삭제하려면 관리자 비밀번호를 입력하세요.</p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="비밀번호"
              className="w-full p-3 border rounded-lg mb-4 text-black"
              onKeyDown={(e) => e.key === 'Enter' && handleDelete()}
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
