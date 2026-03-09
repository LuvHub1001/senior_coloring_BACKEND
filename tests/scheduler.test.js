require('./setup');

const mockPrisma = {
  $queryRaw: jest.fn(),
  artwork: { deleteMany: jest.fn(), count: jest.fn() },
  refreshToken: { deleteMany: jest.fn(), count: jest.fn() },
  user: { count: jest.fn() },
};

jest.mock('../src/config/prisma', () => mockPrisma);

jest.mock('../src/config/supabase', () => ({
  storage: {
    listBuckets: jest.fn().mockResolvedValue({ error: null }),
  },
}));

jest.mock('../src/utils/jwt', () => ({
  cleanupExpiredTokens: jest.fn().mockResolvedValue(0),
}));

const { startScheduler, stopScheduler, morningHealthCheck } = require('../src/utils/scheduler');

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  stopScheduler();
});

describe('Scheduler', () => {
  describe('startScheduler / stopScheduler', () => {
    test('시작 후 정지할 수 있다', () => {
      mockPrisma.artwork.deleteMany.mockResolvedValue({ count: 0 });

      startScheduler();
      stopScheduler();

      // 에러 없이 종료되면 성공
    });

    test('stopScheduler를 여러 번 호출해도 안전하다', () => {
      mockPrisma.artwork.deleteMany.mockResolvedValue({ count: 0 });

      startScheduler();
      stopScheduler();
      stopScheduler();
    });
  });

  describe('morningHealthCheck', () => {
    test('DB와 Storage가 정상이면 ok를 반환한다', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
      mockPrisma.user.count.mockResolvedValue(10);
      mockPrisma.artwork.count
        .mockResolvedValueOnce(50)    // 전체 작품
        .mockResolvedValueOnce(2);     // 고아 작품
      mockPrisma.refreshToken.count.mockResolvedValue(3);

      const result = await morningHealthCheck();

      expect(result.checks.database).toBe('ok');
      expect(result.checks.storage).toBe('ok');
      expect(result.checks.stats.users).toBe(10);
      expect(result.checks.stats.artworks).toBe(50);
      expect(result.checks.stats.orphanArtworks).toBe(2);
      expect(result.checks.stats.expiredTokens).toBe(3);
      expect(result.checks.memory).toBeDefined();
      expect(result.checks.uptimeHours).toBeDefined();
    });

    test('DB 연결 실패 시 database: fail을 반환한다', async () => {
      mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection refused'));
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.artwork.count.mockResolvedValue(0);
      mockPrisma.refreshToken.count.mockResolvedValue(0);

      const result = await morningHealthCheck();

      expect(result.checks.database).toBe('fail');
    });

    test('Storage 연결 실패 시 storage: fail을 반환한다', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);
      mockPrisma.artwork.count.mockResolvedValue(0);
      mockPrisma.refreshToken.count.mockResolvedValue(0);

      const supabase = require('../src/config/supabase');
      supabase.storage.listBuckets.mockResolvedValueOnce({ error: { message: 'unauthorized' } });

      const result = await morningHealthCheck();

      expect(result.checks.storage).toBe('fail');
    });

    test('통계 수집 실패해도 다른 항목은 계속 검사한다', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([]);
      mockPrisma.user.count.mockRejectedValue(new Error('query failed'));
      mockPrisma.artwork.count.mockResolvedValue(0);
      mockPrisma.refreshToken.count.mockResolvedValue(0);

      const result = await morningHealthCheck();

      expect(result.checks.database).toBe('ok');
      expect(result.checks.stats).toBe('fail');
      expect(result.checks.memory).toBeDefined();
    });
  });
});
