const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
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
const galleryRouter = require('./routes/gallery');
const prisma = require('./config/prisma');

const app = express();

// 프록시 신뢰 설정 (rate limiter가 실제 클라이언트 IP를 인식)
app.set('trust proxy', 1);

// Request ID 추적
app.use(requestId);

// 보안 미들웨어
app.use(helmet());
app.use(
  cors({
    origin: function (origin, callback) {
      // 허용할 origin 목록 (CLIENT_URL 쉼표 구분 지원)
      const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
        .split(',')
        .map((o) => o.trim());

      // 서버 간 요청(origin 없음) 또는 허용된 origin
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS 정책에 의해 차단되었습니다.'));
      }
    },
    credentials: true,
  }),
);

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

// 전역 Rate Limiting
app.use('/api', apiLimiter);

// 헬스체크 (DB 연결 상태 포함)
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

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
app.use('/api/gallery', galleryRouter);

// 에러 핸들링
app.use(errorHandler);

module.exports = app;
