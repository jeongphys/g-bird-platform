# 배포 완료 체크리스트

## ✅ 완료된 작업

1. ✅ 새 Firebase 프로젝트 설정 적용 (`lib/firebase.ts`, `seed.js`)
2. ✅ 빌드 성공 확인
3. ✅ Vercel 배포 진행

## 🔧 배포 후 필수 작업 (직접 수행 필요)

### 1. Firebase 보안 규칙 적용 (중요!)

**Firestore 규칙:**
1. [Firebase Console](https://console.firebase.google.com) 접속
2. 프로젝트: **g-bird-platform** 선택
3. **Firestore Database** > **규칙** 탭
4. `firestore.rules` 파일 내용 복사하여 붙여넣기
5. **게시** 클릭

**Storage 규칙:**
1. **Storage** > **규칙** 탭
2. `storage.rules` 파일 내용 복사하여 붙여넣기
3. **게시** 클릭

### 2. Firebase Authentication 설정

1. **Authentication** > **Sign-in method** 탭
2. **Google** 제공업체 클릭
3. **사용 설정** 토글 ON
4. 프로젝트 지원 이메일 선택
5. **저장** 클릭

### 3. 승인된 도메인 추가

배포 URL 확인 후:
1. **Authentication** > **Settings** 탭
2. **승인된 도메인** 섹션
3. 다음 도메인 추가:
   - `g-bird-platform.vercel.app` (또는 실제 배포 URL)
   - `*.vercel.app` (모든 Vercel 서브도메인)
   - 커스텀 도메인 사용 시 해당 도메인

### 4. 초기 데이터 생성

터미널에서 실행:
```bash
cd g-bird-platform
node seed.js
```

생성되는 데이터:
- 회원 3명 (예시)
- 셔틀콕 재고 125개

### 5. 배포 URL 확인

Vercel 대시보드에서 최종 배포 URL 확인:
- [Vercel Dashboard](https://vercel.com/dashboard)
- 프로젝트: `g-bird-platform`
- **Domains** 섹션에서 URL 확인

## 🧪 배포 후 테스트

배포된 사이트에서 다음을 테스트하세요:

### 기본 기능
- [ ] 홈페이지 접속
- [ ] 로그인 페이지 접속
- [ ] Google 로그인 작동 확인
- [ ] 이름 기반 로그인 작동 확인

### 회원 기능
- [ ] 셔틀콕 구매 페이지 접속
- [ ] 재고 목록 표시 확인
- [ ] 주문 신청 기능

### 관리자 기능
- [ ] 관리자 로그인 (admin / admin1234)
- [ ] 출석 관리 페이지 접근
- [ ] 회원 관리 페이지 접근
- [ ] 회계 관리 페이지 접근
- [ ] 공지사항 작성/수정/삭제
- [ ] 출석 세션 생성 및 QR 코드 생성

### 공개 기능
- [ ] 공지사항 목록/상세 보기
- [ ] 자유게시판 글 작성/조회/삭제
- [ ] 앨범 목록/상세 보기
- [ ] 이미지 업로드 기능

## 📝 참고 파일

- `FIREBASE_SETUP.md` - Firebase 설정 상세 가이드
- `firestore.rules` - Firestore 보안 규칙
- `storage.rules` - Storage 보안 규칙
- `DEPLOYMENT_GUIDE.md` - 전체 배포 가이드

## ⚠️ 문제 발생 시

1. **빌드 오류**: Vercel 대시보드 > Deployments > 해당 배포 > Build Logs 확인
2. **인증 오류**: Firebase Console > Authentication > 승인된 도메인 확인
3. **데이터베이스 오류**: Firebase Console > Firestore > 규칙 확인
4. **이미지 업로드 오류**: Firebase Console > Storage > 규칙 확인
