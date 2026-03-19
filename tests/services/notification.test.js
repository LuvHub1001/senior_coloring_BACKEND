require('../setup');

const mockPrisma = {
  notification: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

const { getNotifications, readNotification, readAllNotifications, createNotification, createNotificationBatch } = require('../../src/services/notification');

beforeEach(() => {
  jest.resetAllMocks();
});

describe('Notification Service', () => {
  describe('getNotifications', () => {
    test('알림 목록과 읽지 않은 수를 반환한다', async () => {
      const notifications = [
        { id: 'n-1', type: 'like', title: '좋아요', message: '메시지', isRead: false, createdAt: new Date(), targetUserId: 'user-2', targetUser: { nickname: '테스트', avatarUrl: '🐶' } },
      ];
      mockPrisma.notification.findMany.mockResolvedValue(notifications);
      mockPrisma.notification.count.mockResolvedValue(1);

      const result = await getNotifications({ userId: 'user-1', type: null });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].targetUser.nickname).toBe('테스트');
      expect(result.unreadCount).toBe(1);
      // 30일 필터가 적용되었는지 확인
      const whereArg = mockPrisma.notification.findMany.mock.calls[0][0].where;
      expect(whereArg.userId).toBe('user-1');
      expect(whereArg.createdAt).toBeDefined();
      expect(whereArg.createdAt.gte).toBeInstanceOf(Date);
    });

    test('페이지네이션이 적용된다', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await getNotifications({ userId: 'user-1', type: null, page: 2, size: 10 });

      const queryArg = mockPrisma.notification.findMany.mock.calls[0][0];
      expect(queryArg.skip).toBe(10);
      expect(queryArg.take).toBe(10);
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

  describe('readNotification', () => {
    test('읽지 않은 알림을 읽음 처리한다', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({ userId: 'user-1', isRead: false });
      mockPrisma.notification.update.mockResolvedValue({});

      await readNotification({ notificationId: 'n-1', userId: 'user-1' });

      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'n-1' },
        data: { isRead: true },
      });
    });

    test('이미 읽은 알림은 update를 호출하지 않는다', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({ userId: 'user-1', isRead: true });

      await readNotification({ notificationId: 'n-1', userId: 'user-1' });

      expect(mockPrisma.notification.update).not.toHaveBeenCalled();
    });

    test('존재하지 않는 알림이면 404 에러를 던진다', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(null);

      await expect(
        readNotification({ notificationId: 'n-999', userId: 'user-1' }),
      ).rejects.toMatchObject({ status: 404 });
    });

    test('타인의 알림이면 404 에러를 던진다', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({ userId: 'user-2', isRead: false });

      await expect(
        readNotification({ notificationId: 'n-1', userId: 'user-1' }),
      ).rejects.toMatchObject({ status: 404 });
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
        data: { userId: 'user-1', targetUserId: 'user-2', type: 'like', title: '좋아요', message: '테스트 메시지', artworkId: null },
      });
    });

    test('생성 실패 시 에러를 던지지 않는다', async () => {
      mockPrisma.notification.create.mockRejectedValue(new Error('DB error'));

      await expect(
        createNotification({ userId: 'user-1', targetUserId: 'user-2', type: 'like', title: '좋아요', message: '테스트' }),
      ).resolves.toBeUndefined();
    });
  });

  describe('createNotificationBatch', () => {
    test('여러 알림을 한 번에 생성한다', async () => {
      mockPrisma.notification.createMany.mockResolvedValue({ count: 3 });

      const data = [
        { userId: 'u-1', targetUserId: 'author-1', type: 'artwork', title: '새 작품', message: '작품 공개' },
        { userId: 'u-2', targetUserId: 'author-1', type: 'artwork', title: '새 작품', message: '작품 공개' },
        { userId: 'u-3', targetUserId: 'author-1', type: 'artwork', title: '새 작품', message: '작품 공개' },
      ];
      await createNotificationBatch(data);

      expect(mockPrisma.notification.createMany).toHaveBeenCalledWith({ data });
    });

    test('빈 배열이면 DB 호출하지 않는다', async () => {
      await createNotificationBatch([]);
      expect(mockPrisma.notification.createMany).not.toHaveBeenCalled();
    });

    test('실패 시 에러를 던지지 않는다', async () => {
      mockPrisma.notification.createMany.mockRejectedValue(new Error('DB error'));

      await expect(
        createNotificationBatch([{ userId: 'u-1', targetUserId: 'u-2', type: 'like', title: 't', message: 'm' }]),
      ).resolves.toBeUndefined();
    });
  });
});
