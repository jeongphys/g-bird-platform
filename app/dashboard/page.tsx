"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { getUserFromLocalStorage, isAdmin } from "@/lib/auth";
import { Order, Session, Notice, FreeboardPost } from "@/types";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

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

// 회원 대시보드
function MemberDashboard({ userName }: { userName: string }) {
  const router = useRouter();
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [recentNotices, setRecentNotices] = useState<Notice[]>([]);
  const [recentFreeboard, setRecentFreeboard] = useState<FreeboardPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllData();
  }, [userName]);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadMyOrders(),
      loadRecentNotices(),
      loadRecentFreeboard()
    ]);
    setLoading(false);
  };

  const loadMyOrders = async () => {
    if (!userName) return;

    try {
      const ordersQuery = query(
        collection(db, "orders"),
        where("userName", "==", userName),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(ordersQuery);
      const orders = snapshot.docs.slice(0, 5).map(d => ({
        id: d.id,
        ...d.data()
      } as Order));
      setMyOrders(orders);
    } catch (error) {
      console.error("Error loading orders:", error);
    }
  };

  const loadRecentNotices = async () => {
    try {
      const noticesCol = collection(db, "notices");
      // createdAt으로 정렬 (order 필드는 클라이언트에서 정렬)
      const q = query(noticesCol, orderBy("createdAt", "desc"));
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

      setRecentNotices(list.slice(0, 5));
    } catch (error) {
      console.error("Error loading notices:", error);
    }
  };

  const loadRecentFreeboard = async () => {
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
      setRecentFreeboard(list.slice(0, 5));
    } catch (error) {
      console.error("Error loading freeboard:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-4 shadow sticky top-0 z-20">
        <div className="flex justify-between items-center">
          <button onClick={() => router.push("/")} className="text-gray-500 font-bold">← 홈</button>
          <h1 className="text-xl font-bold">대시보드</h1>
          <div className="w-10"></div>
        </div>
      </div>

      <div className="p-4 max-w-6xl mx-auto">
        {loading ? (
          <div className="text-center py-10 text-gray-500">로딩 중...</div>
        ) : (
          <div className="space-y-6">
            {/* 환영 메시지 및 빠른 링크 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">안녕하세요, {userName}님! 👋</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <QuickLink title="셔틀콕 구매" onClick={() => router.push("/purchase")} color="bg-blue-600" />
                <QuickLink title="공지사항" onClick={() => router.push("/notice")} color="bg-orange-600" />
                <QuickLink title="자유게시판" onClick={() => router.push("/freeboard")} color="bg-pink-600" />
                <QuickLink title="앨범" onClick={() => router.push("/album")} color="bg-purple-600" />
              </div>
            </div>

            {/* 위젯 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 공지사항 위젯 */}
              <WidgetCard
                title="📢 최신 공지사항"
                onViewAll={() => router.push("/notice")}
              >
                {recentNotices.length === 0 ? (
                  <p className="text-gray-400 text-sm">공지사항이 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {recentNotices.map(notice => (
                      <div
                        key={notice.id}
                        onClick={() => router.push(`/notice/${notice.id}`)}
                        className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {notice.isPinned && (
                            <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">고정</span>
                          )}
                          <h3 className="font-bold text-sm text-gray-800 line-clamp-1">{notice.title}</h3>
                        </div>
                        <p className="text-xs text-gray-500">
                          {format(new Date(notice.createdAt), "MM월 dd일", { locale: ko })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </WidgetCard>

              {/* 자유게시판 위젯 */}
              <WidgetCard
                title="💬 최신 자유게시판"
                onViewAll={() => router.push("/freeboard")}
              >
                {recentFreeboard.length === 0 ? (
                  <p className="text-gray-400 text-sm">게시글이 없습니다.</p>
                ) : (
                  <div className="space-y-2">
                    {recentFreeboard.map(post => {
                      const colorClasses = [
                        { bg: "bg-yellow-50", border: "border-yellow-300" },
                        { bg: "bg-pink-50", border: "border-pink-300" },
                        { bg: "bg-blue-50", border: "border-blue-300" },
                        { bg: "bg-green-50", border: "border-green-300" },
                        { bg: "bg-purple-50", border: "border-purple-300" },
                      ];
                      const color = colorClasses[(post.color - 1) || 0];
                      return (
                        <div
                          key={post.id}
                          onClick={() => router.push("/freeboard")}
                          className={`p-3 ${color.bg} border ${color.border} rounded-lg cursor-pointer hover:opacity-80 transition`}
                        >
                          <p className="text-sm text-gray-800 line-clamp-2 mb-1">{post.content}</p>
                          <p className="text-xs text-gray-500">
                            {post.author} · {format(new Date(post.createdAt), "MM월 dd일", { locale: ko })}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </WidgetCard>
            </div>

            {/* 내 주문 내역 위젯 */}
            {myOrders.length > 0 && (
              <WidgetCard
                title="🛒 내 주문 내역"
                onViewAll={() => router.push("/purchase")}
              >
                <div className="space-y-2">
                  {myOrders.map(order => (
                    <div key={order.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-bold text-sm">{order.items?.join(", ")}</div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(order.createdAt), "yyyy.MM.dd HH:mm", { locale: ko })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-blue-600 text-sm">{order.totalPrice?.toLocaleString()}원</div>
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
              </WidgetCard>
            )}
          </div>
        )}
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

function WidgetCard({ 
  title, 
  children, 
  onViewAll 
}: { 
  title: string; 
  children: React.ReactNode; 
  onViewAll?: () => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">{title}</h2>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
          >
            전체보기 →
          </button>
        )}
      </div>
      {children}
    </div>
  );
}
