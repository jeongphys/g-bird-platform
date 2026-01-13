"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, writeBatch, setDoc, query, where } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function AttendanceAdmin() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("master");
  const [semesters, setSemesters] = useState<string[]>([]);
  
  // 초기 데이터 로드
  useEffect(() => {
    const fetchSemesters = async () => {
      const snap = await getDocs(collection(db, "semesters"));
      const list = snap.docs.map(d => d.id).sort().reverse();
      setSemesters(list);
    };
    fetchSemesters();
  }, []);

  const handleAddSemester = async () => {
    const name = prompt("새 학기 이름을 입력하세요 (예: 2025-summer)");
    if (!name) return;
    if (semesters.includes(name)) return alert("이미 존재하는 학기입니다.");
    await setDoc(doc(db, "semesters", name), { createdAt: new Date() });
    setSemesters([name, ...semesters]);
    setActiveTab(name);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 상단 네비게이션 */}
      <div className="bg-white p-4 shadow sticky top-0 z-20">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => router.push("/admin")} className="text-gray-500 font-bold">← 메뉴</button>
          <h1 className="text-xl font-bold">출석/활동 관리</h1>
          <button onClick={handleAddSemester} className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm font-bold">+ 학기추가</button>
        </div>

        {/* 탭 목록 */}
        <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
          <button
            onClick={() => setActiveTab("master")}
            className={`whitespace-nowrap px-4 py-2 rounded-full font-bold text-sm transition ${
              activeTab === "master" ? "bg-blue-800 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            📂 전체기록 (Master)
          </button>
          {semesters.map(sem => (
            <button
              key={sem}
              onClick={() => setActiveTab(sem)}
              className={`whitespace-nowrap px-4 py-2 rounded-full font-bold text-sm transition ${
                activeTab === sem ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {sem}
            </button>
          ))}
        </div>
      </div>

      {/* 본문 콘텐츠 */}
      <div className="p-4 max-w-4xl mx-auto">
        {activeTab === "master" ? (
          <MasterTableView semesters={semesters} />
        ) : (
          <SemesterManager semester={activeTab} />
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 컴포넌트 1: 학기별 매니저 (출석부 <-> 명단수정 모드 전환)
// ============================================================================
function SemesterManager({ semester }: { semester: string }) {
  // 모드 상태: 'board'(출석부) 또는 'edit'(명단수정)
  const [mode, setMode] = useState<"board" | "edit">("board");

  if (mode === "edit") {
    return <SemesterMemberEditor semester={semester} onFinish={() => setMode("board")} />;
  }

  return <AttendanceBoard semester={semester} onEditRequest={() => setMode("edit")} />;
}

// ============================================================================
// 컴포넌트 2: 출석부 (Attendance Board) - 운영 모드
// ============================================================================
function AttendanceBoard({ semester, onEditRequest }: any) {
  const [activeMembers, setActiveMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 해당 학기에 활동(O)하는 회원만 불러오기
  const fetchActiveMembers = async () => {
    setLoading(true);
    // Firestore 쿼리 제약상 전체를 가져와서 필터링 (데이터 규모가 작으므로 안전)
    const snap = await getDocs(collection(db, "users"));
    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // 필터링: history.[semester] === "O"
    const filtered = list.filter((m: any) => m.history?.[semester] === "O");
    
    // 정렬
    filtered.sort((a: any, b: any) => a.name.localeCompare(b.name));
    setActiveMembers(filtered);
    setLoading(false);
  };

  useEffect(() => { fetchActiveMembers(); }, [semester]);

  return (
    <div className="bg-white rounded-lg shadow min-h-[400px]">
      {/* 헤더 */}
      <div className="p-4 border-b flex justify-between items-center bg-blue-50">
        <div>
          <h2 className="font-bold text-lg text-blue-900">📅 {semester} 출석부</h2>
          <p className="text-xs text-blue-700">총 {activeMembers.length}명 활동 중</p>
        </div>
        <button 
          onClick={onEditRequest}
          className="bg-white border border-blue-200 text-blue-700 px-3 py-1.5 rounded text-sm font-bold shadow-sm hover:bg-blue-50"
        >
          ⚙️ 명단 수정
        </button>
      </div>

      {/* 출석부 본문 (다음 대화에서 여기에 출석 체크 기능을 넣을 예정) */}
      <div className="p-6">
        {loading ? (
          <div className="text-center text-gray-400 py-10">로딩 중...</div>
        ) : activeMembers.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500 mb-4">아직 활동 회원이 설정되지 않았습니다.</p>
            <button onClick={onEditRequest} className="text-blue-600 underline font-bold">
              명단 설정하러 가기
            </button>
          </div>
        ) : (
          <div>
            {/* 임시 리스트 표시 (추후 QR/버튼 출석 시스템으로 대체될 공간) */}
            <div className="mb-4 text-sm text-gray-500 text-center">
              ↓ 다음 단계에서 여기에 <b>자동 출석 시스템</b>이 들어갑니다 ↓
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {activeMembers.map(m => (
                <div key={m.id} className="border rounded p-3 text-center bg-gray-50">
                  <div className="font-bold text-gray-800">{m.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    현재점수: <span className="font-bold text-blue-600">{m.attendanceScore || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 컴포넌트 3: 명단 수정 (Member Editor) - 설정 모드
// ============================================================================
function SemesterMemberEditor({ semester, onFinish }: any) {
  const [members, setMembers] = useState<any[]>([]);
  const [localCheck, setLocalCheck] = useState<{[key:string]: boolean}>({});
  const [isChanged, setIsChanged] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const loadData = async () => {
      const snap = await getDocs(collection(db, "users"));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => a.name.localeCompare(b.name));
      setMembers(list);

      // 기존 체크 상태 로드
      const checks: any = {};
      list.forEach((m: any) => {
        if (m.history?.[semester] === "O") checks[m.id] = true;
      });
      setLocalCheck(checks);
      setIsChanged(false);
    };
    loadData();
  }, [semester]);

  const toggleCheck = (id: string) => {
    setLocalCheck(prev => ({ ...prev, [id]: !prev[id] }));
    setIsChanged(true);
  };

  const save = async () => {
    if(!confirm(`[${semester}] 명단을 저장하고 출석부로 돌아갑니다.`)) return;
    const batch = writeBatch(db);
    
    members.forEach((m) => {
      const isActive = localCheck[m.id];
      const ref = doc(db, "users", m.id);
      // history 필드만 업데이트 (기존 attendanceScore 등은 절대 건드리지 않음 -> Rigid)
      batch.update(ref, { [`history.${semester}`]: isActive ? "O" : "X" });
    });

    await batch.commit();
    onFinish(); // 저장 후 뷰 모드로 복귀
  };

  const filtered = members.filter(m => m.name.includes(searchTerm));

  return (
    <div className="bg-white rounded-lg shadow h-[600px] flex flex-col">
      <div className="p-4 border-b bg-gray-100 flex justify-between items-center">
        <h2 className="font-bold text-gray-700">⚙️ {semester} 명단 설정</h2>
        <div className="flex gap-2">
          <button onClick={onFinish} className="px-3 py-1 text-gray-500 text-sm">취소</button>
          <button onClick={save} disabled={!isChanged} className={`px-4 py-1 rounded font-bold text-sm shadow ${isChanged?"bg-blue-600 text-white":"bg-gray-300 text-gray-500"}`}>
            저장 후 완료
          </button>
        </div>
      </div>

      <div className="p-2 border-b">
        <input 
          placeholder="이름 검색..." 
          value={searchTerm} 
          onChange={e=>setSearchTerm(e.target.value)}
          className="w-full p-2 border rounded text-sm text-black"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {filtered.map(m => (
          <div key={m.id} onClick={()=>toggleCheck(m.id)} className={`flex items-center p-3 border-b cursor-pointer ${localCheck[m.id]?'bg-blue-50':''}`}>
            <input type="checkbox" checked={!!localCheck[m.id]} readOnly className="w-5 h-5 mr-3 accent-blue-600" />
            <div>
              <div className="font-bold text-gray-800">{m.name}</div>
              <div className="text-xs text-gray-500">
                {m.studentId} | 누적점수: {m.attendanceScore || 0}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// 컴포넌트 4: 전체 기록 뷰 (Master) - 기존 유지
// ============================================================================
function MasterTableView({ semesters }: any) {
  const [members, setMembers] = useState<any[]>([]);
  useEffect(() => {
    getDocs(collection(db, "users")).then(snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => a.name.localeCompare(b.name));
      setMembers(list);
    });
  }, []);

  return (
    <div className="bg-white rounded shadow overflow-x-auto">
      <table className="w-full text-sm text-left whitespace-nowrap">
        <thead className="bg-gray-100 border-b">
          <tr>
            <th className="p-3 sticky left-0 bg-gray-100 border-r">이름</th>
            {semesters.map((s: string) => <th key={s} className="p-3 border-r text-center">{s}</th>)}
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} className="border-b hover:bg-gray-50">
              <td className="p-3 sticky left-0 bg-white border-r font-bold">{m.name}</td>
              {semesters.map((s: string) => (
                <td key={s} className="p-3 text-center border-r">
                  {m.history?.[s] === "O" ? <span className="text-green-600 font-bold">O</span> : <span className="text-gray-300">-</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}