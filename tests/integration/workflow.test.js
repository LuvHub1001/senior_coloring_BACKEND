require('../setup');

const mockPrisma = require('../helpers/prisma-mock');
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => require('../helpers/prisma-mock')),
}));

jest.mock('../../src/config/prisma', () => require('../helpers/prisma-mock'));

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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('통합 워크플로우: 도안 → 작품 생성 → 완성 → 테마 해금', () => {
  const mockDesign = {
    id: 1, title: '꽃', category: '자연',
    imageUrl: 'https://storage.supabase.co/designs/flower.png',
  };

  test('전체 워크플로우가 정상 동작한다', async () => {
    // 1. 도안 목록 조회
    mockPrisma.design.findMany.mockResolvedValue([mockDesign]);

    const designsRes = await request(app)
      .get('/api/designs')
      .expect(200);

    expect(designsRes.body.data).toHaveLength(1);
    const designId = designsRes.body.data[0].id;

    // 2. 작품 생성
    const newArtwork = {
      id: '550e8400-e29b-41d4-a716-446655440000', userId: 'user-1', designId, status: 'IN_PROGRESS',
      progress: 0, imageUrl: null, design: mockDesign,
    };
    mockPrisma.design.findUnique.mockResolvedValue(mockDesign);
    mockPrisma.artwork.findFirst.mockResolvedValue(null);
    mockPrisma.artwork.create.mockResolvedValue(newArtwork);

    const createRes = await request(app).post('/api/artworks')
      .set('Authorization', `Bearer ${token}`)
      .send({ designId })
      .expect(201);

    expect(createRes.body.data.status).toBe('IN_PROGRESS');

    // 3. 작품 완성
    const completedArtwork = { ...newArtwork, status: 'COMPLETED', progress: 100 };
    const unlockedTheme = { id: 2, name: '바다', imageUrl: null };

    mockPrisma.artwork.findUnique.mockResolvedValue(newArtwork);
    mockPrisma.user.findUnique.mockResolvedValue({ totalCompletedCount: 0 });
    mockPrisma.artwork.update.mockResolvedValue(completedArtwork);
    mockPrisma.user.update
      .mockResolvedValueOnce({ totalCompletedCount: 1 })
      .mockResolvedValueOnce({});
    mockPrisma.theme.findFirst.mockResolvedValue(unlockedTheme);

    const completeRes = await request(app)
      .patch('/api/artworks/550e8400-e29b-41d4-a716-446655440000/complete')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(completeRes.body.data.status).toBe('COMPLETED');
    expect(completeRes.body.data.unlockedTheme).toEqual(unlockedTheme);

    // 4. 대표 작품 설정
    mockPrisma.artwork.findUnique.mockResolvedValue(completedArtwork);
    mockPrisma.user.update.mockResolvedValue({});

    const featureRes = await request(app)
      .patch('/api/artworks/550e8400-e29b-41d4-a716-446655440000/feature')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(featureRes.body.data.featuredArtworkId).toBe('550e8400-e29b-41d4-a716-446655440000');

    // 5. 해금된 테마 선택
    const themes = [
      { id: 1, name: '기본', requiredArtworks: 0, sortOrder: 0, imageUrl: null, textColor: '#333' },
      { id: 2, name: '바다', requiredArtworks: 1, sortOrder: 1, imageUrl: null, textColor: '#006' },
    ];
    mockPrisma.theme.findUnique.mockResolvedValue(themes[1]);
    mockPrisma.user.findUnique.mockResolvedValue({ totalCompletedCount: 1 });
    mockPrisma.user.update.mockResolvedValue({ id: 'user-1', selectedThemeId: 2 });

    const themeRes = await request(app).patch('/api/themes/select')
      .set('Authorization', `Bearer ${token}`)
      .send({ themeId: 2 })
      .expect(200);

    expect(themeRes.body.data.selectedThemeId).toBe(2);
  });
});

describe('통합 워크플로우: 인증 흐름', () => {
  test('토큰 갱신 → 로그아웃 플로우', async () => {
    // 1. Refresh Token으로 새 토큰 발급
    const storedToken = {
      id: 'rt-1', token: 'valid-refresh', family: 'fam-1',
      userId: 'user-1', expiresAt: new Date(Date.now() + 86400000),
      usedAt: null, user: testUser,
    };

    mockPrisma.refreshToken.findUnique.mockResolvedValue(storedToken);
    mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.refreshToken.create.mockResolvedValue({
      token: 'new-refresh', expiresAt: new Date(Date.now() + 86400000 * 30),
    });

    const refreshRes = await request(app).post('/api/auth/refresh')
      .send({ refreshToken: 'valid-refresh' })
      .expect(200);

    // 쿠키에 토큰이 설정됨
    const cookies = refreshRes.headers['set-cookie'];
    expect(cookies).toBeDefined();

    // 2. 새 Access Token으로 API 호출 (쿠키에서 추출)
    const accessTokenCookie = cookies.find(c => c.startsWith('token='));
    const accessTokenValue = accessTokenCookie.split(';')[0].split('=')[1];

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1', nickname: '테스터', email: 'test@example.com',
      avatarUrl: null, selectedThemeId: null, selectedTheme: null,
      featuredArtworkId: null, featuredArtwork: null, createdAt: new Date().toISOString(),
    });

    await request(app)
      .get('/api/users/me')
      .set('Cookie', [`token=${accessTokenValue}`])
      .expect(200);

    // 3. 로그아웃
    mockPrisma.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

    await request(app)
      .post('/api/auth/logout')
      .set('Cookie', [`token=${accessTokenValue}`])
      .expect(200);
  });
});

describe('통합: 권한 검증', () => {
  test('타인의 작품에 대한 모든 조작이 403으로 차단된다', async () => {
    const otherUserArtwork = {
      id: '660e8400-e29b-41d4-a716-446655440000', userId: 'other-user', designId: 1,
      status: 'IN_PROGRESS', progress: 50, imageUrl: null,
      design: { id: 1, title: '꽃', category: '자연' },
    };

    mockPrisma.artwork.findUnique.mockResolvedValue(otherUserArtwork);

    // 조회
    await request(app)
      .get('/api/artworks/660e8400-e29b-41d4-a716-446655440000')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    // 완성
    await request(app)
      .patch('/api/artworks/660e8400-e29b-41d4-a716-446655440000/complete')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    // 대표 설정
    await request(app)
      .patch('/api/artworks/660e8400-e29b-41d4-a716-446655440000/feature')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    // 삭제
    await request(app)
      .delete('/api/artworks/660e8400-e29b-41d4-a716-446655440000')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
  });
});

describe('통합 워크플로우: 신고 → 관리자 처리', () => {
  const reporterToken = generateToken({ id: 'reporter-1', email: 'reporter@test.com', role: 'USER' });
  const adminToken = generateToken({ id: 'admin-1', email: 'admin@test.com', role: 'ADMIN' });

  test('작품 신고 → 관리자 목록 조회 → 처리(RESOLVED)', async () => {
    // 1. 신고 접수
    mockPrisma.artwork.findUnique.mockResolvedValue({
      id: 'artwork-1', userId: 'owner-1', status: 'COMPLETED', isPublic: true,
    });
    mockPrisma.artworkReport.create.mockResolvedValue({ id: 'report-1' });

    const reportRes = await request(app)
      .post('/api/community/artworks/550e8400-e29b-41d4-a716-446655440000/report')
      .set('Authorization', `Bearer ${reporterToken}`)
      .send({ reason: '부적절한 내용이에요' });

    expect(reportRes.status).toBe(200);

    // 2. 관리자 신고 목록 조회
    mockPrisma.user.findUnique.mockResolvedValue({ role: 'ADMIN' });
    mockPrisma.artworkReport.findMany.mockResolvedValue([{
      id: 'report-1', reason: '부적절한 내용이에요', status: 'PENDING',
      createdAt: new Date(),
      artwork: {
        id: 'artwork-1', title: '신고된작품', imageUrl: 'https://example.com/img.png',
        user: { nickname: '작성자' }, design: { title: '도안' },
      },
      reporter: { nickname: '신고자' },
    }]);
    mockPrisma.artworkReport.count.mockResolvedValue(1);

    const listRes = await request(app)
      .get('/api/admin/reports?status=PENDING')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0].status).toBe('PENDING');

    // 3. 관리자가 RESOLVED 처리
    mockPrisma.artworkReport.findUnique.mockResolvedValue({
      id: 'report-1', status: 'PENDING', artworkId: 'artwork-1',
    });
    mockPrisma.$transaction.mockImplementation((args) => {
      if (Array.isArray(args)) return Promise.all(args);
      return args(mockPrisma);
    });
    mockPrisma.artworkReport.update.mockResolvedValue({});
    mockPrisma.artwork.update.mockResolvedValue({});

    const resolveRes = await request(app)
      .put('/api/admin/reports/550e8400-e29b-41d4-a716-446655440000')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'RESOLVED' });

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.success).toBe(true);
  });
});
