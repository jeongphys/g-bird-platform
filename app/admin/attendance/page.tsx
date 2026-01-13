// app/admin/attendance/page.tsx
"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, writeBatch, setDoc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function AttendanceAdmin() {
  const router = useRouter();
  // 탭 관리: 'master'는 활동정보, 나머지는 학기 이름(예: '2025-summer')
  const [activeTab, setActiveTab] = useState("master");
  const [semesters, setSemesters] = useState<string[]>([]); // 학기 목록
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 초기 데이터 로드
  useEffect(() => {
    // 1. 학기 목록 불러오기 (semesters 컬렉션 혹은 설정 문서 사용)
    const fetchSemesters = async () => {
      // 편의상 semesters 컬렉션에 문서 ID로 학기 이름을 저장한다고 가정
      const snap = await getDocs(collection(db, "semesters"));
      const list = snap.docs.map(d => d.id).sort().reverse(); // 최신순
      setSemesters(list);
    };

    // 2. 회원 전체 불러오기
    const fetchMembers = async () => {
      const snap = await getDocs(collection(db, "users"));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => a.name.localeCompare(b.name));
      setMembers(list);
    };

    fetchSemesters();
    fetchMembers();
  }, []);

  // 새 학기 탭 추가
  const handleAddSemester = async () => {
    const name = prompt("새 학기 이름을 입력하세요 (예: 2025-summer)");
    if (!name) return;
    if (semesters.includes(name)) return alert("이미 존재하는 학기입니다.");

    // DB에 학기 정보 저장
    await setDoc(doc(db, "semesters", name), { createdAt: new Date() });
    setSemesters([name, ...semesters]);
    setActiveTab(name);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 상단 네비게이션 */}
      <div className="bg-white p-4 shadow sticky top-0 z-10">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => router.push("/admin")} className="text-gray-500 font-bold">← 메뉴</button>
          <h1 className="text-xl font-bold">출석/활동 관리</h1>
          <button onClick={handleAddSemester} className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm font-bold">+ 학기추가</button>
        </div>

        {/* 가로 스크롤 탭 */}
        <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
          <button
            onClick={() => setActiveTab("master")}
            className={`whitespace-nowrap px-4 py-2 rounded-full font-bold text-sm transition ${
              activeTab === "master" ? "bg-blue-800 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            📂 활동정보 (Master)
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
      <div className="p-4">
        {activeTab === "master" ? (
          <MasterTableView members={members} semesters={semesters} />
        ) : (
          <SemesterCheckListView 
            semester={activeTab} 
            members={members} 
            refreshMembers={() => {
              // 멤버 목록 새로고침 (변경사항 반영)
              getDocs(collection(db, "users")).then(snap => {
                const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                list.sort((a: any, b: any) => a.name.localeCompare(b.name));
                setMembers(list);
              });
            }}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// 뷰 1: 활동정보 마스터 테이블 (스프레드시트 뷰)
// ---------------------------------------------------------
function MasterTableView({ members, semesters }: any) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <h2 className="font-bold">전체 활동 기록</h2>
        <p className="text-xs text-gray-500">모든 학기의 활동 여부를 한눈에 확인합니다.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-gray-100 text-gray-700 border-b">
            <tr>
              <th className="p-3 sticky left-0 bg-gray-100 z-10 border-r">이름</th>
              <th className="p-3 border-r">학번</th>
              {semesters.map((sem: string) => (
                <th key={sem} className="p-3 text-center border-r min-w-[80px]">{sem}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {members.map((m: any) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="p-3 sticky left-0 bg-white border-r font-bold">{m.name}</td>
                <td className="p-3 border-r text-gray-500">{m.studentId || "-"}</td>
                {semesters.map((sem: string) => {
                  // user.history 필드에 "O", "X" 등으로 저장된다고 가정
                  const status = m.history?.[sem];
                  return (
                    <td key={sem} className="p-3 text-center border-r">
                      {status === "O" ? <span className="text-green-600 font-bold">O</span> : 
                       status === "X" ? <span className="text-gray-300">X</span> : "-"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------
// 뷰 2: 학기별 활동 체크리스트
// ---------------------------------------------------------
function SemesterCheckListView({ semester, members, refreshMembers }: any) {
  const [localCheck, setLocalCheck] = useState<{[key:string]: boolean}>({});
  const [isChanged, setIsChanged] = useState(false);

  // 초기 상태 로드: 해당 학기에 'O'인 사람만 true
  useEffect(() => {
    const initial: any = {};
    members.forEach((m: any) => {
      if (m.history?.[semester] === "O") initial[m.id] = true;
    });
    setLocalCheck(initial);
    setIsChanged(false);
  }, [semester, members]);

  const toggleMember = (id: string) => {
    setLocalCheck(prev => ({ ...prev, [id]: !prev[id] }));
    setIsChanged(true);
  };

  const saveChanges = async () => {
    if (!confirm(`[${semester}] 활동 명단을 저장하시겠습니까?`)) return;
    
    const batch = writeBatch(db);
    
    // 모든 회원에 대해 해당 학기 필드 업데이트
    members.forEach((m: any) => {
      const isActive = localCheck[m.id];
      const userRef = doc(db, "users", m.id);
      
      // history 필드 안에 { "2025-summer": "O" } 형태로 저장
      // Firestore에서 중첩 필드 업데이트는 점 표기법 사용 ("history.2025-summer")
      batch.update(userRef, {
        [`history.${semester}`]: isActive ? "O" : "X",
        // 최신 학기라면 메인 status도 업데이트할지 결정 필요 (여기선 history만 업데이트)
      });
    });

    await batch.commit();
    alert("저장되었습니다.");
    refreshMembers(); // 부모 데이터 갱신
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b bg-blue-50 flex justify-between items-center sticky top-0 z-10">
        <div>
          <h2 className="font-bold text-blue-900">{semester} 활동 회원 설정</h2>
          <p className="text-xs text-blue-700">체크하면 '활동(O)'으로 기록됩니다.</p>
        </div>
        <button 
          onClick={saveChanges}
          disabled={!isChanged}
          className={`px-4 py-2 rounded font-bold shadow transition ${isChanged ? "bg-blue-600 text-white animate-pulse" : "bg-gray-300 text-gray-500"}`}
        >
          저장
        </button>
      </div>

      <div className="p-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {members.map((m: any) => (
          <div 
            key={m.id} 
            onClick={() => toggleMember(m.id)}
            className={`
              flex items-center p-3 rounded border cursor-pointer select-none transition
              ${localCheck[m.id] ? "bg-green-50 border-green-500 ring-1 ring-green-300" : "bg-white hover:bg-gray-50"}
            `}
          >
            <div className={`w-5 h-5 border rounded mr-3 flex items-center justify-center ${localCheck[m.id]?"bg-green-500 border-green-500":"border-gray-300"}`}>
              {localCheck[m.id] && <span className="text-white text-xs">✔</span>}
            </div>
            <div>
              <div className="font-bold text-gray-800">{m.name}</div>
              <div className="text-xs text-gray-500">{m.studentId || "학번미입력"}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
