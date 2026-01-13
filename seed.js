// seed.js (데이터 업로드용 스크립트)
const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc, writeBatch } = require("firebase/firestore");

// [중요] 여기도 본인의 Firebase 설정값을 넣어주세요!
const firebaseConfig = {
  apiKey: "AIzaSyAlHDd0kqPbvJ-Pm7TavD1U5TYSoe0TNU0",
  authDomain: "gbird-feb78.firebaseapp.com",
  projectId: "gbird-feb78",
  storageBucket: "gbird-feb78.firebasestorage.app",
  messagingSenderId: "489327700831",
  appId: "1:489327700831:web:049e990b3902f7e692e4ea"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedData() {
  const batch = writeBatch(db);

  console.log("🚀 데이터 업로드를 시작합니다...");

  // 1. 회원 데이터 생성 (Users) - 스프레드시트 분석 기반
  // ID는 "이름(구분자)" 형태를 사용
  const users = [
    { id: "정민우", status: "active", attendanceScore: 10, discount: 500 }, // 회장
    { id: "김민수(물리)", status: "active", attendanceScore: 5, discount: 0 },
    { id: "박지성(체육)", status: "resting", attendanceScore: 0, discount: 0 }, // 휴회
  ];

  users.forEach((user) => {
    const userRef = doc(db, "users", user.id);
    batch.set(userRef, {
      name: user.id,
      status: user.status,
      attendanceScore: user.attendanceScore,
      shuttleDiscount: user.discount,
      isActive: user.status === "active"
    });
  });

  // 2. 셔틀콕 재고 생성 (Inventory) - 5박스, 박스당 25개(예시)
  // 문서 ID: "1-1", "1-2" ... "5-25"
  for (let box = 1; box <= 5; box++) {
    for (let num = 1; num <= 25; num++) {
      const id = `${box}-${num}`;
      const itemRef = doc(db, "inventory", id);
      batch.set(itemRef, {
        id: id,
        box: box,
        number: num,
        price: 16000,
        isSold: false, // 판매 안 됨
        soldTo: null
      });
    }
  }

  await batch.commit();
  console.log("✅ 데이터 업로드 완료! (회원 3명, 셔틀콕 125개)");
}

seedData();
