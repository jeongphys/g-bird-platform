"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  getDocs, 
  doc, 
  writeBatch, 
  setDoc, 
  getDoc,
  onSnapshot,
  updateDoc 
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

export default function AttendanceAdmin() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("master");
  const [semesters, setSemesters] = useState<string[]>([]);

  // 초기 학기 목록 로드
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
      <div className="bg-white p-4 shadow sticky top-0 z-20 print:hidden">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => router.push("/admin")} className="text-gray-500 font-bold">← 메뉴</button>
          <h1 className="text-xl font-bold">출석 관리 시스템</h1>
          <button onClick={handleAddSemester} className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm font-bold">+ 학기추가</button>
        </div>
        <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
          <button onClick={() => setActiveTab("master")} className={`whitespace-nowrap px-4 py-2 rounded-full font-bold text-sm transition ${activeTab === "master" ? "bg-blue-800 text-white" : "bg-gray-100 text-gray-600"}`}>
            📂 전체기록
          </button>
          {semesters.map(sem => (
            <button key={sem} onClick={() => setActiveTab(sem)} className={`whitespace-nowrap px-4 py-2 rounded-full font-bold text-sm transition ${activeTab === sem ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}>
              {sem}
            </button>
          ))}
        </div>
      </div>

      {/* 본문 */}
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
// 컴포넌트 1: 학기별 매니저
// ============================================================================
function SemesterManager({ semester }: { semester: string }) {
  const [mode, setMode] = useState<"session" | "edit">("session");

  if (mode === "edit") return <SemesterMemberEditor semester={semester} onFinish={() => setMode("session")} />;
  return <DailySessionManager semester={semester} onEditRequest={() => setMode("edit")} />;
}

// ============================================================================
// 컴포넌트 2: 오늘의 운동 관리 (투표 + QR + 실시간 현황 모니터링)
// ============================================================================
function DailySessionManager({ semester, onEditRequest }: any) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [members, setMembers] = useState<any[]>([]);
  
  // 상태 관리
  const [voteData, setVoteData] = useState<{[key:string]: string}>({});
  const [attendanceData, setAttendanceData] = useState<{[key:string]: any}>({}); // 실제 출석 데이터
  const [staticCode, setStaticCode] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [isSessionCreated, setIsSessionCreated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 1. 회원 목록 로드
  useEffect(() => {
    const loadMembers = async () => {
      const snap = await getDocs(collection(db, "users"));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const active = list.filter((m: any) => m.history?.[semester] === "O");
      active.sort((a: any, b: any) => a.name.localeCompare(b.name));
      setMembers(active);
    };
    loadMembers();
  }, [semester]);

  // 2. [핵심] 세션 실시간 동기화
  useEffect(() => {
    const sessionRef = doc(db, "sessions", date);
    
    const unsubscribe = onSnapshot(sessionRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setIsSessionCreated(true);
        setVoteData(data.voteData || {});
        setAttendanceData(data.attendances || {});
        setStaticCode(data.validCode);
        
        if (data.validCode) {
          setQrUrl(`${window.location.origin}/attend/check?date=${date}&code=${data.validCode}`);
        }
      } else {
        setIsSessionCreated(false);
        setAttendanceData({});
        setQrUrl("");
      }
    });

    return () => unsubscribe();
  }, [date]);

  const setAllVotes = (status: string) => {
    const next = { ...voteData };
    members.forEach(m => next[m.id] = status);
    setVoteData(next);
  };

  const createOrUpdateSession = async () => {
    const isUpdate = isSessionCreated;
    const msg = isUpdate 
      ? "투표 현황을 수정하시겠습니까?" 
      : `${date} 출석 세션을 생성하시겠습니까?`;
      
    if (!confirm(msg)) return;
    setIsLoading(true);

    try {
      let code = staticCode;
      if (!code) code = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      await setDoc(doc(db, "sessions", date), {
        date,
        semester,
        type: "qr-static",
        validCode: code,
        voteData: voteData,
        status: "open",
        updatedAt: new Date().toISOString()
      }, { merge: true }); 

      setStaticCode(code);
      if (!isSessionCreated) alert("세션이 생성되었습니다!");
      else alert("저장되었습니다.");

    } catch (e) {
      alert("오류가 발생했습니다.");
    }
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6 print:hidden">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-lg">📅 오늘의 운동 현황판</h2>
          <button onClick={onEditRequest} className="text-sm bg-white border px-3 py-1 rounded hover:bg-gray-50">
            ⚙️ 명단 수정
          </button>
        </div>

        <div className="mb-4 flex items-center gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">날짜</label>
            <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="border p-2 rounded text-black"/>
          </div>
          {isSessionCreated && (
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-bold animate-pulse">
              ● 실시간 모니터링 중
            </span>
          )}
        </div>

        <div className="border rounded bg-white mb-6 overflow-hidden">
          <div className="flex justify-between p-3 bg-gray-50 border-b items-center">
            <span className="font-bold text-sm">📋 출석 현황</span>
            <div className="space-x-1">
              <span className="text-xs text-gray-400 mr-2">투표 일괄적용:</span>
              <button onClick={()=>setAllVotes("attend")} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold">참석</button>
              <button onClick={()=>setAllVotes("absent")} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded font-bold">불참</button>
            </div>
          </div>
          
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm text-center">
              <thead className="text-gray-500 bg-gray-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="p-2 text-left pl-4 w-24">이름</th>
                  <th className="p-2 w-40">🗳 투표</th>
                  <th className="p-2">📍 실제 출석 (QR)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {members.map(m => {
                  const actual = attendanceData[m.id];
                  return (
                    <tr key={m.id} className={actual ? "bg-green-50/50" : ""}>
                      <td className="p-2 text-left pl-4 font-bold">{m.name}</td>
                      <td className="p-2">
                        <div className="flex justify-center gap-2">
                          {["attend", "absent", "none"].map(type => (
                            <label key={type} className="cursor-pointer flex items-center">
                              <input 
                                type="radio" 
                                name={`vote-${m.id}`}
                                checked={voteData[m.id] === type} 
                                onChange={()=>setVoteData(prev=>({...prev, [m.id]: type}))}
                                className={`w-4 h-4 ${type==='attend'?'accent-green-600':type==='absent'?'accent-red-600':'accent-gray-400'}`}
                              />
                            </label>
                          ))}
                        </div>
                      </td>
                      <td className="p-2 text-left">
                        {actual ? (
                          <div>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              ✅ 출석완료
                            </span>
                            <span className="text-xs text-gray-400 ml-2">
                              {new Date(actual.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                            </span>
                            {actual.warning && (
                              <div className="text-xs text-red-600 font-bold mt-1">
                                🚨 {actual.warning}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <button onClick={createOrUpdateSession} disabled={isLoading} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700">
          {isSessionCreated ? "투표 현황 저장하기" : "세션 생성 및 QR 띄우기"}
        </button>
      </div>

      {qrUrl && (
        <div className="bg-white rounded-lg shadow p-8 text-center border-2 border-blue-100">
          <h3 className="text-2xl font-bold mb-6">{date} G-Bird 출석체크</h3>
          <div className="inline-block border-4 border-black p-4 rounded-xl mb-4 bg-white">
            <QRCodeSVG value={qrUrl} size={250} level={"H"} />
          </div>
          <p className="font-mono text-gray-500 mb-6 tracking-widest text-lg">{staticCode}</p>
          
          <div className="print:hidden space-y-2">
            <p className="text-sm text-gray-600 mb-4">
              회원들은 카메라로 위 코드를 스캔하세요.<br/>
              (관리자는 위 현황판에서 실시간으로 출석 여부를 확인할 수 있습니다)
            </p>
            <button onClick={() => window.print()} className="bg-gray-800 text-white px-6 py-2 rounded font-bold hover:bg-black">
              🖨 QR 인쇄하기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 컴포넌트 3: 명단 수정 (기존과 동일)
// ============================================================================
function SemesterMemberEditor({ semester, onFinish }: any) {
  const [members, setMembers] = useState<any[]>([]);
  const [localCheck, setLocalCheck] = useState<{[key:string]: boolean}>({});
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(collection(db, "users"));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => a.name.localeCompare(b.name));
      setMembers(list);
      const checks: any = {};
      list.forEach((m: any) => { if (m.history?.[semester] === "O") checks[m.id] = true; });
      setLocalCheck(checks);
    };
    load();
  }, [semester]);

  const save = async () => {
    if(!confirm("저장하시겠습니까?")) return;
    const batch = writeBatch(db);
    members.forEach(m => {
      const isActive = localCheck[m.id];
      batch.update(doc(db, "users", m.id), { [`history.${semester}`]: isActive ? "O" : "X" });
    });
    await batch.commit();
    onFinish();
  };

  const filtered = members.filter(m => m.name.includes(searchTerm));

  return (
    <div className="bg-white rounded-lg shadow h-[600px] flex flex-col">
      <div className="p-4 bg-gray-100 flex justify-between items-center border-b">
        <h2 className="font-bold">⚙️ {semester} 명단 설정</h2>
        <div className="space-x-2">
          <button onClick={onFinish} className="px-3 py-1 text-sm text-gray-500">취소</button>
          <button onClick={save} className="px-4 py-1 bg-blue-600 text-white rounded font-bold text-sm">저장</button>
        </div>
      </div>
      <div className="p-2 border-b"><input placeholder="이름 검색..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="w-full p-2 border rounded text-black"/></div>
      <div className="flex-1 overflow-y-auto p-2">
        {filtered.map(m => (
          <div key={m.id} onClick={()=>setLocalCheck(p=>({...p, [m.id]: !p[m.id]}))} className={`flex items-center p-3 border-b cursor-pointer ${localCheck[m.id]?'bg-blue-50':''}`}>
            <input type="checkbox" checked={!!localCheck[m.id]} readOnly className="w-5 h-5 mr-3 accent-blue-600" />
            <div><div className="font-bold text-gray-800">{m.name}</div><div className="text-xs text-gray-500">{m.studentId}</div></div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// 컴포넌트 4: 전체 기록 뷰 (기존과 동일)
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
          <tr><th className="p-3 sticky left-0 bg-gray-100 border-r">이름</th>{semesters.map((s:string) => <th key={s} className="p-3 border-r text-center">{s}</th>)}</tr>
        </thead>
        <tbody>
          {members.map(m => (
            <tr key={m.id} className="border-b hover:bg-gray-50">
              <td className="p-3 sticky left-0 bg-white border-r font-bold">{m.name}</td>
              {semesters.map((s:string) => <td key={s} className="p-3 text-center border-r">{m.history?.[s]==="O"?<span className="text-green-600 font-bold">O</span>:<span className="text-gray-300">-</span>}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}