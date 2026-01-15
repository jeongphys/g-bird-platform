# G-Bird 플랫폼 배포 가이드

## 1. 배포 전 준비사항

### 1.1 의존성 설치 확인
```bash
cd g-bird-platform
npm install
```

### 1.2 빌드 테스트
```bash
npm run build
```
빌드가 성공하면 `.next` 폴더가 생성됩니다.

### 1.3 Firebase 설정 확인
`lib/firebase.ts` 파일의 Firebase 설정값이 올바른지 확인하세요.
- 이미 설정되어 있으므로 추가 작업 불필요

## 2. Vercel 배포 (권장)

### 2.1 Vercel 계정 준비
1. [Vercel](https://vercel.com)에 가입/로그인
2. GitHub 계정과 연동 (선택사항)

### 2.2 Vercel CLI로 배포
```bash
# Vercel CLI 설치 (전역)
npm install -g vercel

# 프로젝트 디렉토리에서
cd g-bird-platform
vercel

# 첫 배포 시:
# - Set up and deploy? Yes
# - Which scope? 본인의 계정 선택
# - Link to existing project? No (처음이면)
# - Project name? g-bird-platform (또는 원하는 이름)
# - Directory? ./
# - Override settings? No
```

### 2.3 GitHub 연동 배포 (권장)
1. GitHub에 프로젝트 푸시
2. Vercel 대시보드에서 "Add New Project" 클릭
3. GitHub 저장소 선택
4. 프로젝트 설정:
   - Framework Preset: Next.js
   - Root Directory: `g-bird-platform`
   - Build Command: `npm run build`
   - Output Directory: `.next`
5. "Deploy" 클릭

## 3. 배포 후 필수 설정

### 3.1 Firebase Authentication 설정
1. [Firebase Console](https://console.firebase.google.com) 접속
2. 프로젝트 선택: `gbird-feb78`
3. Authentication > Sign-in method 이동
4. **Google** 제공업체 활성화:
   - "Google" 클릭
   - "사용 설정" 토글 ON
   - 프로젝트 지원 이메일 설정
   - 저장

5. **승인된 도메인 추가**:
   - Authentication > Settings > 승인된 도메인
   - Vercel 배포 URL 추가 (예: `g-bird-platform.vercel.app`)
   - 커스텀 도메인 사용 시 해당 도메인도 추가

### 3.2 Firestore 보안 규칙 설정
Firebase Console > Firestore Database > 규칙 탭에서 다음 규칙 적용:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 사용자 데이터: 본인만 읽기/쓰기 가능
    match /users/{userId} {
      allow read: if request.auth != null || request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // 세션 데이터: 모든 인증된 사용자 읽기, 관리자만 쓰기
    match /sessions/{sessionId} {
      allow read: if request.auth != null;
      allow write: if false; // API 라우트에서만 쓰기
    }
    
    // 공지사항: 모든 사용자 읽기, 관리자만 쓰기
    match /notices/{noticeId} {
      allow read: if true;
      allow write: if false; // 관리자 페이지에서만 쓰기
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
      allow write: if false; // 관리자 페이지에서만 쓰기
    }
    
    // 주문: 본인 주문만 읽기, 본인만 생성
    match /orders/{orderId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if false; // 관리자 페이지에서만 업데이트
    }
    
    // 학기: 모든 인증된 사용자 읽기
    match /semesters/{semesterId} {
      allow read: if request.auth != null;
      allow write: if false; // 관리자 페이지에서만 쓰기
    }
  }
}
```

### 3.3 Firebase Storage 보안 규칙 설정
Firebase Console > Storage > 규칙 탭에서 다음 규칙 적용:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // 앨범 이미지: 인증된 사용자만 읽기/쓰기
    match /albums/{albumId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // 공지사항 이미지: 모든 사용자 읽기, 관리자만 쓰기
    match /images/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### 3.4 초기 데이터 설정
배포 후 첫 실행 시 다음을 수행하세요:

1. **관리자 계정 생성**:
   - Firestore Console에서 `users` 컬렉션에 관리자 문서 생성
   - 문서 ID: `admin` 또는 관리자 이름
   - 필드:
     ```json
     {
       "name": "관리자",
       "isActive": true,
       "isAdmin": true,
       "shuttleDiscount": 0,
       "attendanceScore": 0,
       "history": {}
     }
     ```

2. **학기 데이터 생성** (선택):
   - `semesters` 컬렉션에 현재 학기 추가
   - 예: `2025-spring`, `2025-summer`

3. **재고 데이터 생성**:
   - `seed.js` 실행하여 초기 재고 생성:
     ```bash
     node seed.js
     ```

## 4. 배포 후 확인 사항

### 4.1 기능 테스트 체크리스트

#### 인증 시스템
- [ ] Google 로그인 작동 확인
- [ ] 이름 기반 로그인 작동 확인
- [ ] 관리자 로그인 작동 확인
- [ ] 로그아웃 작동 확인

#### 회원 기능
- [ ] 셔틀콕 구매 페이지 접근
- [ ] 재고 목록 표시 확인
- [ ] 주문 신청 기능 확인

#### 관리자 기능
- [ ] 관리자 페이지 접근
- [ ] 출석 관리 페이지 접근
- [ ] 회원 관리 페이지 접근
- [ ] 회계 관리 페이지 접근
- [ ] 공지사항 작성/수정/삭제
- [ ] 출석 세션 생성 및 QR 코드 생성

#### 공개 기능
- [ ] 공지사항 목록/상세 보기
- [ ] 자유게시판 글 작성/조회/삭제
- [ ] 앨범 목록/상세 보기
- [ ] 이미지 업로드 기능

### 4.2 성능 확인
- [ ] 페이지 로딩 속도 확인
- [ ] 이미지 로딩 속도 확인
- [ ] 실시간 데이터 동기화 확인 (출석 현황 등)

### 4.3 보안 확인
- [ ] Firestore 보안 규칙 적용 확인
- [ ] Storage 보안 규칙 적용 확인
- [ ] 관리자 권한 체크 작동 확인

## 5. 커스텀 도메인 설정 (선택)

### 5.1 Vercel에서 도메인 추가
1. Vercel 대시보드 > 프로젝트 > Settings > Domains
2. 도메인 추가
3. DNS 설정 안내에 따라 DNS 레코드 추가

### 5.2 Firebase에 도메인 추가
1. Firebase Console > Authentication > Settings > 승인된 도메인
2. 커스텀 도메인 추가

## 6. 문제 해결

### 6.1 빌드 오류
- `npm install` 재실행
- `node_modules` 삭제 후 재설치
- TypeScript 오류 확인

### 6.2 인증 오류
- Firebase Authentication 설정 확인
- 승인된 도메인 확인
- Firebase API 키 확인

### 6.3 데이터베이스 오류
- Firestore 보안 규칙 확인
- Firebase 프로젝트 ID 확인
- 네트워크 연결 확인

### 6.4 이미지 업로드 오류
- Storage 보안 규칙 확인
- 파일 크기 제한 확인
- Storage 버킷 권한 확인

## 7. 유지보수

### 7.1 정기 점검
- 주기적으로 Firestore 사용량 확인
- Storage 사용량 확인
- 에러 로그 확인 (Vercel 대시보드)

### 7.2 백업
- Firestore 데이터 정기 백업
- 중요한 데이터는 수동으로 Export

### 7.3 업데이트
- 의존성 패키지 정기 업데이트
- `npm audit` 실행하여 보안 취약점 확인

## 8. 연락처 및 지원

문제가 발생하면:
1. Vercel 대시보드의 로그 확인
2. Firebase Console의 로그 확인
3. 브라우저 개발자 도구 콘솔 확인

---

**배포 완료 후 반드시 확인할 사항:**
1. ✅ Firebase Authentication 설정 (Google 로그인 활성화)
2. ✅ Firestore 보안 규칙 적용
3. ✅ Storage 보안 규칙 적용
4. ✅ 초기 데이터 설정 (관리자 계정, 재고 등)
5. ✅ 모든 기능 테스트
