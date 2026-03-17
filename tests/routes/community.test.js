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
const jwt = require('jsonwebtoken');
const app = require('../../src/app');

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-jwt-signing-32chars!';
const testToken = jwt.sign({ id: 'user-1', email: 'test@test.com' }, JWT_SECRET, {
  expiresIn: '1h',
});

const mockArtwork = {
  id: 'artwork-1',
  imageUrl: 'https://storage.supabase.co/artworks/test.png',
  likeCount: 5,
  createdAt: new Date('2026-03-10'),
  status: 'COMPLETED',
  isPublic: true,
  design: { id: 1, title: '꽃 도안', imageUrl: 'https://storage.supabase.co/designs/flower.png' },
  user: { id: 'user-10', nickname: '테스트유저' },
  likes: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.$transaction.mockImplementation((args) => {
    if (Array.isArray(args)) return Promise.all(args);
    return args(mockPrisma);
  });
});

describe('Community Routes', () => {
  describe('GET /api/community/artworks', () => {
    it('비로그인으로 커뮤니티 목록을 조회한다', async () => {
      mockPrisma.artwork.findMany.mockResolvedValue([mockArtwork]);
      mockPrisma.artwork.count.mockResolvedValue(1);

      const res = await request(app).get('/api/community/artworks');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toHaveLength(1);
      expect(res.body.data.totalElements).toBeDefined();
    });

    it('로그인 상태로 좋아요 여부를 포함하여 조회한다', async () => {
      mockPrisma.artwork.findMany.mockResolvedValue([
        { ...mockArtwork, likes: [{ id: 'like-1' }] },
      ]);
      mockPrisma.artwork.count.mockResolvedValue(1);

      const res = await request(app)
        .get('/api/community/artworks')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.content[0].isLiked).toBe(true);
    });

    it('잘못된 sort 파라미터를 거부한다', async () => {
      const res = await request(app).get('/api/community/artworks?sort=invalid');

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/community/artworks/popular', () => {
    it('오늘의 인기 작품을 조회한다', async () => {
      mockPrisma.communityLike.groupBy.mockResolvedValue([]);
      mockPrisma.artwork.findMany.mockResolvedValue([mockArtwork]);
      mockPrisma.artwork.count.mockResolvedValue(1);

      const res = await request(app).get('/api/community/artworks/popular');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/community/artworks/:artworkId', () => {
    it('작품 상세를 조회한다', async () => {
      mockPrisma.artwork.findUnique.mockResolvedValue(mockArtwork);

      const res = await request(app).get(
        '/api/community/artworks/550e8400-e29b-41d4-a716-446655440000',
      );

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('꽃 도안');
      expect(res.body.data.author).toEqual({ id: 'user-10', nickname: '테스트유저' });
      expect(res.body.data.design).toBeDefined();
    });

    it('잘못된 UUID를 거부한다', async () => {
      const res = await request(app).get('/api/community/artworks/not-a-uuid');

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/community/artworks/:artworkId/like', () => {
    it('비로그인 시 401을 반환한다', async () => {
      const res = await request(app).post(
        '/api/community/artworks/550e8400-e29b-41d4-a716-446655440000/like',
      );

      expect(res.status).toBe(401);
    });

    it('로그인 상태로 좋아요를 토글한다', async () => {
      mockPrisma.artwork.findUnique.mockResolvedValue({
        id: 'artwork-1', status: 'COMPLETED', isPublic: true,
        likes: [],
      });
      mockPrisma.$transaction.mockResolvedValueOnce([{}, { likeCount: 6 }]);

      const res = await request(app)
        .post('/api/community/artworks/550e8400-e29b-41d4-a716-446655440000/like')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('isLiked');
      expect(res.body.data).toHaveProperty('likeCount');
    });
  });
});
