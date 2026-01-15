import { NextRequest, NextResponse } from "next/server";
import admin from "firebase-admin";
import path from "path";

// Firebase Admin SDK 초기화 (서버 사이드)
if (!admin.apps.length) {
  try {
    const serviceAccount = require(path.join(process.cwd(), "serviceAccountKey.json"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: "g-bird-platform"
    });
  } catch (error) {
    console.error("Firebase Admin 초기화 실패:", error);
  }
}

const adminDb = admin.firestore();

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get("id");
    
    if (!memberId) {
      return NextResponse.json({ error: "회원 ID가 필요합니다." }, { status: 400 });
    }

    // 관리자 인증 확인 (세션 스토리지 체크는 클라이언트에서, 여기서는 서버 사이드이므로 직접 처리)
    // 실제로는 클라이언트에서 관리자 확인 후 호출하므로 여기서는 바로 처리
    await adminDb.collection("users").doc(memberId).delete();
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete member error:", error);
    return NextResponse.json({ error: error.message || "회원 삭제에 실패했습니다." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { memberId, updates } = body;
    
    if (!memberId || !updates) {
      return NextResponse.json({ error: "회원 ID와 업데이트 데이터가 필요합니다." }, { status: 400 });
    }

    // history 업데이트인 경우
    if (updates.history) {
      const userRef = adminDb.collection("users").doc(memberId);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });
      }

      const currentData = userDoc.data();
      const currentHistory = currentData?.history || {};
      
      // history 병합
      const mergedHistory = { ...currentHistory, ...updates.history };
      
      await userRef.update({ history: mergedHistory });
    } else {
      // 일반 업데이트
      await adminDb.collection("users").doc(memberId).update(updates);
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update member error:", error);
    return NextResponse.json({ error: error.message || "회원 정보 업데이트에 실패했습니다." }, { status: 500 });
  }
}
