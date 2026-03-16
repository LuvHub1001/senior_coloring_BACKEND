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
  selectedTheme: { id: 1, name: '기본', toggleType: 'LIGHT' },
  featuredArtworkId: null,
  featuredArtwork: null,
  createdAt: new Date().toISOString(),
};

const mockThemes = [
  { id: 1, name: '기본', requiredArtworks: 0, imageUrl: null, buttonColor: null, buttonTextColor: null, textColor: null, toggleType: 'LIGHT', sortOrder: 0 },
];

const mockArtworks = [
  {
    id: 'art-1',
    imageUrl: 'https://example.com/art.png',
    progress: 100,
    status: 'COMPLETED',
    isPublic: true,
    likeCount: 5,
    rootArtworkId: null,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    design: { id: 'design-1', title: '꽃', imageUrl: 'https://example.com/design.png', category: 'NATURE' },
  },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Home Routes', () => {
  describe('GET /api/home', () => {
    test('홈 통합 데이터를 반환한다', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockUserProfile) // getUserProfile
        .mockResolvedValueOnce({ selectedThemeId: 1, totalCompletedCount: 3 }); // getThemes
      mockPrisma.artwork.findMany.mockResolvedValue(mockArtworks);
      mockPrisma.theme.findMany.mockResolvedValue(mockThemes);

      const res = await request(app)
        .get('/api/home')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('user');
      expect(res.body.data).toHaveProperty('completedArtworks');
      expect(res.body.data).toHaveProperty('themes');
      expect(res.body.data.user.id).toBe('user-1');
      expect(Array.isArray(res.body.data.completedArtworks)).toBe(true);
      expect(Array.isArray(res.body.data.themes)).toBe(true);
    });

    test('인증 없이 요청하면 401을 반환한다', async () => {
      const res = await request(app).get('/api/home');

      expect(res.status).toBe(401);
    });

    test('존재하지 않는 유저이면 404를 반환한다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.artwork.findMany.mockResolvedValue([]);
      mockPrisma.theme.findMany.mockResolvedValue(mockThemes);

      const res = await request(app)
        .get('/api/home')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });
  });
});
