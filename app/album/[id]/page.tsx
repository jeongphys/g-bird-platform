"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { db, storage } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, addDoc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { Album, AlbumImage } from "@/types";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { getUserFromLocalStorage } from "@/lib/auth";

const DELETE_PASSWORD = "980413";

export default function AlbumDetailPage() {
  const params = useParams();
  const router = useRouter();
  const albumId = params.id as string;
  const [album, setAlbum] = useState<Album | null>(null);
  const [images, setImages] = useState<AlbumImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteImageId, setDeleteImageId] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState("");

  useEffect(() => {
    loadAlbum();
    loadImages();
  }, [albumId]);

  const loadAlbum = async () => {
    try {
      const docRef = doc(db, "albums", albumId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAlbum({
          id: docSnap.id,
          title: data.title || "",
          description: data.description || "",
          coverImage: data.coverImage || "",
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString(),
          createdBy: data.createdBy || "관리자"
        });
      } else {
        alert("앨범을 찾을 수 없습니다.");
        router.push("/album");
      }
    } catch (error) {
      console.error("Error loading album:", error);
      alert("앨범을 불러오는데 실패했습니다.");
    }
    setLoading(false);
  };

  const loadImages = async () => {
    try {
      const imagesCol = collection(db, "albumImages");
      const q = query(imagesCol, where("albumId", "==", albumId));
      const snapshot = await getDocs(q);
      
      const list: AlbumImage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          albumId: data.albumId || "",
          imageUrl: data.imageUrl || "",
          uploadedBy: data.uploadedBy || "관리자",
          createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString()
        });
      });
      
      // 최신순 정렬
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setImages(list);
    } catch (error) {
      console.error("Error loading images:", error);
      alert("이미지를 불러오는데 실패했습니다.");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const { userName } = getUserFromLocalStorage();

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // 이미지 정규화 (HEIC -> JPEG 변환 및 리사이즈)
        const normalizedFile = await normalizeImage(file);
        
        const fileName = `album_${albumId}_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
        const storageRef = ref(storage, `albums/${albumId}/${fileName}`);
        
        await uploadBytes(storageRef, normalizedFile, { contentType: "image/jpeg" });
        const downloadURL = await getDownloadURL(storageRef);
        
        // Firestore에 이미지 정보 저장
        await addDoc(collection(db, "albumImages"), {
          albumId: albumId,
          imageUrl: downloadURL,
          uploadedBy: userName || "관리자",
          createdAt: new Date()
        });

        // 첫 번째 이미지면 앨범 커버로 설정
        if (images.length === 0 && album) {
          const albumRef = doc(db, "albums", albumId);
          await getDoc(albumRef).then(async (snap) => {
            if (snap.exists() && !snap.data().coverImage) {
              await import("firebase/firestore").then(({ updateDoc }) => {
                updateDoc(albumRef, { coverImage: downloadURL });
              });
            }
          });
        }
      });

      await Promise.all(uploadPromises);
      alert("이미지가 업로드되었습니다.");
      loadImages();
      if (album) {
        loadAlbum();
      }
    } catch (error) {
      console.error("Error uploading images:", error);
      alert("이미지 업로드에 실패했습니다.");
    }
    setUploading(false);
  };

  const normalizeImage = async (file: File): Promise<Blob> => {
    // JPEG, PNG, WebP, GIF는 그대로 반환
    if (["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      return file;
    }

    // HEIC 등 다른 형식은 Canvas로 변환
    try {
      const bitmap = await createImageBitmap(file);
      const maxSide = 2048;
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
      
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context not available");
      
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Failed to convert image"));
        }, "image/jpeg", 0.9);
      });
    } catch (error) {
      console.error("Error normalizing image:", error);
      throw new Error("지원되지 않는 이미지 형식입니다.");
    }
  };

  const handleDeleteImage = async () => {
    if (!deleteImageId) return;

    if (deletePassword !== DELETE_PASSWORD) {
      alert("비밀번호가 틀렸습니다.");
      return;
    }

    try {
      const image = images.find(img => img.id === deleteImageId);
      if (!image) return;

      // Storage에서 이미지 삭제
      if (image.imageUrl) {
        const imageRef = ref(storage, image.imageUrl);
        await deleteObject(imageRef).catch(console.error);
      }

      // Firestore에서 이미지 문서 삭제
      await deleteDoc(doc(db, "albumImages", deleteImageId));
      alert("이미지가 삭제되었습니다.");
      setShowDeleteModal(false);
      setDeleteImageId(null);
      setDeletePassword("");
      loadImages();
    } catch (error) {
      console.error("Error deleting image:", error);
      alert("이미지 삭제에 실패했습니다.");
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

  if (!album) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-4 shadow sticky top-0 z-20">
        <div className="flex justify-between items-center">
          <button onClick={() => router.push("/album")} className="text-gray-500 font-bold">← 목록</button>
          <h1 className="text-xl font-bold">{album.title}</h1>
          <label className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700 cursor-pointer">
            {uploading ? "업로드 중..." : "+ 이미지 추가"}
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      <div className="p-4 max-w-6xl mx-auto">
        {album.description && (
          <div className="bg-white rounded-lg shadow p-4 mb-4">
            <p className="text-gray-700">{album.description}</p>
          </div>
        )}

        {images.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-lg border border-dashed text-gray-400">
            이미지가 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map(image => (
              <div key={image.id} className="relative group">
                <img
                  src={image.imageUrl}
                  alt="앨범 이미지"
                  className="w-full h-48 object-cover rounded-lg shadow hover:shadow-lg transition cursor-pointer"
                  onClick={() => window.open(image.imageUrl, "_blank")}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteImageId(image.id);
                    setShowDeleteModal(true);
                  }}
                  className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold opacity-0 group-hover:opacity-100 transition"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 삭제 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">이미지 삭제</h2>
            <p className="text-gray-600 mb-4">삭제하려면 관리자 비밀번호를 입력하세요.</p>
            <input
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="비밀번호"
              className="w-full p-3 border rounded-lg mb-4 text-black"
              onKeyDown={(e) => e.key === 'Enter' && handleDeleteImage()}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteImageId(null);
                  setDeletePassword("");
                }}
                className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleDeleteImage}
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
