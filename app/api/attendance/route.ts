import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

interface AttendanceRequest {
  userName: string;
  code: string;
  date: string;
  deviceId: string;
}

interface AttendanceRecord {
  time?: string;
  status?: string;
  ip?: string;
  deviceId?: string;
  warning?: string | null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as AttendanceRequest;
    const { userName, code, date, deviceId } = body;

    // 1. IP 주소 식별 (Vercel 환경 기준)
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get("x-real-ip") || "127.0.0.1";

    // 2. 입력값 검증
    if (!userName || !code || !date || !deviceId) {
      return NextResponse.json(
        { success: false, message: "잘못된 요청입니다. 필수 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    // 3. 세션(오늘의 출석부) 가져오기
    const sessionRef = doc(db, "sessions", date);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
      return NextResponse.json(
        { success: false, message: "오늘 생성된 출석부가 없습니다." },
        { status: 404 }
      );
    }

    const sessionData = sessionSnap.data();

    // 4. QR 코드 검증
    if (!sessionData.validCode || sessionData.validCode !== code) {
      return NextResponse.json(
        { success: false, message: "유효하지 않은 QR 코드입니다." },
        { status: 400 }
      );
    }

    // 5. 대리 출석 감지 (Device ID 중복 체크)
    const attendances = (sessionData.attendances || {}) as Record<string, AttendanceRecord>;
    let warning: string | null = null;

    // 이미 출석한 다른 사람들의 기록을 확인
    Object.entries(attendances).forEach(([existingUser, record]) => {
      if (existingUser !== userName && record.deviceId === deviceId) {
        // 다른 사람인데 기기 ID가 같다면? -> 대리 출석 의심
        warning = `대리 출석 의심: '${existingUser}'님과 동일 기기 사용`;
      }
    });

    // 6. 출석 기록 저장 (덮어쓰기)
    // 기존 투표 상태(voteStatus)는 유지하고 실제 출석(actualStatus) 정보 추가
    await updateDoc(sessionRef, {
      [`attendances.${userName}`]: {
        ...attendances[userName], // 기존 투표 정보 등이 있다면 유지
        time: new Date().toISOString(),
        status: "present", // 현장 출석 완료
        ip: ip,
        deviceId: deviceId,
        warning: warning // 경고 메시지 저장
      }
    });

    return NextResponse.json({ success: true, warning });

  } catch (error) {
    console.error("Attendance API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "서버 오류가 발생했습니다.";
    return NextResponse.json(
      { success: false, message: errorMessage },
      { status: 500 }
    );
  }
}