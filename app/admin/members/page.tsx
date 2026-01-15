"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, deleteDoc, writeBatch, query, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { User } from "@/types";

// 활동정보 컴포넌트
interface ActivityInfoViewProps {
  members: User[];
  setMembers: (members: User[]) => void;
}

function ActivityInfoView({ members: initialMembers, setMembers: setMembersCallback }: ActivityInfoViewProps) {
  const [members, setMembers] = useState<User[]>(initialMembers);
  const [semesters, setSemesters] = useState<string[]>([]);
  const [editingCell, setEditingCell] = useState<{memberId: string, semester: string} | null>(null);
  const [editValue, setEditValue] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [localHistory, setLocalHistory] = useState<{[memberId: string]: {[semester: string]: string}}>({});

  useEffect(() => {
    // 학기 목록 로드
    getDocs(collection(db, "semesters")).then(snap => {
      const list = snap.docs.map(d => d.id).sort().reverse();
      setSemesters(list);
    });

    // 회원 데이터 로드
    getDocs(collection(db, "users")).then(snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
      list.sort((a, b) => a.name.localeCompare(b.name));
      setMembers(list);
      setMembersCallback(list);
      
      // 로컬 히스토리 초기화
      const history: {[memberId: string]: {[semester: string]: string}} = {};
      list.forEach(m => {
        history[m.id] = { ...m.history };
      });
      setLocalHistory(history);
    });
  }, [setMembersCallback]);

  const getCellValue = (memberId: string, semester: string): string => {
    if (localHistory[memberId]?.[semester] !== undefined) {
      return localHistory[memberId][semester] || "";
    }
    return members.find(m => m.id === memberId)?.history?.[semester] || "";
  };

  const getCellStyle = (value: string, member: User, semester: string, semesterIndex: number): string => {
    if (!value || value === "-") return "bg-gray-50 text-gray-400";
    if (value === "O") return "bg-green-100 text-green-800 font-bold";
    if (value === "X") return "bg-gray-200 text-gray-600";
    
    // 명예회원: 명예회원 시작 학기부터 금색 표시
    if (value === "명예회원") {
      const honoraryStart = (member as any).honoraryStartIndex;
      if (honoraryStart !== null && honoraryStart !== undefined && semesterIndex >= honoraryStart) {
        return "bg-yellow-200 text-yellow-900 font-bold";
      }
      return "bg-yellow-100 text-yellow-800";
    }
    
    // 제적 관련
    if (value === "제적") return "bg-red-100 text-red-800 font-bold";
    
    return "bg-white text-gray-800";
  };

  const handleCellClick = (memberId: string, semester: string) => {
    setEditingCell({ memberId, semester });
    setEditValue(getCellValue(memberId, semester));
  };

  const handleCellSave = () => {
    if (!editingCell) return;
    
    const { memberId, semester } = editingCell;
    setLocalHistory(prev => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        [semester]: editValue.trim() || ""
      }
    }));
    setHasChanges(true);
    setEditingCell(null);
    setEditValue("");
  };

  const handleCellCancel = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const handleSaveAll = async () => {
    if (!confirm("모든 변경사항을 저장하시겠습니까?")) return;
    
    try {
      let updateCount = 0;
      const updatePromises: Promise<void>[] = [];
      
      Object.keys(localHistory).forEach(memberId => {
        const memberHistory = localHistory[memberId];
        const member = members.find(m => m.id === memberId);
        if (!member) return;
        
        // 변경된 항목만 업데이트
        const historyUpdates: {[semester: string]: string} = {};
        Object.keys(memberHistory).forEach(semester => {
          const newValue = memberHistory[semester] || "";
          const oldValue = member.history?.[semester] || "";
          if (newValue !== oldValue) {
            historyUpdates[semester] = newValue;
          }
        });
        
        if (Object.keys(historyUpdates).length > 0) {
          updateCount++;
          updatePromises.push(
            fetch("/api/admin/members", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                memberId,
                updates: { history: historyUpdates }
              })
            }).then(async (response) => {
              if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "저장에 실패했습니다.");
              }
            })
          );
        }
      });
      
      if (updateCount > 0) {
        await Promise.all(updatePromises);
        alert(`${updateCount}명의 정보가 저장되었습니다.`);
        setHasChanges(false);
        
        // 데이터 다시 로드
        const snap = await getDocs(collection(db, "users"));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
        list.sort((a, b) => a.name.localeCompare(b.name));
        setMembers(list);
        setMembersCallback(list);
        
        const history: {[memberId: string]: {[semester: string]: string}} = {};
        list.forEach(m => {
          history[m.id] = { ...m.history };
        });
        setLocalHistory(history);
      } else {
        alert("변경된 내용이 없습니다.");
      }
    } catch (error: any) {
      console.error("저장 오류:", error);
      alert(error.message || "저장 중 오류가 발생했습니다.");
    }
  };

  if (semesters.length === 0) {
    return (
      <div className="bg-white rounded shadow p-8 text-center">
        <p className="text-gray-600 mb-4">학기 정보가 없습니다.</p>
        <p className="text-sm text-gray-500">출석 관리 페이지에서 학기를 추가해주세요.</p>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="bg-white rounded shadow p-8 text-center">
        <p className="text-gray-600 mb-4">회원 데이터가 없습니다.</p>
        <p className="text-sm text-gray-500">회원 관리 페이지에서 회원을 등록해주세요.</p>
      </div>
    );
  }

  // 제적 회원과 일반 회원 분리
  const activeMembers = members.filter(m => !(m as any).expelled);
  const expelledMembers = members.filter(m => (m as any).expelled);

  const renderTable = (memberList: User[], title: string) => (
    <div className="space-y-2">
      <h3 className="text-md font-bold text-gray-700">{title}</h3>
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-gray-100 border-b sticky top-0 z-10">
            <tr>
              <th className="p-3 sticky left-0 bg-gray-100 border-r z-20">이름</th>
              {semesters.map((s: string) => (
                <th key={s} className="p-3 border-r text-center min-w-[120px]">{s}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {memberList.map(m => (
              <tr key={m.id} className="border-b hover:bg-gray-50">
                <td className="p-3 sticky left-0 bg-white border-r font-bold z-10">{m.name}</td>
                {semesters.map((s: string, idx: number) => {
                  const isEditing = editingCell?.memberId === m.id && editingCell?.semester === s;
                  const value = getCellValue(m.id, s);
                  const cellStyle = getCellStyle(value, m, s, idx);
                  
                  return (
                    <td
                      key={s}
                      className={`p-2 text-center border-r cursor-pointer min-w-[120px] ${!isEditing ? cellStyle : "bg-blue-50"}`}
                      onClick={() => !isEditing && handleCellClick(m.id, s)}
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleCellSave();
                              if (e.key === "Escape") handleCellCancel();
                            }}
                            className="flex-1 px-2 py-1 border rounded text-black text-xs"
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCellSave();
                            }}
                            className="text-xs bg-blue-600 text-white px-2 py-1 rounded"
                          >
                            ✓
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCellCancel();
                            }}
                            className="text-xs bg-gray-400 text-white px-2 py-1 rounded"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs">{value || "-"}</span>
                      )}
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold">활동정보</h2>
        {hasChanges && (
          <button
            onClick={handleSaveAll}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700"
          >
            💾 저장하기
          </button>
        )}
      </div>
      
      {/* 일반 회원 테이블 */}
      {activeMembers.length > 0 && renderTable(activeMembers, "일반 회원")}
      
      {/* 제적 회원 테이블 */}
      {expelledMembers.length > 0 && (
        <div className="mt-6">
          {renderTable(expelledMembers, "제적 회원")}
        </div>
      )}
    </div>
  );
}

export default function MembersPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"manage" | "activity">("manage");
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMember, setEditingMember] = useState<User | null>(null);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as User));
      list.sort((a, b) => a.name.localeCompare(b.name));
      setMembers(list);
    } catch (error) {
      console.error("Error loading members:", error);
      alert("회원 목록을 불러오는데 실패했습니다.");
    }
    setLoading(false);
  };

  const handleAddMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const studentId = formData.get("studentId") as string;
    const email = formData.get("email") as string;
    const isActive = formData.get("isActive") === "on";
    const isAdmin = formData.get("isAdmin") === "on";

    if (!name.trim()) {
      alert("이름을 입력해주세요.");
      return;
    }

    try {
      const userRef = doc(db, "users", name.trim());
      await setDoc(userRef, {
        name: name.trim(),
        studentId: studentId || null,
        email: email || null,
        isActive,
        isAdmin: isAdmin || false,
        shuttleDiscount: 0,
        attendanceScore: 0,
        history: {},
        createdAt: new Date().toISOString()
      });
      alert("회원이 추가되었습니다.");
      setShowAddForm(false);
      loadMembers();
    } catch (error) {
      console.error("Error adding member:", error);
      alert("회원 추가에 실패했습니다.");
    }
  };

  const handleEditMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingMember) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const studentId = formData.get("studentId") as string;
    const email = formData.get("email") as string;
    const isActive = formData.get("isActive") === "on";
    const isAdmin = formData.get("isAdmin") === "on";
    const shuttleDiscount = parseInt(formData.get("shuttleDiscount") as string) || 0;
    const attendanceScore = parseInt(formData.get("attendanceScore") as string) || 0;

    try {
      const userRef = doc(db, "users", editingMember.id);
      await setDoc(userRef, {
        ...editingMember,
        name: name.trim(),
        studentId: studentId || null,
        email: email || null,
        isActive,
        isAdmin: isAdmin || false,
        shuttleDiscount,
        attendanceScore
      }, { merge: true });
      alert("회원 정보가 수정되었습니다.");
      setEditingMember(null);
      loadMembers();
    } catch (error) {
      console.error("Error editing member:", error);
      alert("회원 정보 수정에 실패했습니다.");
    }
  };

  const handleDeleteMember = async (member: User) => {
    if (!confirm(`정말 ${member.name}님을 삭제하시겠습니까?`)) return;

    try {
      const response = await fetch(`/api/admin/members?id=${encodeURIComponent(member.id)}`, {
        method: "DELETE"
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "회원 삭제에 실패했습니다.");
      }
      
      alert("회원이 삭제되었습니다.");
      loadMembers();
    } catch (error: any) {
      console.error("Error deleting member:", error);
      alert(error.message || "회원 삭제에 실패했습니다.");
    }
  };

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.studentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-4 shadow sticky top-0 z-20">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => router.push("/admin")} className="text-gray-500 font-bold">← 메뉴</button>
          <h1 className="text-xl font-bold">회원</h1>
          {activeTab === "manage" && (
            <button 
              onClick={() => setShowAddForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-700"
            >
              + 회원 추가
            </button>
          )}
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("manage")}
            className={`px-4 py-2 rounded-full font-bold text-sm transition ${
              activeTab === "manage" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            회원관리
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`px-4 py-2 rounded-full font-bold text-sm transition ${
              activeTab === "activity" ? "bg-purple-600 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            활동정보
          </button>
        </div>

        {activeTab === "manage" && (
          <input
            type="text"
            placeholder="이름, 학번, 이메일로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 border rounded-lg text-black"
          />
        )}
      </div>

      <div className="p-4 max-w-4xl mx-auto">
        {activeTab === "manage" ? (
          loading ? (
            <div className="text-center py-10 text-gray-500">로딩 중...</div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-3 text-left">이름</th>
                      <th className="p-3 text-left">학번</th>
                      <th className="p-3 text-left">이메일</th>
                      <th className="p-3 text-center">활동</th>
                      <th className="p-3 text-center">관리자</th>
                      <th className="p-3 text-center">할인</th>
                      <th className="p-3 text-center">출석점수</th>
                      <th className="p-3 text-center">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map(member => (
                      <tr key={member.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-bold">{member.name}</td>
                        <td className="p-3 text-gray-600">{member.studentId || "-"}</td>
                        <td className="p-3 text-gray-600">{member.email || "-"}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            member.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {member.isActive ? '활동' : '비활동'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {member.isAdmin ? (
                            <span className="px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-700">관리자</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center">{member.shuttleDiscount || 0}원</td>
                        <td className="p-3 text-center">{member.attendanceScore || 0}점</td>
                        <td className="p-3 text-center">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => setEditingMember(member)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-bold"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDeleteMember(member)}
                              className="text-red-600 hover:text-red-800 text-sm font-bold"
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          <ActivityInfoView members={members} setMembers={setMembers} />
        )}
      </div>

      {/* 추가 폼 모달 */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">회원 추가</h2>
            <form onSubmit={handleAddMember}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">이름 *</label>
                  <input type="text" name="name" required className="w-full p-2 border rounded text-black" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">학번</label>
                  <input type="text" name="studentId" className="w-full p-2 border rounded text-black" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">이메일</label>
                  <input type="email" name="email" className="w-full p-2 border rounded text-black" />
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input type="checkbox" name="isActive" defaultChecked className="mr-2" />
                    <span className="text-sm">활동 회원</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" name="isAdmin" className="mr-2" />
                    <span className="text-sm">관리자</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700"
                >
                  추가
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 수정 폼 모달 */}
      {editingMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">회원 정보 수정</h2>
            <form onSubmit={handleEditMember}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">이름 *</label>
                  <input type="text" name="name" defaultValue={editingMember.name} required className="w-full p-2 border rounded text-black" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">학번</label>
                  <input type="text" name="studentId" defaultValue={editingMember.studentId || ""} className="w-full p-2 border rounded text-black" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">이메일</label>
                  <input type="email" name="email" defaultValue={editingMember.email || ""} className="w-full p-2 border rounded text-black" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">셔틀콕 할인 (원)</label>
                  <input type="number" name="shuttleDiscount" defaultValue={editingMember.shuttleDiscount || 0} className="w-full p-2 border rounded text-black" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">출석 점수</label>
                  <input type="number" name="attendanceScore" defaultValue={editingMember.attendanceScore || 0} className="w-full p-2 border rounded text-black" />
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input type="checkbox" name="isActive" defaultChecked={editingMember.isActive} className="mr-2" />
                    <span className="text-sm">활동 회원</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" name="isAdmin" defaultChecked={editingMember.isAdmin} className="mr-2" />
                    <span className="text-sm">관리자</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700"
                >
                  저장
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
