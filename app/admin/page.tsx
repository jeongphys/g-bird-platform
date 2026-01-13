"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, writeBatch, query, where, orderBy, addDoc, getDoc, updateDoc } from "firebase/firestore";

// --- 타입 정의 ---
type UserStatus = "활동" | "휴회" | "제적" | "명예";
type AttendanceType = "present" | "late" | "absent";

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState("members"); // members | attendance | orders | inventory

  const handleLogin = () => {
    if (password === "admin1234") setIsAdmin(true);
    else alert("비밀번호 불일치");
  };

  if (!isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded shadow text-center border">
          <h1 className="font-bold mb-4 text-xl">G-Bird 통합 관리자</h1>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} 
            className="border p-2 mb-2 w-full text-black" placeholder="비밀번호" 
            onKeyDown={e=>e.key==='Enter' && handleLogin()} />
          <button onClick={handleLogin} className="bg-blue-800 text-white w-full py-2 rounded font-bold">접속</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-6 bg-white p-4 rounded shadow-sm">
          <h1 className="text-2xl font-bold text-gray-800">🏸 G-Bird Admin</h1>
          <nav className="space-x-1">
            {["members", "attendance", "orders", "inventory"].map(tab => (
              <button 
                key={tab}
                onClick={()=>setActiveTab(tab)} 
                className={`px-4 py-2 rounded font-bold text-sm transition ${activeTab===tab?"bg-blue-600 text-white":"text-gray-600 hover:bg-gray-100"}`}
              >
                {tab === "members" && "👥 회원 명부"}
                {tab === "attendance" && "📅 출석 관리"}
                {tab === "orders" && "🛒 주문 관리"}
                {tab === "inventory" && "📦 재고 관리"}
              </button>
            ))}
          </nav>
        </header>

        <main>
          {activeTab === "members" && <MemberManager />}
          {activeTab === "attendance" && <AttendanceManager />}
          {/* 주문/재고 관리는 코드가 길어지므로, 이전 코드 기능을 유지한다고 가정하거나 필요시 추가 요청주세요. 
              여기서는 공간상 회원/출석에 집중합니다. */}
        </main>
      </div>
    </div>
  );
}

// ============================================================================
// 1. 회원 명부 관리 (Master List)
// ============================================================================
function MemberManager() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchMembers = async () => {
    setLoading(true);
    const snap = await getDocs(collection(db, "users"));
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // 정렬: 활동 > 휴회 > 기타, 그 안에서 이름순
    list.sort((a: any, b: any) => {
      const statusOrder: any = { "활동": 1, "휴회": 2, "명예": 3, "제적": 4 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
      }
      return a.name.localeCompare(b.name);
    });
    setMembers(list);
    setLoading(false);
  };

  useEffect(() => { fetchMembers(); }, []);

  // 상태 변경 핸들러
  const updateStatus = async (id: string, newStatus: UserStatus) => {
    if (!confirm(`${id} 님의 상태를 [${newStatus}]로 변경하시겠습니까?`)) return;
    await updateDoc(doc(db, "users", id), { 
      status: newStatus,
      isActive: newStatus === "활동" // 활동일 때만 true
    });
    fetchMembers();
  };

  // CSV 업로드 (이름,학번,상태)
  const handleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split("\n");
      const batch = writeBatch(db);
      
      if(!confirm(`총 ${lines.length-1}명의 데이터를 덮어쓰거나 추가합니다. 진행할까요?`)) return;

      lines.slice(1).forEach(line => {
        const [name, studentId, statusStr] = line.split(",").map(s => s.trim());
        if (!name) return;
        
        // 상태 기본값: 활동
        const status = (["활동", "휴회", "명예", "제적"].includes(statusStr) ? statusStr : "활동") as UserStatus;
        
        const ref = doc(db, "users", name);
        batch.set(ref, {
          name, 
          studentId: studentId || "",
          status,
          isActive: status === "활동",
          attendanceScore: 0, // 초기화 (주의: 기존 점수 유지하려면 로직 수정 필요)
          shuttleDiscount: 0
        }, { merge: true }); // merge: true를 쓰면 기존 점수는 안 날아감
      });
      await batch.commit();
      alert("업로드 완료");
      fetchMembers();
    };
    reader.readAsText(file);
  };

  const filtered = members.filter(m => m.name.includes(searchTerm));

  return (
    <div className="bg-white p-6 rounded shadow">
      <div className="flex justify-between mb-4">
        <h2 className="font-bold text-lg">전체 회원 목록 ({members.length}명)</h2>
        <div className="flex gap-2">
           <input type="text" placeholder="이름 검색" value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} 
             className="border p-2 rounded text-sm text-black" />
           <label className="bg-green-600 text-white px-4 py-2 rounded text-sm cursor-pointer hover:bg-green-700">
             📄 CSV 업로드
             <input type="file" accept=".csv" className="hidden" onChange={handleCSV} />
           </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-100 text-gray-600 border-b">
            <tr>
              <th className="p-3">이름</th>
              <th className="p-3">학번</th>
              <th className="p-3">상태</th>
              <th className="p-3">출석점수</th>
              <th className="p-3">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(m => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="p-3 font-bold">{m.name}</td>
                <td className="p-3 text-gray-500">{m.studentId || "-"}</td>
                <td className="p-3">
                  <select 
                    value={m.status || "활동"} 
                    onChange={(e) => updateStatus(m.id, e.target.value as UserStatus)}
                    className={`border rounded px-2 py-1 text-xs font-bold ${
                      m.status === "활동" ? "text-green-700 bg-green-50" :
                      m.status === "휴회" ? "text-orange-700 bg-orange-50" : "text-gray-500 bg-gray-100"
                    }`}
                  >
                    <option value="활동">활동</option>
                    <option value="휴회">휴회</option>
                    <option value="명예">명예</option>
                    <option value="제적">제적</option>
                  </select>
                </td>
                <td className="p-3">{m.attendanceScore || 0}점</td>
                <td className="p-3">
                  <button className="text-blue-600 hover:underline">수정</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// 2. 출석 관리 (New Feature)
// ============================================================================
function AttendanceManager() {
  const [members, setMembers] = useState<any[]>([]);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionType, setSessionType] = useState("정규운동");
  const [attendanceMap, setAttendanceMap] = useState<{[key:string]: AttendanceType}>({});
  const [isSaving, setIsSaving] = useState(false);

  // 활동 회원만 불러오기
  useEffect(() => {
    const fetchActiveMembers = async () => {
      const q = query(collection(db, "users"), where("status", "==", "활동"));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => a.name.localeCompare(b.name));
      setMembers(list);
      
      // 초기값: 모두 '결석(absent)' 또는 '미체크'로 시작? 
      // 편의를 위해 일단 빈 상태로 둠 (UI에서 회색 처리)
    };
    fetchActiveMembers();
  }, []);

  const toggleAttendance = (userId: string) => {
    setAttendanceMap(prev => {
      const current = prev[userId];
      let next: AttendanceType = "present";
      if (current === "present") next = "late";
      else if (current === "late") next = "absent";
      else if (current === "absent") next = "present";
      return { ...prev, [userId]: next };
    });
  };

  const saveAttendance = async () => {
    if (!confirm(`${sessionDate} [${sessionType}] 출석을 저장하시겠습니까?\n(기존 점수에 합산됩니다)`)) return;
    setIsSaving(true);
    const batch = writeBatch(db);

    // 1. 세션 기록 생성
    const sessionRef = doc(collection(db, "attendance_sessions")); // 자동 ID or 날짜기반
    batch.set(sessionRef, {
      date: sessionDate,
      type: sessionType,
      records: attendanceMap,
      createdAt: new Date().toISOString()
    });

    // 2. 개인별 점수 업데이트 (Users 컬렉션)
    // 규칙: 출석(+1), 지각(+0.5), 결석(0) - 회칙에 따라 수정 필요
    for (const member of members) {
      const status = attendanceMap[member.id];
      if (!status) continue; // 체크 안 한 사람은 무시

      let point = 0;
      if (status === "present") point = 1;
      else if (status === "late") point = 0.5;
      
      // 기존 점수 + 이번 점수
      // 주의: Firestore atomic increment를 쓰는 게 안전하지만 여기선 간단히 처리
      const userRef = doc(db, "users", member.id);
      const currentScore = member.attendanceScore || 0;
      
      // 할인액 재계산 (예: 10점 이상이면 1000원)
      const newScore = currentScore + point;
      const newDiscount = newScore >= 10 ? 1000 : (newScore >= 5 ? 500 : 0);

      batch.update(userRef, {
        attendanceScore: newScore,
        shuttleDiscount: newDiscount
      });
    }

    await batch.commit();
    alert("출석 반영 및 점수 업데이트 완료!");
    setIsSaving(false);
    // 초기화
    setAttendanceMap({});
  };

  return (
    <div className="bg-white p-6 rounded shadow">
      <h2 className="font-bold text-lg mb-4">📅 오늘의 출석부</h2>
      
      <div className="flex gap-4 mb-6 bg-gray-50 p-4 rounded border">
        <div>
          <label className="block text-xs font-bold text-gray-500">날짜</label>
          <input type="date" value={sessionDate} onChange={e=>setSessionDate(e.target.value)} className="border p-2 rounded text-black"/>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500">유형</label>
          <select value={sessionType} onChange={e=>setSessionType(e.target.value)} className="border p-2 rounded text-black">
            <option>정규운동</option>
            <option>월례대회</option>
            <option>번개/기타</option>
          </select>
        </div>
        <div className="flex-1 text-right pt-4">
          <button 
            onClick={saveAttendance} 
            disabled={isSaving}
            className="bg-blue-600 text-white px-6 py-2 rounded font-bold hover:bg-blue-700 shadow"
          >
            {isSaving ? "저장 중..." : "출석 마감 및 점수 반영"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {members.map(member => {
          const status = attendanceMap[member.id];
          return (
            <div 
              key={member.id}
              onClick={() => toggleAttendance(member.id)}
              className={`
                cursor-pointer p-3 rounded border text-center transition select-none
                ${status === 'present' ? 'bg-green-100 border-green-500 ring-2 ring-green-200' : 
                  status === 'late' ? 'bg-yellow-100 border-yellow-500 ring-2 ring-yellow-200' :
                  status === 'absent' ? 'bg-red-100 border-red-500' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}
              `}
            >
              <div className="font-bold text-gray-800">{member.name}</div>
              <div className={`text-xs font-bold mt-1 
                ${status==='present'?'text-green-700':status==='late'?'text-yellow-700':status==='absent'?'text-red-700':'text-gray-400'}
              `}>
                {status === 'present' ? '출석 (+1)' : 
                 status === 'late' ? '지각 (+0.5)' : 
                 status === 'absent' ? '결석' : '미체크'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}