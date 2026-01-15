# 빠른 배포 가이드

## 1단계: 빌드 확인
```bash
cd g-bird-platform
npm install
npm run build
```

## 2단계: Vercel 배포

### 방법 A: Vercel CLI 사용
```bash
npm install -g vercel
vercel
```

### 방법 B: GitHub 연동 (권장)
1. GitHub에 코드 푸시
2. [Vercel](https://vercel.com) 접속
3. "Add New Project" → GitHub 저장소 선택
4. 자동 감지된 설정으로 배포

## 3단계: Firebase 설정 (배포 후 필수!)

### 1. Google 로그인 활성화
- Firebase Console > Authentication > Sign-in method
- Google 활성화
- 승인된 도메인에 Vercel URL 추가

### 2. 보안 규칙 적용
- Firestore: `DEPLOYMENT_GUIDE.md` 참고
- Storage: `DEPLOYMENT_GUIDE.md` 참고

### 3. 초기 데이터 설정
```bash
# 재고 데이터 생성
node seed.js
```

## 4단계: 테스트
1. 배포된 URL 접속
2. Google 로그인 테스트
3. 관리자 페이지 접속 테스트
4. 각 기능 동작 확인

---
**자세한 내용은 `DEPLOYMENT_GUIDE.md` 참고**
