"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUserFromLocalStorage, getCurrentUser, onAuthChange } from "@/lib/auth";
import { User } from "@/types";

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireAdmin?: boolean;
  redirectTo?: string;
}

export default function AuthGuard({ 
  children, 
  requireAuth = true, 
  requireAdmin = false,
  redirectTo = "/auth/login"
}: AuthGuardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { userName, userId, authMethod } = getUserFromLocalStorage();
      const firebaseUser = getCurrentUser();

      // 인증 필요하지 않으면 통과
      if (!requireAuth) {
        setIsAuthorized(true);
        setIsLoading(false);
        return;
      }

      // 로그인 확인
      if (!userName && !firebaseUser) {
        router.push(redirectTo);
        return;
      }

      // 관리자 권한 확인
      if (requireAdmin) {
        const isAdminUser = userName === "admin" || userName === "admin1234" || userId === "admin" || userId === "admin1234";
        if (!isAdminUser) {
          // Firestore에서 관리자 권한 확인 (비동기)
          // 일단 기본 체크만 하고, 실제 권한은 각 페이지에서 확인
          if (!isAdminUser) {
            alert("관리자 권한이 필요합니다.");
            router.push("/");
            return;
          }
        }
        setIsAuthorized(true);
      } else {
        setIsAuthorized(true);
      }

      setIsLoading(false);
    };

    // Firebase Auth 상태 변경 감지
    const unsubscribe = onAuthChange((user) => {
      if (!user && requireAuth) {
        router.push(redirectTo);
      }
    });

    checkAuth();

    return () => unsubscribe();
  }, [router, requireAuth, requireAdmin, redirectTo]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
