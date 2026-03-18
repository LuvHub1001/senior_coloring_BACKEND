require('../setup');

const mockPrisma = require('../helpers/prisma-mock');

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => require('../helpers/prisma-mock')),
}));

jest.mock('../../src/config/passport', () => {
  const passport = require('passport');
  return passport;
});

jest.mock('../../src/config/supabase', () => ({
  storage: { from: jest.fn() },
}));

const request = require('supertest');
const app = require('../../src/app');
const { generateToken } = require('../../src/utils/jwt');

const userId = 'user-1';
const token = generateToken({ id: userId, role: 'USER' });

beforeEach(() => {
  jest.resetAllMocks();
});

describe('Notification Routes', () => {
  const mockNotifications = [
    {
      id: 'n-1',
      type: 'like',
      title: '좋아요',
      message: '꼬마 화가님이 \'등산\' 작품을 좋아했어요',
      isRead: false,
      createdAt: new Date().toISOString(),
      targetUserId: 'user-2',
    },
    {
      id: 'n-2',
      type: 'follow',
      title: '새 관심 작가',
      message: '열정판다님이 나를 관심 작가로 등록했어요',
      isRead: true,
      createdAt: new Date().toISOString(),
      targetUserId: 'user-3',
    },
  ];

  describe('GET /api/notifications', () => {
    test('알림 목록을 조회한다', async () => {
      mockPrisma.notification.findMany.mockResolvedValue(mockNotifications);
      mockPrisma.notification.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toHaveLength(2);
      expect(res.body.data.unreadCount).toBe(1);
      expect(res.body.data.content[0].targetUserId).toBe('user-2');
    });

    test('type 필터로 조회한다', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([mockNotifications[0]]);
      mockPrisma.notification.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/notifications?type=like')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.content).toHaveLength(1);
      expect(res.body.data.content[0].type).toBe('like');
    });

    test('잘못된 type이면 400을 반환한다', async () => {
      const res = await request(app)
        .get('/api/notifications?type=invalid')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });

    test('인증 없이 요청하면 401을 반환한다', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
    });
  });

  describe('PUT /api/notifications/read-all', () => {
    test('모든 알림을 읽음 처리한다', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });

      const res = await request(app)
        .put('/api/notifications/read-all')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
    });

    test('인증 없이 요청하면 401을 반환한다', async () => {
      const res = await request(app).put('/api/notifications/read-all');
      expect(res.status).toBe(401);
    });
  });
});
