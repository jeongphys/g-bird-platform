"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { getUserFromLocalStorage, isAdmin } from "@/lib/auth";
import { Order } from "@/types";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import Banner from "@/app/components/Banner";
import DashboardWidget from "@/app/components/DashboardWidget";
import FreeboardWidget from "@/app/components/FreeboardWidget";

export default function DashboardPage() {
  const router = useRouter();
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { userName: storedName, userId } = getUserFromLocalStorage();
    if (!storedName && !userId) {
      router.push("/auth/login");
      return;
    }

    setUserName(storedName || "");
    const adminStatus = storedName === "admin" || storedName === "admin1234" || 
                       (userId ? await isAdmin(userId) : false);
    setUserIsAdmin(!!adminStatus);
    setLoading(false);
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

  return (
    <div className="min-h-screen bg-gray-50">
      {userIsAdmin ? <AdminDashboard /> : <MemberDashboard userName={userName} />}
    </div>
  );
}

// 관리자 대시보드
function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    pendingOrders: 0,
    totalSessions: 0
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      // 회원 통계
      const usersSnap = await getDocs(collection(db, "users"));
      const users = usersSnap.docs.map(d => d.data());
      const totalMembers = users.length;
      const activeMembers = users.filter((u: any) => u.isActive).length;

      // 대기 중인 주문
      const ordersQuery = query(collection(db, "orders"), where("status", "==", "pending"));
      const ordersSnap = await getDocs(ordersQuery);
      const pendingOrders = ordersSnap.docs.length;

      // 최근 주문
      const allOrdersQuery = query(collection(db, "orders"), orderBy("createdAt", "desc"));
      const allOrdersSnap = await getDocs(allOrdersQuery);
      const recent = allOrdersSnap.docs.slice(0, 5).map(d => ({
        id: d.id,
        ...d.data()
      } as Order));

      // 세션 수
      const sessionsSnap = await getDocs(collection(db, "sessions"));
      const totalSessions = sessionsSnap.docs.length;

      setStats({
        totalMembers,
        activeMembers,
        pendingOrders,
        totalSessions
      });
      setRecentOrders(recent);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-4 shadow sticky top-0 z-20">
        <div className="flex justify-between items-center">
          <button onClick={() => router.push("/")} className="text-gray-500 font-bold">← 홈</button>
          <h1 className="text-xl font-bold">관리자 대시보드</h1>
          <button
            onClick={() => router.push("/admin")}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700"
          >
            관리 메뉴
          </button>
        </div>
      </div>

      <div className="p-4 max-w-6xl mx-auto">
        {loading ? (
          <div className="text-center py-10 text-gray-500">로딩 중...</div>
        ) : (
          <div className="space-y-6">
            {/* 통계 카드 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard title="전체 회원" value={stats.totalMembers} color="bg-blue-500" />
              <StatCard title="활동 회원" value={stats.activeMembers} color="bg-green-500" />
              <StatCard title="대기 주문" value={stats.pendingOrders} color="bg-yellow-500" />
              <StatCard title="총 세션" value={stats.totalSessions} color="bg-purple-500" />
            </div>

            {/* 빠른 링크 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4">빠른 링크</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <QuickLink title="출석 관리" onClick={() => router.push("/admin/attendance")} color="bg-blue-600" />
                <QuickLink title="회원 관리" onClick={() => router.push("/admin/members")} color="bg-purple-600" />
                <QuickLink title="회계 관리" onClick={() => router.push("/admin/accounting")} color="bg-green-600" />
                <QuickLink title="공지사항" onClick={() => router.push("/notice")} color="bg-orange-600" />
              </div>
            </div>

            {/* 최근 주문 */}
            {recentOrders.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-bold mb-4">최근 주문</h2>
                <div className="space-y-2">
                  {recentOrders.map(order => (
                    <div key={order.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <div>
                        <div className="font-bold">{order.userName}</div>
                        <div className="text-sm text-gray-500">
                          {format(new Date(order.createdAt), "yyyy.MM.dd HH:mm", { locale: ko })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-blue-600">{order.totalPrice?.toLocaleString()}원</div>
                        <div className={`text-xs px-2 py-1 rounded ${
                          order.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                          order.status === "approved" ? "bg-green-100 text-green-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {order.status === "pending" ? "대기" : order.status === "approved" ? "승인" : "반려"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 회원 대시보드 (메인페이지)
function MemberDashboard({ userName }: { userName: string }) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 헤더 */}
      <div className="bg-white p-4 shadow sticky top-0 z-20">
        <div className="flex justify-between items-center">
          <button onClick={() => router.push("/")} className="text-gray-500 font-bold">← 홈</button>
          <h1 className="text-xl font-bold">메인페이지</h1>
          <div className="w-10"></div>
        </div>
      </div>

      <div className="p-4 max-w-6xl mx-auto space-y-6">
        {/* 1. 배너 */}
        <Banner />

        {/* 2. 대시보드 위젯 (출석왕, 조별 점수) */}
        <DashboardWidget />

        {/* 3. 바로가기 버튼 4개 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold mb-4">빠른 메뉴</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickLink title="셔틀콕 구매" onClick={() => router.push("/purchase")} color="bg-blue-600" />
            <QuickLink title="공지사항" onClick={() => router.push("/notice")} color="bg-orange-600" />
            <QuickLink title="앨범" onClick={() => router.push("/album")} color="bg-purple-600" />
            <QuickLink title="회원정보" onClick={() => router.push("/profile")} color="bg-green-600" />
          </div>
        </div>

        {/* 4. 자유게시판 위젯 */}
        <FreeboardWidget />
      </div>
    </div>
  );
}

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-sm text-gray-600 mb-2">{title}</div>
      <div className={`text-3xl font-bold ${color.replace("bg-", "text-")}`}>{value}</div>
    </div>
  );
}

function QuickLink({ title, onClick, color }: { title: string; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      className={`${color} text-white p-4 rounded-lg font-bold hover:opacity-90 transition text-center`}
    >
      {title}
    </button>
  );
}

