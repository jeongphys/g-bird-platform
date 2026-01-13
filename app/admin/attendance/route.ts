import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userName, code, date, deviceId } = body;

    // 1. IP 주소 식별 (Vercel 환경 기준)
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(',')[0] : "127.0.0.1";

    if (!userName || !code || !date || !deviceId) {
      return NextResponse.json({ success: false, message: "잘못된 요청입니다." }, { status: 400 });
    }

    // 2. 세션(오늘의 출석부) 가져오기
    const sessionRef = doc(db, "sessions", date);
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
      return NextResponse.json({ success: false, message: "오늘 생성된 출석부가 없습니다." }, { status: 404 });
    }

    const sessionData = sessionSnap.data();

    // 3. QR 코드 검증
    if (sessionData.validCode !== code) {
      return NextResponse.json({ success: false, message: "유효하지 않은 QR 코드입니다." }, { status: 400 });
    }

    // 4. 대리 출석 감지 (Device ID 중복 체크)
    const attendances = sessionData.attendances || {};
    let warning = null;

    // 이미 출석한 다른 사람들의 기록을 확인
    Object.entries(attendances).forEach(([existingUser, record]: any) => {
      if (existingUser !== userName) {
        // 다른 사람인데 기기 ID가 같다면? -> 대리 출석 의심
        if (record.deviceId === deviceId) {
          warning = `대리 출석 의심: '${existingUser}'님과 동일 기기 사용`;
        }
      }
    });

    // 5. 출석 기록 저장 (덮어쓰기)
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

  } catch (e: any) {
    console.error("API Error:", e);
    return NextResponse.json({ success: false, message: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}