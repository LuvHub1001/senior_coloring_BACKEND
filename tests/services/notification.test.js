require('../setup');

const mockPrisma = {
  notification: {
    findMany: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

const { getNotifications, readAllNotifications, createNotification } = require('../../src/services/notification');

beforeEach(() => {
  jest.resetAllMocks();
});

describe('Notification Service', () => {
  describe('getNotifications', () => {
    test('알림 목록과 읽지 않은 수를 반환한다', async () => {
      const notifications = [
        { id: 'n-1', type: 'like', title: '좋아요', message: '메시지', isRead: false, createdAt: new Date(), targetUserId: 'user-2' },
      ];
      mockPrisma.notification.findMany.mockResolvedValue(notifications);
      mockPrisma.notification.count.mockResolvedValue(1);

      const result = await getNotifications({ userId: 'user-1', type: null });

      expect(result.content).toHaveLength(1);
      expect(result.unreadCount).toBe(1);
      // 30일 필터가 적용되었는지 확인
      const whereArg = mockPrisma.notification.findMany.mock.calls[0][0].where;
      expect(whereArg.userId).toBe('user-1');
      expect(whereArg.createdAt).toBeDefined();
      expect(whereArg.createdAt.gte).toBeInstanceOf(Date);
    });

    test('type 필터를 적용한다', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await getNotifications({ userId: 'user-1', type: 'follow' });

      const whereArg = mockPrisma.notification.findMany.mock.calls[0][0].where;
      expect(whereArg.type).toBe('follow');
    });

    test('type이 null이면 전체 조회한다', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await getNotifications({ userId: 'user-1', type: null });

      const whereArg = mockPrisma.notification.findMany.mock.calls[0][0].where;
      expect(whereArg.type).toBeUndefined();
    });

    test('unreadCount는 type 필터와 무관하게 전체 읽지 않은 수를 반환한다', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(5);

      const result = await getNotifications({ userId: 'user-1', type: 'like' });

      expect(result.unreadCount).toBe(5);
      // count 쿼리에는 type 필터 없이 userId + isRead만
      const countWhere = mockPrisma.notification.count.mock.calls[0][0].where;
      expect(countWhere.type).toBeUndefined();
      expect(countWhere.isRead).toBe(false);
    });
  });

  describe('readAllNotifications', () => {
    test('읽지 않은 알림을 모두 읽음 처리한다', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 2 });

      await readAllNotifications({ userId: 'user-1' });

      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
        data: { isRead: true },
      });
    });
  });

  describe('createNotification', () => {
    test('알림을 생성한다 (targetUserId 포함)', async () => {
      mockPrisma.notification.create.mockResolvedValue({ id: 'n-1' });

      await createNotification({
        userId: 'user-1',
        targetUserId: 'user-2',
        type: 'like',
        title: '좋아요',
        message: '테스트 메시지',
      });

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', targetUserId: 'user-2', type: 'like', title: '좋아요', message: '테스트 메시지' },
      });
    });

    test('생성 실패 시 에러를 던지지 않는다', async () => {
      mockPrisma.notification.create.mockRejectedValue(new Error('DB error'));

      await expect(
        createNotification({ userId: 'user-1', targetUserId: 'user-2', type: 'like', title: '좋아요', message: '테스트' }),
      ).resolves.toBeUndefined();
    });
  });
});
