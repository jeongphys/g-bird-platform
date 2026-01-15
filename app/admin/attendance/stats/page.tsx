"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Session, User } from "@/types";

export default function AttendanceStats() {
  const router = useRouter();
  const [semesters, setSemesters] = useState<string[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  const [stats, setStats] = useState<{
    totalSessions: number;
    memberStats: Array<{
      userId: string;
      name: string;
      attendanceCount: number;
      attendanceRate: number;
      score: number;
    }>;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSemesters = async () => {
      const snap = await getDocs(collection(db, "semesters"));
      const list = snap.docs.map(d => d.id).sort().reverse();
      setSemesters(list);
      if (list.length > 0 && !selectedSemester) {
        setSelectedSemester(list[0]);
      }
    };
    fetchSemesters();
  }, []);

  useEffect(() => {
    if (selectedSemester) {
      calculateStats();
    }
  }, [selectedSemester]);

  const calculateStats = async () => {
    if (!selectedSemester) return;
    
    setLoading(true);
    try {
      // 해당 학기의 모든 세션 가져오기
      const sessionsSnap = await getDocs(collection(db, "sessions"));
      const semesterSessions = sessionsSnap.docs
        .map(d => {
          const data = d.data();
          return {
            id: d.id,
            date: data.date || "",
            semester: data.semester || "",
            validCode: data.validCode || "",
            voteData: data.voteData || {},
            attendances: data.attendances || {},
            status: data.status || "closed",
            updatedAt: data.updatedAt
          } as Session;
        })
        .filter(s => s.semester === selectedSemester);

      // 모든 회원 가져오기
      const usersSnap = await getDocs(collection(db, "users"));
      const members = usersSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as User))
        .filter(u => u.history?.[selectedSemester] === "O");

      // 회원별 통계 계산
      const memberStats = members.map(member => {
        let attendanceCount = 0;
        
        semesterSessions.forEach(session => {
          const attendance = session.attendances?.[member.id];
          if (attendance && attendance.status === "present") {
            attendanceCount++;
          }
        });

        const attendanceRate = semesterSessions.length > 0 
          ? (attendanceCount / semesterSessions.length) * 100 
          : 0;

        // 출석 점수 계산: 출석률에 따라 점수 부여 (최대 100점)
        // 출석률 80% 이상: 100점, 60-79%: 80점, 40-59%: 60점, 20-39%: 40점, 20% 미만: 20점
        let score = 0;
        if (attendanceRate >= 80) score = 100;
        else if (attendanceRate >= 60) score = 80;
        else if (attendanceRate >= 40) score = 60;
        else if (attendanceRate >= 20) score = 40;
        else if (attendanceRate > 0) score = 20;

        return {
          userId: member.id,
          name: member.name,
          attendanceCount,
          attendanceRate: Math.round(attendanceRate * 10) / 10,
          score
        };
      });

      // 출석 횟수 순으로 정렬
      memberStats.sort((a, b) => b.attendanceCount - a.attendanceCount);

      setStats({
        totalSessions: semesterSessions.length,
        memberStats
      });
    } catch (error) {
      console.error("Error calculating stats:", error);
      alert("통계 계산 중 오류가 발생했습니다.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white p-4 shadow sticky top-0 z-20">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => router.push("/admin/attendance")} className="text-gray-500 font-bold">← 뒤로</button>
          <h1 className="text-xl font-bold">출석 통계</h1>
          <div className="w-10"></div>
        </div>

        <div className="flex gap-2">
          <select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            className="border p-2 rounded text-black"
          >
            {semesters.map(sem => (
              <option key={sem} value={sem}>{sem}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto">
        {loading ? (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">통계 계산 중...</p>
          </div>
        ) : stats ? (
          <div className="space-y-6">
            {/* 전체 요약 */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold mb-4">📊 {selectedSemester} 요약</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">총 세션 수</div>
                  <div className="text-2xl font-bold text-blue-600">{stats.totalSessions}회</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">활동 회원 수</div>
                  <div className="text-2xl font-bold text-green-600">{stats.memberStats.length}명</div>
                </div>
              </div>
            </div>

            {/* 회원별 통계 */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 bg-gray-50 border-b">
                <h2 className="text-lg font-bold">회원별 출석 현황</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-3 text-left">순위</th>
                      <th className="p-3 text-left">이름</th>
                      <th className="p-3 text-center">출석 횟수</th>
                      <th className="p-3 text-center">출석률</th>
                      <th className="p-3 text-center">출석 점수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.memberStats.map((member, index) => (
                      <tr key={member.userId} className="border-b hover:bg-gray-50">
                        <td className="p-3 text-center font-bold">{index + 1}</td>
                        <td className="p-3 font-bold">{member.name}</td>
                        <td className="p-3 text-center">
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">
                            {member.attendanceCount}회
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full transition-all"
                                style={{ width: `${member.attendanceRate}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-bold">{member.attendanceRate}%</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-3 py-1 rounded font-bold ${
                            member.score >= 80 ? 'bg-green-100 text-green-700' :
                            member.score >= 60 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {member.score}점
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500">
            학기를 선택해주세요.
          </div>
        )}
      </div>
    </div>
  );
}
