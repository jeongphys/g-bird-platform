// seed-activity-data.js
// 구글 스프레드시트 데이터를 Firestore에 업로드
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "g-bird-platform"
});

const db = admin.firestore();

// 스프레드시트 데이터 (웹 검색 결과 기반)
// 학기 순서: 2022 가을, 2022 겨울, 2023 봄, 2023 여름, 2023 가을, 2023 겨울, 2024 봄, 2024 여름, 2024 가을, 2024 겨울, 2025 봄, 2025 여름, 2025 가을(52), 2025 겨울
const semesters = [
  "2022 가을",
  "2022 겨울",
  "2023 봄",
  "2023 여름",
  "2023 가을",
  "2023 겨울",
  "2024 봄",
  "2024 여름",
  "2024 가을",
  "2024 겨울",
  "2025 봄",
  "2025 여름",
  "2025 가을",
  "2025 겨울"
];

// 데이터 정규화 함수
function normalizeValue(value) {
  if (!value || value.trim() === "" || value === "-") return "";
  
  const v = value.trim();
  
  // 선발은 O로 변환
  if (v === "선발") return "O";
  
  // 명예회원 관련은 "명예회원"으로 통일
  if (v.includes("명예회원")) return "명예회원";
  
  // 제적 관련은 "제적"으로 통일
  if (v.includes("제적") || v.includes("출석 미달") || v.includes("출석미달") || v.includes("2분기 초과")) {
    return "제적";
  }
  
  // O, X는 그대로
  if (v === "O" || v === "X") return v;
  
  // 소문자 x는 대문자 X로
  if (v === "x") return "X";
  
  // 기타는 그대로 반환
  return v;
}

// 제적 여부 확인
function isExpelled(history) {
  return Object.values(history).some(v => v === "제적");
}

// 명예회원 시작 학기 찾기
function findHonoraryStart(history) {
  for (let i = 0; i < semesters.length; i++) {
    if (history[semesters[i]] === "명예회원") {
      return i;
    }
  }
  return -1;
}

// 스프레드시트 데이터 (행별로 정리)
const spreadsheetData = [
  { name: "공덕유", data: ["명예회원", "", "", "", "", "", "", "", "", "", "", "", "", ""] },
  { name: "김묘정", data: ["O", "O", "명예회원", "", "", "", "", "", "", "", "", "", "", ""] },
  { name: "김시인", data: ["-", "-", "명예회원", "", "", "", "", "", "", "", "", "", "", ""] },
  { name: "김효진", data: ["O", "O", "명예회원", "", "", "", "", "", "", "", "", "", "", ""] },
  { name: "이채연", data: ["O", "O", "명예회원", "O", "", "", "", "", "", "", "", "", "", ""] },
  { name: "김기업", data: ["O", "O", "X", "명예회원", "", "", "", "", "", "", "", "", "", ""] },
  { name: "강혜빈", data: ["O", "O", "O", "X", "명예회원", "", "", "", "", "", "", "", "", ""] },
  { name: "남건욱", data: ["O", "O", "O", "O", "명예회원", "", "", "", "", "", "", "", "", ""] },
  { name: "이종범", data: ["O", "O", "O", "X", "명예회원", "", "", "", "", "", "", "", "", ""] },
  { name: "이효진", data: ["O", "O", "O", "X", "명예회원", "O", "", "", "", "", "", "", "", ""] },
  { name: "이형택", data: ["O", "O", "O", "O", "O", "X", "O", "O", "명예회원", "", "", "", "", ""] },
  { name: "금혜윤", data: ["O", "O", "O", "O", "O", "X", "", "", "", "", "", "", "", ""] },
  { name: "김민수(물)", data: ["O", "O", "O", "O", "O", "명예회원", "O", "", "", "", "", "", "", ""] },
  { name: "이주찬", data: ["선발", "O", "O", "X", "O", "O", "O", "X", "X출석미달", "", "", "", "", ""] },
  { name: "최태훈", data: ["선발", "O", "O", "O", "O", "X", "X", "X(2분기 초과)", "", "", "", "", "", ""] },
  { name: "신지원", data: ["선발(출석 미달로 제적)", "", "", "", "", "", "", "", "", "", "", "", "", ""] },
  { name: "김지은", data: ["선발(출석 미달로 제적)", "", "", "", "", "", "", "", "", "", "", "", "", ""] },
  { name: "김세엽", data: ["선발(출석 미달로 제적)", "", "", "", "", "", "", "", "", "", "", "", "", ""] },
  { name: "임하늘", data: ["선발", "O", "O", "X", "X", "O", "O", "X", "X(출석미달)", "", "", "", "", ""] },
  { name: "김지수", data: ["선발", "X", "X 출석 미달", "", "", "", "", "", "", "", "", "", "", ""] },
  { name: "이준희", data: ["선발", "X", "X 출석 미달", "", "", "", "", "", "", "", "", "", "", ""] },
  { name: "박영인", data: ["선발", "X", "X", "O", "X", "X", "X", "X (2분기 초과)", "", "", "", "", "", ""] },
  { name: "임지원", data: ["선발", "X", "O", "X", "X 출석 미달", "", "", "", "", "", "", "", "", ""] },
  { name: "Joann", data: ["선발", "X", "X", "X", "X(2분기 초과)", "", "", "", "", "", "", "", "", ""] },
  { name: "안준석", data: ["선발", "O", "X", "X", "X", "X (2분기 초과)", "", "", "", "", "", "", "", ""] },
  { name: "우민서", data: ["선발", "X", "X", "x", "X", "X (2분기 초과)", "", "", "", "", "", "", "", ""] },
];

async function seedData() {
  console.log("🚀 활동정보 데이터 업로드를 시작합니다...");

  // 학기 데이터 먼저 생성
  const semesterBatch = db.batch();
  semesters.forEach(semester => {
    const semesterRef = db.collection("semesters").doc(semester);
    semesterBatch.set(semesterRef, { 
      createdAt: admin.firestore.FieldValue.serverTimestamp() 
    });
  });
  await semesterBatch.commit();
  console.log(`✅ 학기 ${semesters.length}개 생성 완료`);

  // 회원 데이터 생성 (배치 크기 제한: 500개)
  let activeCount = 0;
  let expelledCount = 0;
  let honoraryCount = 0;
  const BATCH_SIZE = 400; // 안전 마진

  for (let i = 0; i < spreadsheetData.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = spreadsheetData.slice(i, i + BATCH_SIZE);
    
    for (const row of chunk) {
      const history = {};
      let hasActive = false;
      let hasHonorary = false;
      let honoraryStartIndex = -1;

      // 히스토리 데이터 정규화 및 저장
      for (let j = 0; j < semesters.length; j++) {
        const value = normalizeValue(row.data[j] || "");
        if (value) {
          history[semesters[j]] = value;
          if (value === "O") hasActive = true;
          if (value === "명예회원") {
            hasHonorary = true;
            if (honoraryStartIndex === -1) honoraryStartIndex = j;
          }
        }
      }

      // 제적 여부 확인
      const expelled = isExpelled(history);
      
      // 현재 활동 상태 확인 (최근 학기 기준)
      let isActive = false;
      for (let j = semesters.length - 1; j >= 0; j--) {
        const value = history[semesters[j]];
        if (value === "O") {
          isActive = true;
          break;
        } else if (value && value !== "" && value !== "명예회원" && value !== "제적") {
          break;
        }
      }

      const userRef = db.collection("users").doc(row.name);
      batch.set(userRef, {
        name: row.name,
        isActive: isActive && !expelled,
        isAdmin: row.name === "정민우",
        status: expelled ? "expelled" : (hasHonorary ? "honorary" : (isActive ? "active" : "inactive")),
        history: history,
        attendanceScore: 0,
        shuttleDiscount: 0,
        expelled: expelled,
        honoraryStartIndex: honoraryStartIndex >= 0 ? honoraryStartIndex : null,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      if (expelled) expelledCount++;
      else if (hasHonorary) honoraryCount++;
      else if (isActive) activeCount++;
    }

    await batch.commit();
    console.log(`   배치 ${Math.floor(i / BATCH_SIZE) + 1} 완료 (${chunk.length}명)`);
  }
  console.log(`✅ 회원 ${spreadsheetData.length}명 업로드 완료`);
  console.log(`   - 활동 중: ${activeCount}명`);
  console.log(`   - 명예회원: ${honoraryCount}명`);
  console.log(`   - 제적: ${expelledCount}명`);
  console.log("✅ 모든 데이터 업로드 완료!");
  process.exit(0);
}

seedData().catch((error) => {
  console.error("❌ 데이터 업로드 실패:", error);
  process.exit(1);
});
