# G-Bird 플랫폼

배드민턴 클럽 운영을 위한 통합 관리 플랫폼

## 주요 기능

- ✅ 출석 관리 (QR 코드 기반, 실시간 모니터링)
- ✅ 셔틀콕 구매/재고 관리
- ✅ 회원 관리
- ✅ 공지사항
- ✅ 자유게시판
- ✅ 앨범 (이미지 갤러리)
- ✅ 통합 대시보드

## 시작하기

### 개발 서버 실행
```bash
npm install
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

### 빌드
```bash
npm run build
npm start
```

## 배포

자세한 배포 가이드는 다음 파일을 참고하세요:
- **빠른 시작**: `QUICK_START.md`
- **상세 가이드**: `DEPLOYMENT_GUIDE.md`

### 빠른 배포 (Vercel)
```bash
npm install -g vercel
vercel
```

## 기술 스택

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Storage**: Firebase Storage
- **Deployment**: Vercel

## 프로젝트 구조

```
g-bird-platform/
├── app/              # Next.js App Router 페이지
│   ├── admin/        # 관리자 페이지
│   ├── auth/         # 인증 페이지
│   ├── notice/       # 공지사항
│   ├── freeboard/    # 자유게시판
│   ├── album/        # 앨범
│   └── dashboard/    # 대시보드
├── lib/              # 유틸리티 함수
├── types/            # TypeScript 타입 정의
└── components/       # React 컴포넌트
```

## 라이선스

Private
