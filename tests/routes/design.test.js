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
        data: { publicUrl: 'https://storage.supabase.co/designs/test.png' },
      }),
    })),
  },
}));

const request = require('supertest');
const app = require('../../src/app');
const { generateToken } = require('../../src/utils/jwt');

const testUser = { id: 'user-1', email: 'test@example.com' };
const token = generateToken(testUser);

const mockDesign = {
  id: 1,
  title: '꽃 도안',
  category: '자연',
  description: null,
  imageUrl: 'https://storage.supabase.co/designs/test.png',
  createdAt: new Date().toISOString(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Design Routes', () => {
  describe('GET /api/designs', () => {
    test('도안 목록을 반환한다 (인증 불필요)', async () => {
      mockPrisma.design.findMany.mockResolvedValue([mockDesign]);

      const res = await request(app).get('/api/designs');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });

    test('category로 필터링한다', async () => {
      mockPrisma.design.findMany.mockResolvedValue([]);

      const res = await request(app).get('/api/designs?category=동물');

      expect(res.status).toBe(200);
      expect(mockPrisma.design.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { category: '동물' },
        }),
      );
    });
  });

  describe('GET /api/designs/:id', () => {
    test('도안 상세를 반환한다', async () => {
      mockPrisma.design.findUnique.mockResolvedValue(mockDesign);

      const res = await request(app).get('/api/designs/1');

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('꽃 도안');
    });

    test('존재하지 않는 도안은 404를 반환한다', async () => {
      mockPrisma.design.findUnique.mockResolvedValue(null);

      const res = await request(app).get('/api/designs/999');

      expect(res.status).toBe(404);
    });

    test('숫자가 아닌 id는 400을 반환한다', async () => {
      const res = await request(app).get('/api/designs/abc');

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/designs', () => {
    test('인증 없이 요청하면 401을 반환한다', async () => {
      const res = await request(app)
        .post('/api/designs')
        .field('title', '테스트')
        .field('category', '자연');

      expect(res.status).toBe(401);
    });

    test('이미지 파일 없이 요청하면 400을 반환한다', async () => {
      const res = await request(app)
        .post('/api/designs')
        .set('Authorization', `Bearer ${token}`)
        .field('title', '테스트')
        .field('category', '자연');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('이미지');
    });

    test('title 없이 요청하면 400을 반환한다', async () => {
      const res = await request(app)
        .post('/api/designs')
        .set('Authorization', `Bearer ${token}`)
        .attach('image', Buffer.from('fake-png'), { filename: 'test.png', contentType: 'image/png' })
        .field('category', '자연');

      expect(res.status).toBe(400);
    });

    test('유효한 요청으로 도안을 생성한다', async () => {
      mockPrisma.design.create.mockResolvedValue(mockDesign);

      const res = await request(app)
        .post('/api/designs')
        .set('Authorization', `Bearer ${token}`)
        .attach('image', Buffer.from('fake-png'), { filename: 'test.png', contentType: 'image/png' })
        .field('title', '꽃 도안')
        .field('category', '자연');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });
});
