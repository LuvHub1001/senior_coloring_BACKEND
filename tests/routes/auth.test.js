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

const testUser = { id: 'user-1', email: 'test@example.com' };
const token = generateToken(testUser);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Auth Routes', () => {
  describe('POST /api/auth/refresh', () => {
    test('유효한 refresh token으로 새 토큰 쌍을 발급한다 (쿠키 설정)', async () => {
      const storedToken = {
        id: 'rt-1',
        token: 'valid-refresh-token',
        family: 'fam-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 86400000),
        usedAt: null,
        user: testUser,
      };

      mockPrisma.refreshToken.findUnique.mockResolvedValue(storedToken);
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.refreshToken.create.mockResolvedValue({
        token: 'new-refresh-token',
        expiresAt: new Date(Date.now() + 86400000 * 30),
      });

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'valid-refresh-token' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // httpOnly 쿠키 설정 확인
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieStr = cookies.join('; ');
      expect(cookieStr).toContain('accessToken=');
      expect(cookieStr).toContain('refreshToken=');
      expect(cookieStr).toContain('HttpOnly');
    });

    test('쿠키의 refreshToken으로도 갱신한다', async () => {
      const storedToken = {
        id: 'rt-1',
        token: 'cookie-refresh-token',
        family: 'fam-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 86400000),
        usedAt: null,
        user: testUser,
      };

      mockPrisma.refreshToken.findUnique.mockResolvedValue(storedToken);
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.refreshToken.create.mockResolvedValue({
        token: 'new-refresh-token',
        expiresAt: new Date(Date.now() + 86400000 * 30),
      });

      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', ['refreshToken=cookie-refresh-token']);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test('refreshToken 없이 요청하면 400을 반환한다', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(res.status).toBe(400);
    });

    test('이미 사용된 refresh token이면 401 + 전체 세션 만료', async () => {
      const usedToken = {
        id: 'rt-1',
        token: 'used-token',
        family: 'fam-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 86400000),
        usedAt: new Date(Date.now() - 60000), // 이미 사용됨
        user: testUser,
      };

      mockPrisma.refreshToken.findUnique.mockResolvedValue(usedToken);
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 3 });

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'used-token' });

      expect(res.status).toBe(401);
      // 전체 세션 강제 만료
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    test('존재하지 않는 refresh token이면 401을 반환한다', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'nonexistent-token' });

      expect(res.status).toBe(401);
    });

    test('만료된 refresh token이면 401을 반환한다', async () => {
      const expiredToken = {
        id: 'rt-1',
        token: 'expired-token',
        family: 'fam-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() - 86400000),
        usedAt: null,
        user: testUser,
      };

      mockPrisma.refreshToken.findUnique.mockResolvedValue(expiredToken);
      mockPrisma.refreshToken.delete.mockResolvedValue({});

      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'expired-token' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    test('인증된 유저의 모든 refresh token을 삭제하고 쿠키를 제거한다', async () => {
      mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 2 });

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', [`accessToken=${token}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPrisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });

      // 쿠키 제거 확인 (maxAge=0)
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieStr = cookies.join('; ');
      expect(cookieStr).toContain('accessToken=');
      expect(cookieStr).toContain('refreshToken=');
    });

    test('인증 없이 로그아웃 요청하면 401을 반환한다', async () => {
      const res = await request(app)
        .post('/api/auth/logout');

      expect(res.status).toBe(401);
    });
  });

});
