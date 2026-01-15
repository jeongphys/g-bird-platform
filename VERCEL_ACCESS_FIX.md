# Vercel 접근 제한 해제 가이드

## 문제
배포된 사이트에 접근할 때 "Vercel 아이디 입력" 또는 비밀번호 입력 화면이 나타나는 경우

## 해결 방법

### 방법 1: Deployment Protection 비활성화 (가장 일반적)

1. [Vercel Dashboard](https://vercel.com/dashboard) 접속
2. 프로젝트 **g-bird-platform** 클릭
3. 상단 메뉴에서 **Settings** 클릭
4. 왼쪽 사이드바에서 **Deployment Protection** 찾기
5. **Password Protection** 섹션 확인
   - 활성화되어 있다면 **Disable** 또는 **Remove** 클릭
6. 변경사항 저장

### 방법 2: Settings > General에서 확인

1. **Settings** > **General** 이동
2. 아래 항목들 확인:
   - **Password Protection**: 비활성화되어 있는지 확인
   - **Deployment Protection**: 비활성화되어 있는지 확인
3. 활성화되어 있다면 비활성화

### 방법 3: 팀/조직 설정 확인

팀 계정을 사용하는 경우:
1. **Settings** > **Team** 또는 **Organization** 확인
2. 팀 레벨의 Password Protection 설정 확인
3. 필요시 비활성화

### 방법 4: Vercel CLI로 확인

```bash
# 프로젝트 디렉토리에서
cd g-bird-platform
vercel project ls

# 프로젝트 정보 확인
vercel inspect [배포 URL]
```

## 확인 방법

설정 변경 후:
1. 배포 URL에 다시 접속
2. 비밀번호 입력 화면이 사라졌는지 확인
3. 사이트가 정상적으로 로드되는지 확인

## 참고사항

- Vercel의 기본 설정은 **Public**입니다
- Password Protection은 수동으로 활성화한 경우에만 나타납니다
- 팀/조직 계정의 경우 팀 설정이 우선 적용될 수 있습니다
- 변경사항은 즉시 적용됩니다 (재배포 불필요)
