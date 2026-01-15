"use client";
import { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, addDoc, deleteDoc, doc, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { useRouter } from "next/navigation";
import { Album, AlbumImage } from "@/types";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { getUserFromLocalStorage } from "@/lib/auth";

const SHARED_PASSWORD = "1234";
const DELETE_PASSWORD = "980413";

export default function AlbumListPage() {
  const router = useRouter();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteAlbumId, setDeleteAlbumId] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");
  const [accessGranted, setAccessGranted] = useState(false);
  const [accessPassword, setAccessPassword] = useState("");

  // 생성 폼 상태
  const [createTitle, setCreateTitle] = useState("");
  const [createDescription, setCreateDescription] = useState("");

  useEffect(() => {
    checkAccess();
    if (accessGranted) {
      loadAlbums();
    }
  }, [accessGranted]);

  const checkAccess = () => {
    const stored = sessionStorage.getItem("albumAccess");
    if (stored === "true") {
      setAccessGranted(true);
    }
  };

  const handleAccess = () => {
    if (accessPassword === SHARED_PASSWORD) {
      sessionStorage.setItem("albumAccess", "true");
      setAccessGranted(true);
      setAccessPassword("");
    } else {
      alert("비밀번호가 틀렸습니다.");
    }
  };

  const loadAlbums = async () => {
    try {
      const albumsCol = collection(db, "albums");
      const q = query(albumsCol, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      
      const list: Album[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          title: data.title || "",
          description: data.description || "",
          coverImage: data.coverImage || "",
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
          createdBy: data.createdBy || "관리자"
        });
      });
      setAlbums(list);
    } catch (error) {
      console.error("Error loading albums:", error);
      alert("앨범을 불러오는데 실패했습니다.");
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!createTitle.trim()) {
      alert("제목을 입력해주세요.");
      return;
    }

    const { userName } = getUserFromLocalStorage();

    try {
      await addDoc(collection(db, "albums"), {
        title: createTitle.trim(),
        description: createDescription.trim() || "",
        coverImage: "",
        createdBy: userName || "관리자",
        createdAt: new Date()
      });
      alert("앨범이 생성되었습니다.");
      setShowCreateModal(false);
      setCreateTitle("");
      setCreateDescription("");
      loadAlbums();
    } catch (error) {
      console.error("Error creating album:", error);
      alert("앨범 생성에 실패했습니다.");
    }
  };

  const handleDelete = async () => {
    if (!deleteAlbumId) return;

    if (deletePassword !== DELETE_PASSWORD) {
      alert("비밀번호가 틀렸습니다.");
      return;
    }

    try {
      // 앨범의 모든 이미지 삭제
      const imagesCol = collection(db, "albumImages");
      const imagesQuery = query(imagesCol, where("albumId", "==", deleteAlbumId));
      const imagesSnapshot = await getDocs(imagesQuery);
      
      const deletePromises: Promise<void>[] = [];
      imagesSnapshot.forEach((imageDoc) => {
        const imageData = imageDoc.data();
        if (imageData.imageUrl) {
          // Storage에서 이미지 삭제
          const imageRef = ref(storage, imageData.imageUrl);
          deletePromises.push(deleteObject(imageRef).catch(console.error));
        }
        // Firestore에서 이미지 문서 삭제
        deletePromises.push(deleteDoc(doc(db, "albumImages", imageDoc.id)).catch(console.error));
      });

      await Promise.all(deletePromises);

      // 앨범 삭제
      await deleteDoc(doc(db, "albums", deleteAlbumId));
      alert("앨범이 삭제되었습니다.");
      setShowDeleteModal(false);
      setDeleteAlbumId(null);
      setDeletePassword("");
      loadAlbums();
    } catch (error) {
      console.error("Error deleting album:", error);
      alert("앨범 삭제에 실패했습니다.");
    }
  };

  if (!accessGranted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-6">앨범 접근</h1>
          <p className="text-center text-gray-600 mb-4">비밀번호를 입력하세요.</p>
          <input
            type="password"
            value={accessPassword}
            onChange={(e) => setAccessPassword(e.target.value)}
            placeholder="비밀번호"
            className="w-full p-4 border rounded-lg mb-4 text-black"
            onKeyDown={(e) => e.key === 'Enter' && handleAccess()}
          />
          <button
            onClick={handleAccess}
            className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold hover:bg-blue-700"
          >
            접근
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-4 shadow sticky top-0 z-20">
        <div className="flex justify-between items-center">
          <button onClick={() => router.push("/")} className="text-gray-500 font-bold">← 홈</button>
          <h1 className="text-xl font-bold">앨범</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700"
          >
            + 앨범 생성
          </button>
        </div>
      </div>

      <div className="p-4 max-w-6xl mx-auto">
        {loading ? (
          <div className="text-center py-10 text-gray-500">로딩 중...</div>
        ) : albums.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-lg border border-dashed text-gray-400">
            앨범이 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {albums.map(album => (
              <div
                key={album.id}
                onClick={() => router.push(`/album/${album.id}`)}
                className="bg-white rounded-lg shadow border border-gray-100 cursor-pointer hover:shadow-md transition overflow-hidden"
              >
                {album.coverImage ? (
                  <img
                    src={album.coverImage}
                    alt={album.title}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400 text-4xl">📷</span>
                  </div>
                )}
                <div className="p-4">
                  <h2 className="text-lg font-bold mb-1">{album.title}</h2>
                  {album.description && (
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">{album.description}</p>
                  )}
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-gray-500">
                      {format(new Date(album.createdAt), "yyyy.MM.dd", { locale: ko })}
                    </p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteAlbumId(album.id);
                        setShowDeleteModal(true);
                      }}
                      className="text-xs text-red-600 hover:text-red-800 font-bold"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">앨범 생성</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">제목 *</label>
                <input
                  type="text"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder="앨범 제목"
                  className="w-full p-3 border rounded-lg text-black"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">설명</label>
                <textarea
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder="앨범 설명"
                  rows={3}
                  className="w-full p-3 border rounded-lg text-black"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setCreateTitle("");
                  setCreateDescription("");
                }}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700"
              >
                생성
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 삭제 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">앨범 삭제</h2>
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
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteAlbumId(null);
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
