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
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn().mockResolvedValue({ error: null }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: 'https://storage.supabase.co/themes/test.png' },
      }),
      remove: jest.fn().mockResolvedValue({}),
    })),
  },
}));

const request = require('supertest');
const app = require('../../src/app');
const { generateToken } = require('../../src/utils/jwt');

const testUser = { id: 'user-1', email: 'test@example.com' };
const token = generateToken(testUser);

const mockThemes = [
  { id: 1, name: '기본', requiredArtworks: 0, imageUrl: null, buttonColor: '#000', buttonTextColor: '#fff', textColor: '#333', sortOrder: 0 },
  { id: 2, name: '바다', requiredArtworks: 3, imageUrl: null, buttonColor: '#00f', buttonTextColor: '#fff', textColor: '#006', sortOrder: 1 },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Theme Routes', () => {
  describe('GET /api/themes', () => {
    test('테마 목록을 해금/선택 여부와 함께 반환한다', async () => {
      mockPrisma.theme.findMany.mockResolvedValue(mockThemes);
      mockPrisma.user.findUnique.mockResolvedValue({ selectedThemeId: 1, totalCompletedCount: 1 });

      const res = await request(app)
        .get('/api/themes')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].unlocked).toBe(true);
      expect(res.body.data[0].selected).toBe(true);
      expect(res.body.data[1].unlocked).toBe(false);
    });

    test('인증 없이 요청하면 401을 반환한다', async () => {
      const res = await request(app).get('/api/themes');

      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/themes/select', () => {
    test('해금된 테마를 선택한다', async () => {
      mockPrisma.theme.findUnique.mockResolvedValue(mockThemes[0]);
      mockPrisma.user.findUnique.mockResolvedValue({ totalCompletedCount: 5 });
      mockPrisma.user.update.mockResolvedValue({ id: 'user-1', selectedThemeId: 1 });

      const res = await request(app)
        .patch('/api/themes/select')
        .set('Authorization', `Bearer ${token}`)
        .send({ themeId: 1 });

      expect(res.status).toBe(200);
      expect(res.body.data.selectedThemeId).toBe(1);
    });

    test('themeId 없이 요청하면 400을 반환한다', async () => {
      const res = await request(app)
        .patch('/api/themes/select')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
    });

    test('미해금 테마 선택 시 403을 반환한다', async () => {
      mockPrisma.theme.findUnique.mockResolvedValue(mockThemes[1]);
      mockPrisma.user.findUnique.mockResolvedValue({ totalCompletedCount: 1 });

      const res = await request(app)
        .patch('/api/themes/select')
        .set('Authorization', `Bearer ${token}`)
        .send({ themeId: 2 });

      expect(res.status).toBe(403);
    });

    test('존재하지 않는 테마 선택 시 404를 반환한다', async () => {
      mockPrisma.theme.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .patch('/api/themes/select')
        .set('Authorization', `Bearer ${token}`)
        .send({ themeId: 999 });

      expect(res.status).toBe(404);
    });
  });
});
