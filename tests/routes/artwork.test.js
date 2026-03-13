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
        data: { publicUrl: 'https://storage.supabase.co/artworks/test.png' },
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

const mockDesign = { id: 1, title: '꽃', category: '자연', imageUrl: 'https://example.com/d.png' };
const mockArtwork = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  userId: 'user-1',
  designId: 1,
  status: 'IN_PROGRESS',
  progress: 0,
  imageUrl: null,
  design: mockDesign,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Artwork Routes', () => {
  describe('POST /api/artworks', () => {
    test('인증 없이 요청하면 401을 반환한다', async () => {
      const res = await request(app)
        .post('/api/artworks')
        .send({ designId: 1 });

      expect(res.status).toBe(401);
    });

    test('유효한 요청으로 작품을 생성한다', async () => {
      mockPrisma.design.findUnique.mockResolvedValue(mockDesign);
      mockPrisma.artwork.findFirst.mockResolvedValue(null);
      mockPrisma.artwork.create.mockResolvedValue(mockArtwork);

      const res = await request(app)
        .post('/api/artworks')
        .set('Authorization', `Bearer ${token}`)
        .send({ designId: 1 });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.designId).toBe(1);
    });

    test('designId 없이 요청하면 400을 반환한다', async () => {
      const res = await request(app)
        .post('/api/artworks')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('designId가 음수이면 400을 반환한다', async () => {
      const res = await request(app)
        .post('/api/artworks')
        .set('Authorization', `Bearer ${token}`)
        .send({ designId: -1 });

      expect(res.status).toBe(400);
    });

    test('designId가 문자열이면 400을 반환한다', async () => {
      const res = await request(app)
        .post('/api/artworks')
        .set('Authorization', `Bearer ${token}`)
        .send({ designId: 'abc' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/artworks', () => {
    test('작품 목록을 반환한다', async () => {
      mockPrisma.artwork.findMany.mockResolvedValue([mockArtwork]);

      const res = await request(app)
        .get('/api/artworks')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    test('status 필터로 조회한다', async () => {
      mockPrisma.artwork.findMany.mockResolvedValue([]);

      const res = await request(app)
        .get('/api/artworks?status=COMPLETED')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });

    test('잘못된 status 값은 400을 반환한다', async () => {
      const res = await request(app)
        .get('/api/artworks?status=INVALID')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/artworks/:id', () => {
    test('본인 작품 상세를 반환한다', async () => {
      mockPrisma.artwork.findUnique.mockResolvedValue(mockArtwork);

      const res = await request(app)
        .get('/api/artworks/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    test('존재하지 않는 작품은 404를 반환한다', async () => {
      mockPrisma.artwork.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/artworks/660e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    test('타인의 작품은 403을 반환한다', async () => {
      mockPrisma.artwork.findUnique.mockResolvedValue({
        ...mockArtwork,
        userId: 'other-user',
      });

      const res = await request(app)
        .get('/api/artworks/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/artworks/:id/complete', () => {
    test('작품을 완성 처리한다', async () => {
      mockPrisma.artwork.findUnique.mockResolvedValue(mockArtwork);
      mockPrisma.user.findUnique.mockResolvedValue({ totalCompletedCount: 2 });
      mockPrisma.artwork.update.mockResolvedValue({
        ...mockArtwork,
        status: 'COMPLETED',
        progress: 100,
      });
      mockPrisma.user.update.mockResolvedValue({ totalCompletedCount: 3 });
      mockPrisma.theme.findFirst.mockResolvedValue(null);

      const res = await request(app)
        .patch('/api/artworks/550e8400-e29b-41d4-a716-446655440000/complete')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('COMPLETED');
    });
  });

  describe('PATCH /api/artworks/:id/feature', () => {
    test('완성된 작품을 대표 작품으로 설정한다', async () => {
      mockPrisma.artwork.findUnique.mockResolvedValue({
        ...mockArtwork,
        status: 'COMPLETED',
      });
      mockPrisma.user.update.mockResolvedValue({});

      const res = await request(app)
        .patch('/api/artworks/550e8400-e29b-41d4-a716-446655440000/feature')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.featuredArtworkId).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    test('미완성 작품은 대표 작품으로 설정할 수 없다', async () => {
      mockPrisma.artwork.findUnique.mockResolvedValue(mockArtwork);

      const res = await request(app)
        .patch('/api/artworks/550e8400-e29b-41d4-a716-446655440000/feature')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/artworks/:id', () => {
    test('본인 작품을 삭제한다', async () => {
      mockPrisma.artwork.findUnique.mockResolvedValue(mockArtwork);
      mockPrisma.artwork.delete.mockResolvedValue(mockArtwork);

      const res = await request(app)
        .delete('/api/artworks/550e8400-e29b-41d4-a716-446655440000')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeNull();
    });
  });
});
