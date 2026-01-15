"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

interface AttendanceKing {
  name: string;
  score: number;
}

interface DashboardData {
  attendanceKings: AttendanceKing[];
  teamScores: number[]; // 1조부터 7조까지 점수
}

export default function DashboardWidget() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Firestore에서 대시보드 데이터 로드 시도
      const dashboardRef = doc(db, "dashboard", "main");
      const dashboardSnap = await getDoc(dashboardRef);

      if (dashboardSnap.exists()) {
        const dashboardData = dashboardSnap.data();
        setData({
          attendanceKings: dashboardData.attendanceKings || [],
          teamScores: dashboardData.teamScores || [0, 0, 0, 0, 0, 0, 0],
        });
      } else {
        // 임시 데이터 (추후 관리자 페이지에서 설정 가능)
        setData({
          attendanceKings: [
            { name: "정민우", score: 10 },
          ],
          teamScores: [15, 12, 18, 10, 14, 16, 13],
        });
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      // 에러 발생 시 임시 데이터
      setData({
        attendanceKings: [
          { name: "정민우", score: 10 },
        ],
        teamScores: [15, 12, 18, 10, 14, 16, 13],
      });
    }
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 출석왕 위젯 */}
      <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-200">
        <div className="flex items-center space-x-3 mb-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-9 w-9 text-amber-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M17 6a3 3 0 01-3 3c-1.22 0-2.3.7-2.75 1.75a3 3 0 01-2.5 0A3.001 3.001 0 016 9a3 3 0 01-3-3h14zM4.25 12.25c-.14-.4-.25-.82-.25-1.25h12c0 .43-.11.85-.25 1.25H4.25zM2 14h16v-1H2v1z" />
            <path
              fillRule="evenodd"
              d="M3 6a1 1 0 011-1h12a1 1 0 011 1v2.5a1 1 0 01-1 1h-2.25a.75.75 0 00-.75.75v.25a.75.75 0 00.75.75h.5a.75.75 0 010 1.5h-.5a2.25 2.25 0 01-2.25-2.25v-.25a.75.75 0 00-.75-.75h-1a.75.75 0 00-.75.75v.25a2.25 2.25 0 01-2.25 2.25h-.5a.75.75 0 010-1.5h.5a.75.75 0 00.75-.75v-.25a.75.75 0 00-.75-.75H4a1 1 0 01-1-1V6z"
              clipRule="evenodd"
            />
          </svg>
          <h2 className="text-xl font-black text-gray-800">이달의 출석왕</h2>
        </div>
        <div className="text-center bg-gray-50 rounded-lg p-3 min-h-[72px] flex items-center justify-center">
          {loading ? (
            <div className="w-full space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto animate-pulse"></div>
            </div>
          ) : data && data.attendanceKings.length > 0 ? (
            <div className="w-full">
              <div className="mb-1">
                {data.attendanceKings.map((king, index) => (
                  <span
                    key={index}
                    className="font-bold text-xl md:text-2xl bg-gradient-to-r from-amber-500 to-red-500 bg-clip-text text-transparent"
                  >
                    {king.name}
                    {index < data.attendanceKings.length - 1 && ", "}
                  </span>
                ))}
              </div>
              <div className="text-amber-600 font-semibold text-base">
                {data.attendanceKings[0].score}점
              </div>
            </div>
          ) : (
            <p className="text-gray-500">출석왕 데이터를 찾을 수 없습니다.</p>
          )}
        </div>
      </div>

      {/* 조별 점수 위젯 */}
      <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-200">
        <div className="flex items-center space-x-3 mb-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-9 w-9 text-indigo-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
              clipRule="evenodd"
            />
          </svg>
          <h2 className="text-xl font-black text-gray-800">조별 점수 현황</h2>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          {loading ? (
            <>
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className="bg-gray-200 rounded-lg p-2 animate-pulse h-12"
                ></div>
              ))}
            </>
          ) : data ? (
            data.teamScores.map((score, index) => {
              const teamNumber = index + 1;
              return (
                <div
                  key={teamNumber}
                  className="bg-gray-100 rounded-lg p-2 transition-transform hover:scale-105"
                >
                  <div className="text-xs font-semibold text-indigo-600">
                    {teamNumber}조
                  </div>
                  <div className="text-lg font-bold text-gray-800">
                    {score || 0}점
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-gray-500 col-span-full">
              조 점수 데이터를 불러올 수 없습니다.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
