// seed-admin.js (Firebase Admin SDK 사용 - 서비스 계정 키 필요)
const admin = require("firebase-admin");
const path = require("path");

// 서비스 계정 키 파일 경로 (생성 후 경로 지정)
// const serviceAccount = require("./serviceAccountKey.json");

// 방법 1: 서비스 계정 키 파일 사용
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   projectId: "g-bird-platform"
// });

// 방법 2: 환경 변수 사용 (권장)
// GOOGLE_APPLICATION_CREDENTIALS 환경 변수에 서비스 계정 키 경로 설정
// 또는 gcloud auth application-default login 실행 후
admin.initializeApp({
  projectId: "g-bird-platform"
});

const db = admin.firestore();

async function seedData() {
  const batch = db.batch();

  console.log("🚀 데이터 업로드를 시작합니다...");

  // 1. 회원 데이터 생성 (Users)
  const users = [
    { id: "정민우", status: "active", attendanceScore: 10, discount: 500, isAdmin: true },
    { id: "김민수(물리)", status: "active", attendanceScore: 5, discount: 0 },
    { id: "박지성(체육)", status: "resting", attendanceScore: 0, discount: 0 },
  ];

  users.forEach((user) => {
    const userRef = db.collection("users").doc(user.id);
    batch.set(userRef, {
      name: user.id,
      status: user.status,
      attendanceScore: user.attendanceScore,
      shuttleDiscount: user.discount,
      isActive: user.status === "active",
      isAdmin: user.isAdmin || false,
      history: {},
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  // 2. 셔틀콕 재고 생성 (Inventory) - 5박스, 박스당 25개
  for (let box = 1; box <= 5; box++) {
    for (let num = 1; num <= 25; num++) {
      const id = `${box}-${num}`;
      const itemRef = db.collection("inventory").doc(id);
      batch.set(itemRef, {
        id: id,
        box: box,
        number: num,
        price: 16000,
        isSold: false,
        soldTo: null
      });
    }
  }

  await batch.commit();
  console.log("✅ 데이터 업로드 완료! (회원 3명, 셔틀콕 125개)");
  process.exit(0);
}

seedData().catch((error) => {
  console.error("❌ 데이터 업로드 실패:", error);
  process.exit(1);
});
