// seed-simple.js (간단한 방법 - 보안 규칙 임시 완화 필요)
// 이 스크립트는 보안 규칙이 완화된 상태에서만 작동합니다.
// 사용법: Firebase Console에서 Firestore 규칙을 임시로 완화한 후 실행

const { initializeApp } = require("firebase/app");
const { getFirestore, doc, writeBatch } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyB-is1dk1guXKyuoOtBaRUGslHm83q44YU",
  authDomain: "g-bird-platform.firebaseapp.com",
  projectId: "g-bird-platform",
  storageBucket: "g-bird-platform.firebasestorage.app",
  messagingSenderId: "232822964557",
  appId: "1:232822964557:web:0025de008149297e923704"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedData() {
  const batch = writeBatch(db);

  console.log("🚀 데이터 업로드를 시작합니다...");
  console.log("⚠️  주의: Firestore 보안 규칙이 임시로 완화되어 있어야 합니다.");

  // 1. 회원 데이터 생성
  const users = [
    { id: "정민우", status: "active", attendanceScore: 10, discount: 500, isAdmin: true },
    { id: "김민수(물리)", status: "active", attendanceScore: 5, discount: 0 },
    { id: "박지성(체육)", status: "resting", attendanceScore: 0, discount: 0 },
  ];

  users.forEach((user) => {
    const userRef = doc(db, "users", user.id);
    batch.set(userRef, {
      name: user.id,
      status: user.status,
      attendanceScore: user.attendanceScore,
      shuttleDiscount: user.discount,
      isActive: user.status === "active",
      isAdmin: user.isAdmin || false,
      history: {}
    });
  });

  // 2. 셔틀콕 재고 생성
  for (let box = 1; box <= 5; box++) {
    for (let num = 1; num <= 25; num++) {
      const id = `${box}-${num}`;
      const itemRef = doc(db, "inventory", id);
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

  try {
    await batch.commit();
    console.log("✅ 데이터 업로드 완료! (회원 3명, 셔틀콕 125개)");
    console.log("⚠️  중요: 이제 Firestore 보안 규칙을 다시 적용하세요!");
    process.exit(0);
  } catch (error) {
    console.error("❌ 데이터 업로드 실패:", error.message);
    console.log("\n💡 해결 방법:");
    console.log("1. Firebase Console > Firestore Database > 규칙");
    console.log("2. 임시로 다음 규칙 적용:");
    console.log("   rules_version = '2';");
    console.log("   service cloud.firestore {");
    console.log("     match /databases/{database}/documents {");
    console.log("       match /{document=**} {");
    console.log("         allow read, write: if true;");
    console.log("       }");
    console.log("     }");
    console.log("   }");
    console.log("3. 게시 후 이 스크립트 다시 실행");
    console.log("4. 데이터 업로드 완료 후 보안 규칙 복원");
    process.exit(1);
  }
}

seedData();
