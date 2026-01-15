# 초기 데이터 생성 가이드

## 문제 해결

`seed.js` 실행 시 권한 오류가 발생하는 이유:
- Firestore 보안 규칙이 적용되어 있어 클라이언트 SDK로는 데이터를 쓸 수 없습니다.
- 서버 사이드 스크립트는 Firebase Admin SDK를 사용해야 합니다.

## 해결 방법 (3가지)

### 방법 1: Firebase Admin SDK 사용 (권장)

#### 1단계: 서비스 계정 키 생성
1. [Firebase Console](https://console.firebase.google.com) 접속
2. 프로젝트: **g-bird-platform** 선택
3. 프로젝트 설정 (톱니바퀴 아이콘) > **서비스 계정** 탭
4. **새 비공개 키 생성** 클릭
5. JSON 파일 다운로드
6. 파일을 `g-bird-platform` 폴더에 `serviceAccountKey.json`으로 저장

#### 2단계: seed-admin.js 수정
`seed-admin.js` 파일에서 주석 해제:
```javascript
const serviceAccount = require("./serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "g-bird-platform"
});
```

#### 3단계: 실행
```bash
cd g-bird-platform
npm install firebase-admin
node seed-admin.js
```

### 방법 2: 보안 규칙 임시 완화 (빠른 방법)

#### 1단계: Firestore 규칙 임시 완화
1. Firebase Console > Firestore Database > **규칙** 탭
2. 다음 규칙으로 임시 교체:
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
3. **게시** 클릭

#### 2단계: 데이터 업로드
```bash
cd g-bird-platform
node seed-simple.js
```

#### 3단계: 보안 규칙 복원
데이터 업로드 완료 후:
1. Firebase Console > Firestore Database > **규칙** 탭
2. `firestore.rules` 파일의 내용으로 복원
3. **게시** 클릭

### 방법 3: Firebase Console에서 직접 생성

1. Firebase Console > Firestore Database > **데이터** 탭
2. 수동으로 컬렉션 및 문서 생성

#### users 컬렉션
- 문서 ID: `정민우`
  ```json
  {
    "name": "정민우",
    "status": "active",
    "attendanceScore": 10,
    "shuttleDiscount": 500,
    "isActive": true,
    "isAdmin": true,
    "history": {}
  }
  ```

- 문서 ID: `김민수(물리)`
  ```json
  {
    "name": "김민수(물리)",
    "status": "active",
    "attendanceScore": 5,
    "shuttleDiscount": 0,
    "isActive": true,
    "isAdmin": false,
    "history": {}
  }
  ```

#### inventory 컬렉션
- 문서 ID: `1-1`, `1-2`, ... `5-25` (총 125개)
  ```json
  {
    "id": "1-1",
    "box": 1,
    "number": 1,
    "price": 16000,
    "isSold": false,
    "soldTo": null
  }
  ```

## 권장 순서

1. **방법 2 (임시 완화)** 사용하여 빠르게 데이터 생성
2. 보안 규칙 복원
3. 나중에 **방법 1 (Admin SDK)** 설정하여 자동화

## 주의사항

- `serviceAccountKey.json` 파일은 **절대 Git에 커밋하지 마세요**
- `.gitignore`에 추가되어 있는지 확인:
  ```
  serviceAccountKey.json
  *.json
  !package.json
  !package-lock.json
  !tsconfig.json
  ```
