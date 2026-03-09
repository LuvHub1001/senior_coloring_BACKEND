# Senior Coloring Book Backend

시니어 컬러링 북 백엔드 서비스

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express
- **Language**: JavaScript
- **DB**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Validation**: Zod
- **Logging**: Winston
- **Security**: Helmet, CORS whitelist, express-rate-limit
- **Testing**: Jest + Supertest
- **Auth**: JWT (Access + Refresh Token rotation)

## Project Structure

```
senior_coloring_BACKEND/
├── src/
│   ├── routes/        # Express 라우터
│   ├── controllers/   # 요청 처리 로직
│   ├── services/      # 비즈니스 로직
│   ├── validators/    # Zod 입력 검증 스키마
│   ├── middlewares/   # Express 미들웨어 (auth, validate, rateLimiter, errorHandler)
│   ├── config/        # 환경 설정 (env, logger, passport, supabase)
│   └── utils/         # 유틸리티 함수
├── prisma/            # Prisma 스키마 & 마이그레이션
├── tests/             # Jest 테스트
│   ├── helpers/       # 테스트 헬퍼 (prisma-mock 등)
│   ├── services/      # 서비스 단위 테스트
│   ├── routes/        # 라우트 통합 테스트
│   └── integration/   # 워크플로우 통합 테스트
├── logs/              # 로그 파일 (gitignore)
├── package.json
└── CLAUDE.md
```

## Conventions

- 라우터 파일은 `routes/` 하위에 리소스 단위로 분리
- 컨트롤러는 요청/응답만 처리하고 비즈니스 로직은 `services/`에 위임
- 환경 변수는 `.env` 파일로 관리 (커밋 금지)
- API 응답 형식 통일: `{ success: boolean, data?: any, error?: string }`
- **입력 검증은 `validators/`에 Zod 스키마로 정의하고 `validate` 미들웨어로 적용** (컨트롤러에서 수동 검증 금지)
- **로깅은 `console.log` 대신 `logger` (Winston) 사용**
- **Rate Limiting은 `rateLimiter.js`의 미들웨어를 라우트에 적용** (apiLimiter, authLimiter, uploadLimiter)

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
- 사용자 입력은 반드시 Zod 스키마로 검증한다 (`src/validators/` 참조)
- 인증/인가 로직은 미들웨어에서 일관되게 처리한다
- 민감 정보(비밀번호, 토큰 등)는 평문 저장 금지, 반드시 암호화한다
- 의존성 추가 시 알려진 취약점이 없는지 확인한다
- rate limiting을 적용하여 무차별 공격을 방지한다 (`src/middlewares/rateLimiter.js`)
- CORS는 반드시 허용 origin을 지정한다 (와일드카드 금지)
- 요청 body 크기 제한을 설정한다

### 입력 검증 패턴
- 새 API 작성 시 반드시 `src/validators/`에 Zod 스키마 파일 생성
- 라우트에서 `validate(schema)` 미들웨어로 적용
- 컨트롤러에서 `if (!field)` 같은 수동 검증은 하지 않는다
- 숫자 파라미터는 `z.coerce.number()`로 자동 변환
- 문자열은 min/max 길이 제한 필수

### 로깅 규칙
- `console.log`, `console.error` 사용 금지 → `logger.info()`, `logger.error()` 사용
- 에러 로깅 시 context 포함 (userId, method, url 등)
- 민감 정보(토큰, 비밀번호)는 절대 로그에 포함하지 않는다

### 인증 토큰 관리
- Access Token: 1시간 만료 (JWT)
- Refresh Token: 30일 만료 (DB 저장, rotation 방식)
- 로그아웃 시 해당 유저의 모든 refresh token 삭제
- 만료된 refresh token은 스케줄러가 1시간마다 정리

### DB & PrismaClient
- PrismaClient는 반드시 `src/config/prisma.js` 싱글톤으로 사용 (직접 `new PrismaClient()` 금지)
- DB 인덱스: artworks(userId+status, designId), designs(category) 설정됨
- 쿼리 성능을 위해 필요한 필드만 select, include는 최소화

### 서버 운영
- 서버 시작 시 환경변수 검증 필수 (`src/config/env.js`)
- Graceful shutdown 처리 (SIGTERM, SIGINT, 30초 타임아웃)
- 처리되지 않은 에러는 프로세스 레벨에서 캐치
- Request ID를 모든 요청에 부여하여 추적 (`X-Request-Id` 헤더)
- 아침 9시 헬스체크 스케줄러 (DB, Storage, 통계, 메모리 점검)
- 고아 작품 정리 (1시간 간격), 만료 토큰 정리 (1시간 간격)

### 테스트
- `npm test`로 Jest 테스트 실행 (18 suites, 142 tests)
- `npm run test:coverage`로 커버리지 확인
- 테스트 파일은 `tests/` 디렉토리에 `*.test.js` 패턴으로 작성
- Prisma mock은 `tests/helpers/prisma-mock.js`를 공유해서 사용
- 새 기능 추가 시 최소한 validator + service + route 테스트 작성
- 통합 테스트는 `tests/integration/`에 워크플로우 단위로 작성

### API 작성 후 프론트엔드 프롬프트 제공
- API를 새로 작성하거나 수정하면, 프론트엔드에서 해당 API를 연동할 수 있도록 프롬프트를 반드시 함께 제공한다
- 프롬프트에는 엔드포인트, HTTP 메서드, 요청/응답 형식, 인증 방식, 사용 예시를 포함한다

### 설계 원칙: 확장성, 유연성, 최적화
- 데이터 모델과 API 설계 시 향후 확장성을 고려한다
- 하드코딩보다 DB 기반 설정을 우선하여 유연하게 대응한다
- 조회 성능을 고려하여 자주 사용되는 값은 미리 계산하여 저장한다 (예: progress)
- N+1 쿼리를 방지하고, 필요한 데이터만 선택적으로 조회한다

### 일반
- `.env` 파일은 절대 커밋하지 않는다
- 에러 처리는 미들웨어에서 통합 관리한다
- 에러 응답에 내부 구현 상세를 노출하지 않는다
- 한국어 주석 사용 가능
