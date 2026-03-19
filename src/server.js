require('dotenv').config();

const { validateEnv } = require('./config/env');
const logger = require('./config/logger');

// 서버 시작 전 환경변수 검증
const env = validateEnv();

const app = require('./app');
const prisma = require('./config/prisma');
const { startScheduler, stopScheduler } = require('./utils/scheduler');

const PORT = env.PORT;
const SHUTDOWN_TIMEOUT = 30000;

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} (${env.NODE_ENV})`);
  startScheduler();
});

// 요청 타임아웃 설정 (60초)
server.timeout = 60000;

// Keep-alive 타임아웃 (Railway 프록시 호환)
// Railway 프록시보다 길게 설정해야 간헐적 522 방지
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

// Graceful Shutdown
let isShuttingDown = false;

function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`${signal} 수신, 서버 종료 시작...`);

  // 스케줄러 정리
  stopScheduler();

  server.close(async () => {
    logger.info('HTTP 서버 종료 완료');

    try {
      await prisma.$disconnect();
      logger.info('DB 연결 종료 완료');
    } catch (err) {
      logger.error('DB 연결 종료 실패', { error: err.message });
    }

    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Graceful shutdown 타임아웃, 강제 종료');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// 처리되지 않은 에러 캐치
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection', { error: reason?.message || reason });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception', { error: err.message, stack: err.stack });
  shutdown('uncaughtException');
});
