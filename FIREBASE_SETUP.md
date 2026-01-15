# Firebase 보안 규칙 설정 가이드

## 1. Firestore 보안 규칙 적용

1. [Firebase Console](https://console.firebase.google.com) 접속
2. 프로젝트 선택: **g-bird-platform**
3. 왼쪽 메뉴에서 **Firestore Database** 클릭
4. **규칙** 탭 클릭
5. 아래 규칙을 복사하여 붙여넣기:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 사용자 데이터: 본인만 읽기/쓰기 가능, 관리자는 모든 사용자 읽기 가능
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && (request.auth.uid == userId || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true);
    }
    
    // 세션 데이터: 모든 인증된 사용자 읽기, API 라우트에서만 쓰기
    match /sessions/{sessionId} {
      allow read: if request.auth != null;
      allow write: if false; // API 라우트에서만 쓰기
    }
    
    // 공지사항: 모든 사용자 읽기, 관리자만 쓰기
    match /notices/{noticeId} {
      allow read: if true;
      allow write: if false; // 관리자 페이지에서만 쓰기 (서버 사이드 검증)
    }
    
    // 자유게시판: 모든 사용자 읽기/쓰기
    match /freeboard/{postId} {
      allow read: if true;
      allow create: if true;
      allow delete: if true; // 비밀번호로 보호됨
    }
    
    // 앨범: 인증된 사용자만 읽기/쓰기
    match /albums/{albumId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /albumImages/{imageId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // 재고: 인증된 사용자 읽기, 관리자만 쓰기
    match /inventory/{itemId} {
      allow read: if request.auth != null;
      allow write: if false; // 관리자 페이지에서만 쓰기 (서버 사이드 검증)
    }
    
    // 주문: 본인 주문만 읽기, 본인만 생성
    match /orders/{orderId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if false; // 관리자 페이지에서만 업데이트 (서버 사이드 검증)
    }
    
    // 학기: 모든 인증된 사용자 읽기
    match /semesters/{semesterId} {
      allow read: if request.auth != null;
      allow write: if false; // 관리자 페이지에서만 쓰기 (서버 사이드 검증)
    }
  }
}
```

6. **게시** 버튼 클릭

## 2. Storage 보안 규칙 적용

1. Firebase Console에서 **Storage** 클릭
2. **규칙** 탭 클릭
3. 아래 규칙을 복사하여 붙여넣기:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // 앨범 이미지: 인증된 사용자만 읽기/쓰기
    match /albums/{albumId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // 공지사항 이미지: 모든 사용자 읽기, 인증된 사용자만 쓰기
    match /images/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

4. **게시** 버튼 클릭

## 3. Authentication 설정

1. Firebase Console에서 **Authentication** 클릭
2. **Sign-in method** 탭 클릭
3. **Google** 제공업체 클릭
4. **사용 설정** 토글 ON
5. 프로젝트 지원 이메일 선택
6. **저장** 클릭

## 4. 승인된 도메인 추가 (배포 후)

배포가 완료되면:
1. Authentication > **Settings** 탭
2. **승인된 도메인** 섹션
3. Vercel 배포 URL 추가 (예: `g-bird-platform.vercel.app`)
4. 커스텀 도메인 사용 시 해당 도메인도 추가

## 5. 초기 데이터 생성

터미널에서 실행:
```bash
cd g-bird-platform
node seed.js
```

이 명령어는 다음을 생성합니다:
- 회원 데이터 3명 (예시)
- 셔틀콕 재고 125개 (5박스 × 25개)
