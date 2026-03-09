const prisma = require('../config/prisma');
const logger = require('../config/logger');
const { cleanupExpiredTokens } = require('./jwt');
const supabase = require('../config/supabase');

let intervalHandle = null;
let morningCheckHandle = null;
let isRunning = false;

// 고아 작품 정리: 생성 후 24시간 경과 + imageUrl이 null + IN_PROGRESS
async function cleanupOrphanArtworks() {
  if (isRunning) return;
  isRunning = true;

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    const { count } = await prisma.artwork.deleteMany({
      where: {
        status: 'IN_PROGRESS',
        imageUrl: null,
        createdAt: { lt: cutoff },
      },
    });

    if (count > 0) {
      logger.info(`고아 작품 ${count}건 삭제 완료`, { scheduler: 'cleanupOrphanArtworks' });
    }
  } catch (err) {
    logger.error('고아 작품 정리 실패', { scheduler: 'cleanupOrphanArtworks', error: err.message });
  } finally {
    isRunning = false;
  }
}

// 만료된 refresh token 정리
async function cleanupTokens() {
  try {
    const count = await cleanupExpiredTokens();
    if (count > 0) {
      logger.info(`만료된 refresh token ${count}건 삭제 완료`, { scheduler: 'cleanupTokens' });
    }
  } catch (err) {
    logger.error('만료 토큰 정리 실패', { scheduler: 'cleanupTokens', error: err.message });
  }
}

// 아침 서버 점검 (매일 오전 9시)
async function morningHealthCheck() {
  const results = { timestamp: new Date().toISOString(), checks: {} };

  // 1. DB 연결 확인
  try {
    await prisma.$queryRaw`SELECT 1`;
    results.checks.database = 'ok';
  } catch (err) {
    results.checks.database = 'fail';
    logger.error('아침 점검: DB 연결 실패', { error: err.message });
  }

  // 2. Supabase Storage 연결 확인
  try {
    const { error } = await supabase.storage.listBuckets();
    results.checks.storage = error ? 'fail' : 'ok';
    if (error) {
      logger.error('아침 점검: Storage 연결 실패', { error: error.message });
    }
  } catch (err) {
    results.checks.storage = 'fail';
    logger.error('아침 점검: Storage 연결 실패', { error: err.message });
  }

  // 3. 통계 수집
  try {
    const [userCount, artworkCount, orphanCount, expiredTokenCount] = await Promise.all([
      prisma.user.count(),
      prisma.artwork.count(),
      prisma.artwork.count({
        where: {
          status: 'IN_PROGRESS',
          imageUrl: null,
          createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.refreshToken.count({
        where: { expiresAt: { lt: new Date() } },
      }),
    ]);

    results.checks.stats = {
      users: userCount,
      artworks: artworkCount,
      orphanArtworks: orphanCount,
      expiredTokens: expiredTokenCount,
    };
  } catch (err) {
    results.checks.stats = 'fail';
    logger.error('아침 점검: 통계 수집 실패', { error: err.message });
  }

  // 4. 메모리 사용량
  const mem = process.memoryUsage();
  results.checks.memory = {
    heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
    heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
    rssMB: Math.round(mem.rss / 1024 / 1024),
  };

  // 5. 업타임
  results.checks.uptimeHours = Math.round(process.uptime() / 3600 * 10) / 10;

  const allOk = results.checks.database === 'ok' && results.checks.storage === 'ok';
  const level = allOk ? 'info' : 'warn';

  logger[level]('아침 서버 점검 완료', { scheduler: 'morningHealthCheck', ...results });

  return results;
}

// 다음 오전 9시까지 남은 ms 계산
function msUntilNextMorning() {
  const now = new Date();
  const next = new Date(now);
  next.setHours(9, 0, 0, 0);

  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime() - now.getTime();
}

// 아침 점검 스케줄 시작
function scheduleMorningCheck() {
  const ms = msUntilNextMorning();
  const hours = Math.round(ms / 3600000 * 10) / 10;
  logger.info(`다음 아침 점검까지 ${hours}시간`, { scheduler: 'morningHealthCheck' });

  morningCheckHandle = setTimeout(() => {
    morningHealthCheck();
    // 이후 24시간마다 반복
    morningCheckHandle = setInterval(morningHealthCheck, 24 * 60 * 60 * 1000);
  }, ms);
}

// 1시간마다 정리 작업 실행
function startScheduler() {
  const INTERVAL = 60 * 60 * 1000;

  // 초기 실행
  cleanupOrphanArtworks();
  cleanupTokens();

  // 정기 실행
  intervalHandle = setInterval(() => {
    cleanupOrphanArtworks();
    cleanupTokens();
  }, INTERVAL);

  // 아침 점검 스케줄
  scheduleMorningCheck();

  logger.info('스케줄러 시작: 정리(1시간), 아침 점검(매일 09:00)');
}

function stopScheduler() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
  if (morningCheckHandle) {
    clearTimeout(morningCheckHandle);
    clearInterval(morningCheckHandle);
    morningCheckHandle = null;
  }
  logger.info('스케줄러 종료');
}

module.exports = { startScheduler, stopScheduler, morningHealthCheck };
