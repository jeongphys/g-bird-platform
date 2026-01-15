"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { FreeboardPost } from "@/types";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const COLORS = [
  { id: 1, bg: "bg-yellow-50", border: "border-yellow-300", text: "text-yellow-900" },
  { id: 2, bg: "bg-pink-50", border: "border-pink-300", text: "text-pink-900" },
  { id: 3, bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-900" },
  { id: 4, bg: "bg-green-50", border: "border-green-300", text: "text-green-900" },
  { id: 5, bg: "bg-purple-50", border: "border-purple-300", text: "text-purple-900" },
];

export default function FreeboardPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<FreeboardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");

  // 작성 폼 상태
  const [writeContent, setWriteContent] = useState("");
  const [writeAuthor, setWriteAuthor] = useState("");
  const [writePassword, setWritePassword] = useState("");
  const [writeColor, setWriteColor] = useState(1);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const postsCol = collection(db, "freeboard");
      const q = query(postsCol, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      
      const list: FreeboardPost[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          content: data.content || "",
          author: data.author || "익명",
          color: data.color || 1,
          password: data.password || "",
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || new Date().toISOString()
        });
      });
      setPosts(list);
    } catch (error) {
      console.error("Error loading posts:", error);
      alert("게시글을 불러오는데 실패했습니다.");
    }
    setLoading(false);
  };

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
      await addDoc(collection(db, "freeboard"), {
        content: writeContent.trim(),
        author: writeAuthor.trim() || "익명",
        password: writePassword,
        color: writeColor,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      alert("게시글이 등록되었습니다.");
      setShowWriteModal(false);
      setWriteContent("");
      setWriteAuthor("");
      setWritePassword("");
      setWriteColor(1);
      loadPosts();
    } catch (error) {
      console.error("Error writing post:", error);
      alert("게시글 등록에 실패했습니다.");
    }
  };

  const handleDelete = async () => {
    if (!deletePostId) return;

    const post = posts.find(p => p.id === deletePostId);
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
      loadPosts();
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("게시글 삭제에 실패했습니다.");
    }
  };

  const openDeleteModal = (postId: string) => {
    setDeletePostId(postId);
    setDeletePassword("");
    setShowDeleteModal(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-4 shadow sticky top-0 z-20">
        <div className="flex justify-between items-center">
          <button onClick={() => router.push("/")} className="text-gray-500 font-bold">← 홈</button>
          <h1 className="text-xl font-bold">자유게시판</h1>
          <button
            onClick={() => setShowWriteModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700"
          >
            + 메시지 남기기
          </button>
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto">
        {loading ? (
          <div className="text-center py-10 text-gray-500">로딩 중...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-lg border border-dashed text-gray-400">
            게시글이 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map(post => {
              const colorStyle = COLORS.find(c => c.id === post.color) || COLORS[0];
              return (
                <div
                  key={post.id}
                  className={`${colorStyle.bg} ${colorStyle.border} border-2 rounded-lg p-4 shadow-sm hover:shadow-md transition relative`}
                >
                  <div className={`${colorStyle.text} mb-2`}>
                    <p className="text-sm whitespace-pre-wrap break-words">{post.content}</p>
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-300">
                    <div className="text-xs text-gray-600">
                      <div>{post.author}</div>
                      <div>{format(new Date(post.createdAt), "MM.dd HH:mm", { locale: ko })}</div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteModal(post.id);
                      }}
                      className="text-xs text-red-600 hover:text-red-800 font-bold"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 작성 모달 */}
      {showWriteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">메시지 남기기</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">내용 *</label>
                <textarea
                  value={writeContent}
                  onChange={(e) => setWriteContent(e.target.value)}
                  placeholder="내용을 입력하세요..."
                  rows={6}
                  className="w-full p-3 border rounded-lg text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">이름 (비워두면 익명)</label>
                <input
                  type="text"
                  value={writeAuthor}
                  onChange={(e) => setWriteAuthor(e.target.value)}
                  placeholder="이름"
                  className="w-full p-3 border rounded-lg text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">삭제용 비밀번호 *</label>
                <input
                  type="password"
                  value={writePassword}
                  onChange={(e) => setWritePassword(e.target.value)}
                  placeholder="비밀번호"
                  className="w-full p-3 border rounded-lg text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">색상 선택</label>
                <div className="flex gap-2">
                  {COLORS.map(color => (
                    <button
                      key={color.id}
                      onClick={() => setWriteColor(color.id)}
                      className={`w-12 h-12 rounded-lg border-2 ${
                        writeColor === color.id ? 'border-gray-800 ring-2 ring-gray-400' : 'border-gray-300'
                      } ${color.bg}`}
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
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleWrite}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700"
              >
                남기기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">게시글 삭제</h2>
            <p className="text-gray-600 mb-4">삭제하려면 비밀번호를 입력하세요.</p>
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
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletePostId(null);
                  setDeletePassword("");
                }}
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
