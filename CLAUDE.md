# Senior Coloring Book Backend

시니어 컬러링 북 백엔드 서비스

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express
- **Language**: JavaScript
- **DB**: PostgreSQL (Supabase)
- **ORM**: TBD (Prisma or Sequelize)

## Project Structure

```
senior_coloring_BACKEND/
├── src/
│   ├── routes/        # Express 라우터
│   ├── controllers/   # 요청 처리 로직
│   ├── services/      # 비즈니스 로직
│   ├── models/        # 데이터 모델
│   ├── middlewares/    # Express 미들웨어
│   └── utils/         # 유틸리티 함수
├── config/            # 환경 설정
├── tests/             # 테스트
├── package.json
└── CLAUDE.md
```

## Conventions

- 라우터 파일은 `routes/` 하위에 리소스 단위로 분리
- 컨트롤러는 요청/응답만 처리하고 비즈니스 로직은 `services/`에 위임
- 환경 변수는 `.env` 파일로 관리 (커밋 금지)
- API 응답 형식 통일: `{ success: boolean, data?: any, error?: string }`

## Commands

```bash
npm install          # 의존성 설치
npm start            # 서버 실행
npm run dev          # 개발 모드 실행
npm test             # 테스트 실행
```

## Rules

### 최우선: 보안
- 모든 코드 작성 및 수정 시 보안 취약점 점검을 최우선으로 한다
- OWASP Top 10 항목을 항상 고려한다 (SQL Injection, XSS, CSRF 등)
- 사용자 입력은 반드시 검증 및 sanitize 처리한다
- 인증/인가 로직은 미들웨어에서 일관되게 처리한다
- 민감 정보(비밀번호, 토큰 등)는 평문 저장 금지, 반드시 암호화한다
- 의존성 추가 시 알려진 취약점이 없는지 확인한다
- rate limiting을 적용하여 무차별 공격을 방지한다

### API 작성 후 프론트엔드 프롬프트 제공
- API를 새로 작성하거나 수정하면, 프론트엔드에서 해당 API를 연동할 수 있도록 프롬프트를 반드시 함께 제공한다
- 프롬프트에는 엔드포인트, HTTP 메서드, 요청/응답 형식, 인증 방식, 사용 예시를 포함한다

### 일반
- `.env` 파일은 절대 커밋하지 않는다
- 에러 처리는 미들웨어에서 통합 관리한다
- 에러 응답에 내부 구현 상세를 노출하지 않는다
- 한국어 주석 사용 가능
