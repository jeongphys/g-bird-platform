"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getUserFromLocalStorage, getCurrentUser } from "@/lib/auth";

export default function Home() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 로그인된 사용자는 자동 리다이렉트
  useEffect(() => {
    if (!isClient) return;
    
    const { userName } = getUserFromLocalStorage();
    const firebaseUser = getCurrentUser();
    
    if (userName || firebaseUser) {
      if (userName === "admin" || userName === "admin1234") {
        router.push("/admin");
      } else {
        router.push("/purchase");
      }
    }
  }, [router, isClient]);

  if (!isClient) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">로딩 중...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-2xl bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-blue-600 mb-2">G-Bird</h1>
          <p className="text-gray-600">배드민턴 클럽 운영 플랫폼</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Link
            href="/auth/login"
            className="block p-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-center font-semibold"
          >
            로그인
          </Link>
          <Link
            href="/notice"
            className="block p-6 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-center font-semibold"
          >
            공지사항
          </Link>
          <Link
            href="/freeboard"
            className="block p-6 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-center font-semibold"
          >
            자유게시판
          </Link>
          <Link
            href="/album"
            className="block p-6 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-center font-semibold"
          >
            앨범
          </Link>
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>로그인 없이도 공지사항, 자유게시판, 앨범을 이용할 수 있습니다.</p>
          <p className="mt-1">구매 및 출석 체크는 로그인이 필요합니다.</p>
        </div>
      </div>
    </div>
  );
}