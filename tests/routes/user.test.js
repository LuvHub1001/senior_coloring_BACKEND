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

const mockUserProfile = {
  id: 'user-1',
  nickname: '테스터',
  avatarUrl: null,
  email: 'test@example.com',
  selectedThemeId: 1,
  selectedTheme: { id: 1, name: '기본' },
  featuredArtworkId: null,
  createdAt: new Date().toISOString(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('User Routes', () => {
  describe('GET /api/users/me', () => {
    test('인증된 유저의 프로필을 반환한다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserProfile);

      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('user-1');
      expect(res.body.data.nickname).toBe('테스터');
    });

    test('인증 없이 요청하면 401을 반환한다', async () => {
      const res = await request(app).get('/api/users/me');

      expect(res.status).toBe(401);
    });

    test('잘못된 토큰이면 401을 반환한다', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });

    test('존재하지 않는 유저이면 404를 반환한다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/users/me/nickname', () => {
    test('닉네임을 변경하고 전체 프로필을 반환한다', async () => {
      mockPrisma.user.update.mockResolvedValue({ id: 'user-1' });
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUserProfile,
        nickname: '새닉네임',
      });

      const res = await request(app)
        .patch('/api/users/me/nickname')
        .set('Authorization', `Bearer ${token}`)
        .send({ nickname: '새닉네임' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.nickname).toBe('새닉네임');
      expect(res.body.data.email).toBeDefined();
      expect(res.body.data.selectedThemeId).toBeDefined();
    });

    test('인증 없이 요청하면 401을 반환한다', async () => {
      const res = await request(app)
        .patch('/api/users/me/nickname')
        .send({ nickname: '새닉네임' });

      expect(res.status).toBe(401);
    });

    test('빈 닉네임이면 400을 반환한다', async () => {
      const res = await request(app)
        .patch('/api/users/me/nickname')
        .set('Authorization', `Bearer ${token}`)
        .send({ nickname: '' });

      expect(res.status).toBe(400);
    });

    test('16자 초과 닉네임이면 400을 반환한다', async () => {
      const res = await request(app)
        .patch('/api/users/me/nickname')
        .set('Authorization', `Bearer ${token}`)
        .send({ nickname: '가나다라마바사아자차카타파하히후헤' });

      expect(res.status).toBe(400);
    });

    test('닉네임 없이 요청하면 400을 반환한다', async () => {
      const res = await request(app)
        .patch('/api/users/me/nickname')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });
});
