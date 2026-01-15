# 빠른 초기 데이터 생성 가이드

## 가장 빠른 방법 (권장)

### 1단계: Firestore 보안 규칙 임시 완화

1. [Firebase Console](https://console.firebase.google.com) 접속
2. 프로젝트: **g-bird-platform** 선택
3. **Firestore Database** > **규칙** 탭
4. 다음 규칙으로 **임시 교체**:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
5. **게시** 클릭

### 2단계: 데이터 업로드

터미널에서 실행:
```bash
cd /Users/minwoojeong/03_GBird/g-bird-platform
node seed-simple.js
```

### 3단계: 보안 규칙 복원 (중요!)

데이터 업로드 완료 후 **반드시** 보안 규칙을 복원하세요:

1. Firebase Console > Firestore Database > **규칙** 탭
2. `firestore.rules` 파일의 내용으로 복원
3. **게시** 클릭

---

## 생성되는 데이터

- **회원 3명**: 정민우 (관리자), 김민수(물리), 박지성(체육)
- **셔틀콕 재고 125개**: 5박스 × 25개

---

자세한 내용은 `SEED_DATA_GUIDE.md` 참고
