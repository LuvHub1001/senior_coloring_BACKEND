const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
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
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
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
      data: {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      },
    });
  } catch {
    res.status(503).json({
      success: false,
      error: '서비스 일시적으로 사용 불가',
      data: { status: 'degraded' },
    });
  }
});

// 라우터
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/designs', designRouter);
app.use('/api/artworks', artworkRouter);
app.use('/api/themes', themeRouter);

// 에러 핸들링
app.use(errorHandler);

module.exports = app;
