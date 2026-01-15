"use client";
import { useState, useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { FreeboardPost } from "@/types";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const POST_IT_COLORS = [
  { id: 1, bg: "#fff3b0", name: "노란색" },
  { id: 2, bg: "#ffd6a5", name: "주황색" },
  { id: 3, bg: "#caffbf", name: "초록색" },
  { id: 4, bg: "#9bf6ff", name: "파란색" },
  { id: 5, bg: "#bdb2ff", name: "보라색" },
];

interface Position {
  x: number;
  y: number;
}

export default function FreeboardWidget() {
  const [posts, setPosts] = useState<(FreeboardPost & { position?: Position })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [draggedPost, setDraggedPost] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const boardRef = useRef<HTMLDivElement>(null);

  // 작성 폼 상태
  const [writeContent, setWriteContent] = useState("");
  const [writeAuthor, setWriteAuthor] = useState("");
  const [writePassword, setWritePassword] = useState("");
  const [writeColor, setWriteColor] = useState(1);

  useEffect(() => {
    // 실시간 동기화
    const postsCol = collection(db, "freeboard");
    const q = query(postsCol, orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: (FreeboardPost & { position?: Position })[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          content: data.content || "",
          author: data.author || "익명",
          color: data.color || 1,
          password: data.password || "",
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString(),
          position: data.position || { x: Math.random() * 200 + 50, y: Math.random() * 200 + 50 },
        });
      });
      setPosts(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleWrite = async () => {
    if (!writeContent.trim()) {
      alert("내용을 입력해주세요.");
      return;
    }
    if (!writePassword.trim()) {
      alert("삭제용 비밀번호를 입력해주세요.");
      return;
    }

    try {
      const initialPosition = {
        x: Math.random() * (boardRef.current?.clientWidth || 400 - 200) + 50,
        y: Math.random() * (boardRef.current?.clientHeight || 400 - 200) + 50,
      };

      await addDoc(collection(db, "freeboard"), {
        content: writeContent.trim(),
        author: writeAuthor.trim() || "익명",
        password: writePassword,
        color: writeColor,
        position: initialPosition,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      alert("게시글이 등록되었습니다.");
      setShowWriteModal(false);
      setWriteContent("");
      setWriteAuthor("");
      setWritePassword("");
      setWriteColor(1);
    } catch (error) {
      console.error("Error writing post:", error);
      alert("게시글 등록에 실패했습니다.");
    }
  };

  const handleDelete = async () => {
    if (!deletePostId) return;

    const post = posts.find((p) => p.id === deletePostId);
    if (!post) return;

    const MASTER_PASSWORD = "980413";
    if (deletePassword !== MASTER_PASSWORD && deletePassword !== post.password) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }

    try {
      await deleteDoc(doc(db, "freeboard", deletePostId));
      alert("게시글이 삭제되었습니다.");
      setShowDeleteModal(false);
      setDeletePostId(null);
      setDeletePassword("");
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("게시글 삭제에 실패했습니다.");
    }
  };

  const handleMouseDown = (e: React.MouseEvent, postId: string) => {
    e.preventDefault();
    const post = posts.find((p) => p.id === postId);
    if (!post || !post.position) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const boardRect = boardRef.current?.getBoundingClientRect();
    if (!boardRect) return;

    setDraggedPost(postId);
    setDragOffset({
      x: e.clientX - (boardRect.left + post.position.x),
      y: e.clientY - (boardRect.top + post.position.y),
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedPost || !boardRef.current) return;

    const boardRect = boardRef.current.getBoundingClientRect();
    const newX = e.clientX - boardRect.left - dragOffset.x;
    const newY = e.clientY - boardRect.top - dragOffset.y;

    // 보드 범위 내로 제한
    const maxX = boardRect.width - 200;
    const maxY = boardRect.height - 150;
    const constrainedX = Math.max(0, Math.min(newX, maxX));
    const constrainedY = Math.max(0, Math.min(newY, maxY));

    // Firestore 업데이트는 드래그 종료 시에만
    const post = posts.find((p) => p.id === draggedPost);
    if (post) {
      post.position = { x: constrainedX, y: constrainedY };
      setPosts([...posts]);
    }
  };

  const handleMouseUp = async () => {
    if (!draggedPost) return;

    const post = posts.find((p) => p.id === draggedPost);
    if (post && post.position) {
      try {
        const postRef = doc(db, "freeboard", draggedPost);
        await updateDoc(postRef, {
          position: post.position,
          updatedAt: new Date(),
        });
      } catch (error) {
        console.error("Error updating position:", error);
      }
    }

    setDraggedPost(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-bold">💬 자유게시판</h2>
      </div>
      <div
        ref={boardRef}
        className="relative w-full h-96 md:h-[500px] overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #ffffffee 0%, #ffffffdd 100%)",
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-gray-500">로딩 중...</div>
          </div>
        ) : posts.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-gray-400">게시글이 없습니다.</div>
          </div>
        ) : (
          posts.map((post) => {
            const color = POST_IT_COLORS.find((c) => c.id === post.color) || POST_IT_COLORS[0];
            const position = post.position || { x: 50, y: 50 };
            const isDragging = draggedPost === post.id;

            return (
              <div
                key={post.id}
                className="absolute cursor-grab active:cursor-grabbing"
                style={{
                  left: `${position.x}px`,
                  top: `${position.y}px`,
                  maxWidth: "240px",
                  minWidth: "160px",
                  transform: isDragging
                    ? "perspective(800px) rotateX(2deg) scale(1.05)"
                    : "perspective(800px) rotateX(2deg)",
                  zIndex: isDragging ? 1000 : 1,
                  transition: isDragging ? "none" : "transform 0.15s ease",
                }}
                onMouseDown={(e) => handleMouseDown(e, post.id)}
              >
                <div
                  className="relative p-3 rounded shadow-lg"
                  style={{
                    background: color.bg,
                    boxShadow: isDragging
                      ? "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)"
                      : "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <div
                    className="absolute top-0 left-0 w-full h-6 rounded-t"
                    style={{
                      background: "linear-gradient(rgba(0,0,0,0.04), transparent)",
                    }}
                  />
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-bold text-sm text-gray-800">{post.author}</div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletePostId(post.id);
                        setDeletePassword("");
                        setShowDeleteModal(true);
                      }}
                      className="text-gray-600 hover:text-red-600 text-lg opacity-0 group-hover:opacity-100 transition"
                      style={{ opacity: 0.45 }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.45")}
                    >
                      ×
                    </button>
                  </div>
                  <div className="text-sm text-gray-800 whitespace-pre-wrap break-words mb-2">
                    {post.content}
                  </div>
                  <div className="text-xs text-gray-500 text-right">
                    {format(new Date(post.createdAt), "MM.dd", { locale: ko })}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* FAB 버튼 */}
        <button
          onClick={() => setShowWriteModal(true)}
          className="absolute right-6 bottom-6 w-14 h-14 bg-gray-900 text-white rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-gray-800 transition z-50"
        >
          +
        </button>
      </div>

      {/* 작성 모달 */}
      {showWriteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h2 className="text-xl font-bold mb-4">메시지 남기기</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">내용 *</label>
                <textarea
                  value={writeContent}
                  onChange={(e) => setWriteContent(e.target.value)}
                  placeholder="내용을 입력하세요..."
                  rows={6}
                  className="w-full p-3 border border-gray-300 rounded-xl text-black focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">이름 (비워두면 익명)</label>
                <input
                  type="text"
                  value={writeAuthor}
                  onChange={(e) => setWriteAuthor(e.target.value)}
                  placeholder="이름"
                  className="w-full p-3 border border-gray-300 rounded-xl text-black focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">삭제용 비밀번호 *</label>
                <input
                  type="password"
                  value={writePassword}
                  onChange={(e) => setWritePassword(e.target.value)}
                  placeholder="비밀번호"
                  className="w-full p-3 border border-gray-300 rounded-xl text-black focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">색상 선택</label>
                <div className="flex gap-2 justify-center">
                  {POST_IT_COLORS.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => setWriteColor(color.id)}
                      className={`w-10 h-10 rounded-full border-2 transition ${
                        writeColor === color.id
                          ? "border-gray-800 ring-2 ring-gray-400 scale-110"
                          : "border-gray-300 hover:scale-105"
                      }`}
                      style={{ backgroundColor: color.bg }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowWriteModal(false);
                  setWriteContent("");
                  setWriteAuthor("");
                  setWritePassword("");
                  setWriteColor(1);
                }}
                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 transition"
              >
                취소
              </button>
              <button
                onClick={handleWrite}
                className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition"
              >
                남기기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h2 className="text-xl font-bold mb-4">게시글 삭제</h2>
            <p className="text-gray-600 mb-4">삭제하려면 비밀번호를 입력하세요.</p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="비밀번호"
              className="w-full p-3 border border-gray-300 rounded-xl mb-4 text-black focus:ring-2 focus:ring-red-500 outline-none"
              onKeyDown={(e) => e.key === "Enter" && handleDelete()}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePostId(null);
                  setDeletePassword("");
                }}
                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 transition"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition"
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
