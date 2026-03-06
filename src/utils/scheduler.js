const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 고아 작품 정리: 생성 후 24시간 경과 + imageUrl이 null + IN_PROGRESS
async function cleanupOrphanArtworks() {
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
      console.log(`[Scheduler] 고아 작품 ${count}건 삭제 완료`);
    }
  } catch (err) {
    console.error('[Scheduler] 고아 작품 정리 실패:', err.message);
  }
}

// 1시간마다 실행
function startScheduler() {
  const INTERVAL = 60 * 60 * 1000;
  cleanupOrphanArtworks();
  setInterval(cleanupOrphanArtworks, INTERVAL);
  console.log('[Scheduler] 고아 작품 정리 스케줄러 시작 (1시간 간격)');
}

module.exports = { startScheduler };
