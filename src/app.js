const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const isProduction = process.env.NODE_ENV === 'production';
const passport = require('./config/passport');
const logger = require('./config/logger');
const { requestId } = require('./middlewares/requestId');
const { apiLimiter } = require('./middlewares/rateLimiter');
const { errorHandler } = require('./middlewares/errorHandler');
const authRouter = require('./routes/auth');
const userRouter = require('./routes/user');
const designRouter = require('./routes/design');
const artworkRouter = require('./routes/artwork');
const themeRouter = require('./routes/theme');
const imageRouter = require('./routes/image');
const communityRouter = require('./routes/community');
const homeRouter = require('./routes/home');
const adminRouter = require('./routes/admin');
const noticeRouter = require('./routes/notice');
const notificationRouter = require('./routes/notification');
const prisma = require('./config/prisma');
const { allowedOrigins } = require('./config/cors');

const app = express();

// 프록시 신뢰 설정 (rate limiter가 실제 클라이언트 IP를 인식)
app.set('trust proxy', 1);

// Request ID 추적
app.use(requestId);

// 보안 미들웨어
app.use(
  helmet({
    // CSP: API 서버이므로 모든 리소스 로딩 차단
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    // HSTS: HTTPS 강제 (1년, 서브도메인 포함)
    strictTransportSecurity: {
      maxAge: 31536000,
      includeSubDomains: true,
    },
    // 클릭재킹 방지
    frameguard: { action: 'deny' },
    // Referrer 최소 노출
    referrerPolicy: { policy: 'no-referrer' },
    // 기능 제한 (API 서버에 불필요한 브라우저 기능 차단)
    permissionsPolicy: {
      features: {
        camera: [],
        microphone: [],
        geolocation: [],
      },
    },
  }),
);
app.use(
  cors({
    origin: function (origin, callback) {
      // 서버 간 요청(origin 없음) 또는 허용된 origin
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS 정책에 의해 차단되었습니다.'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    maxAge: 86400,
  }),
);

// 응답 압축 (gzip/br) — JSON 응답 대역폭 40-70% 절감
app.use(compression());

// 쿠키 파서
app.use(cookieParser());

// 요청 파싱 (body 크기 제한)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// HTTP 로깅 (winston 연동)
app.use(
  morgan('short', {
    stream: logger.stream,
    skip: (req) => req.url === '/health',
  }),
);

// Passport 초기화
app.use(passport.initialize());

// 전역 Rate Limiting (E2E 테스트 로그인은 제외)
app.use('/api', (req, res, next) => {
  if (req.path === '/auth/test-login' && process.env.NODE_ENV !== 'production') {
    return next();
  }
  return apiLimiter(req, res, next);
});

// 헬스체크 (DB 연결 상태 포함)
app.get('/health', async (req, res) => {
  let timer;
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('DB health check timeout')), 5000);
      }),
    ]);

    res.json({
      success: true,
      data: { status: 'ok' },
    });
  } catch {
    res.status(503).json({
      success: false,
      error: '서비스 일시적으로 사용 불가',
      data: { status: 'degraded' },
    });
  } finally {
    clearTimeout(timer);
  }
});

// Swagger API 문서 (개발 환경에서만 노출)
if (!isProduction) {
  const swaggerUi = require('swagger-ui-express');
  const swaggerSpec = require('./config/swagger');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    swaggerOptions: {
      persistAuthorization: true,
    },
  }));
}

// 라우터
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/designs', designRouter);
app.use('/api/artworks', artworkRouter);
app.use('/api/themes', themeRouter);
app.use('/api/images', imageRouter);
app.use('/api/community', communityRouter);
app.use('/api/home', homeRouter);
app.use('/api/admin', adminRouter);
app.use('/api/notices', noticeRouter);
app.use('/api/notifications', notificationRouter);

// 에러 핸들링
app.use(errorHandler);

module.exports = app;
