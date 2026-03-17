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
      remove: jest.fn().mockResolvedValue({ error: null }),
    })),
  },
}));

const request = require('supertest');
const app = require('../../src/app');
const { generateToken } = require('../../src/utils/jwt');

const adminUser = { id: 'admin-1', email: 'admin@example.com', role: 'ADMIN' };
const normalUser = { id: 'user-1', email: 'user@example.com', role: 'USER' };
const adminToken = generateToken(adminUser);
const userToken = generateToken(normalUser);

// 실제 PNG 매직 바이트를 포함한 최소 유효 PNG 버퍼 (매직 바이트 검증 통과용)
const VALID_PNG_BUFFER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG 시그니처
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR 청크
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 픽셀
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
  0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41,
  0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
  0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc,
  0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
  0x44, 0xae, 0x42, 0x60, 0x82,                    // IEND 청크
]);

beforeEach(() => {
  jest.clearAllMocks();
  // requireAdmin이 DB에서 role을 실시간 확인하므로 기본 응답 설정
  mockPrisma.user.findUnique.mockImplementation(({ where }) => {
    if (where.id === adminUser.id) return Promise.resolve({ role: 'ADMIN' });
    if (where.id === normalUser.id) return Promise.resolve({ role: 'USER' });
    return Promise.resolve(null);
  });
});

describe('Admin Routes - 권한 검증', () => {
  test('인증 없이 요청하면 401을 반환한다', async () => {
    const res = await request(app).get('/api/admin/stats');
    expect(res.status).toBe(401);
  });

  test('일반 유저가 요청하면 403을 반환한다', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toContain('관리자');
  });
});

describe('GET /api/admin/stats', () => {
  test('관리자가 대시보드 통계를 조회한다', async () => {
    mockPrisma.user.count.mockResolvedValue(150);
    mockPrisma.design.count.mockResolvedValue(45);
    mockPrisma.theme.count.mockResolvedValue(8);
    mockPrisma.artwork.count.mockResolvedValue(320);

    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({
      totalUsers: 150,
      totalDesigns: 45,
      totalThemes: 8,
      totalArtworks: 320,
    });
  });
});

describe('Admin Designs', () => {
  const mockDesign = {
    id: 1,
    title: '꽃 도안',
    category: '자연',
    imageUrl: 'https://storage.supabase.co/designs/test.png',
    originalImageUrl: null,
    description: null,
    createdAt: new Date().toISOString(),
  };

  test('GET /api/admin/designs - 도안 목록을 페이지네이션으로 조회한다', async () => {
    mockPrisma.design.findMany.mockResolvedValue([mockDesign]);
    mockPrisma.design.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/admin/designs?page=1&pageSize=20')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.totalCount).toBe(1);
    expect(res.body.page).toBe(1);
    expect(res.body.pageSize).toBe(20);
  });

  test('GET /api/admin/designs - 검색어로 필터링한다', async () => {
    mockPrisma.design.findMany.mockResolvedValue([]);
    mockPrisma.design.count.mockResolvedValue(0);

    const res = await request(app)
      .get('/api/admin/designs?search=꽃')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(mockPrisma.design.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { title: { contains: '꽃', mode: 'insensitive' } },
            { category: { contains: '꽃', mode: 'insensitive' } },
          ],
        },
      }),
    );
  });

  test('POST /api/admin/designs - 도안을 생성한다', async () => {
    mockPrisma.design.create.mockResolvedValue(mockDesign);

    const res = await request(app)
      .post('/api/admin/designs')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('image', VALID_PNG_BUFFER, { filename: 'test.png', contentType: 'image/png' })
      .field('title', '꽃 도안')
      .field('category', '자연');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/admin/designs - 이미지 없이 요청하면 400을 반환한다', async () => {
    const res = await request(app)
      .post('/api/admin/designs')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('title', '꽃 도안')
      .field('category', '자연');

    expect(res.status).toBe(400);
  });

  test('PATCH /api/admin/designs/:id - 도안 제목과 카테고리를 수정한다', async () => {
    const updatedDesign = {
      ...mockDesign,
      title: '수정된 제목',
      category: '동물',
    };
    mockPrisma.design.findUnique.mockResolvedValue(mockDesign);
    mockPrisma.design.update.mockResolvedValue(updatedDesign);

    const res = await request(app)
      .patch('/api/admin/designs/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('title', '수정된 제목')
      .field('category', '동물');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('수정된 제목');
    expect(res.body.data.category).toBe('동물');
  });

  test('PATCH /api/admin/designs/:id - 이미지를 교체한다', async () => {
    const updatedDesign = {
      ...mockDesign,
      imageUrl: 'https://storage.supabase.co/designs/new.png',
    };
    mockPrisma.design.findUnique.mockResolvedValue(mockDesign);
    mockPrisma.design.update.mockResolvedValue(updatedDesign);

    const res = await request(app)
      .patch('/api/admin/designs/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('image', VALID_PNG_BUFFER, { filename: 'new.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('PATCH /api/admin/designs/:id - 존재하지 않는 도안이면 404를 반환한다', async () => {
    mockPrisma.design.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/admin/designs/999')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('title', '수정');

    expect(res.status).toBe(404);
  });

  test('DELETE /api/admin/designs/:id - 도안을 삭제한다', async () => {
    mockPrisma.design.findUnique.mockResolvedValue(mockDesign);
    mockPrisma.artwork.count.mockResolvedValue(0);
    mockPrisma.design.delete.mockResolvedValue(mockDesign);

    const res = await request(app)
      .delete('/api/admin/designs/1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('DELETE /api/admin/designs/:id - 연결된 작품이 있으면 409를 반환한다', async () => {
    mockPrisma.design.findUnique.mockResolvedValue(mockDesign);
    mockPrisma.artwork.count.mockResolvedValue(5);

    const res = await request(app)
      .delete('/api/admin/designs/1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
  });
});

describe('Admin Themes', () => {
  const mockTheme = {
    id: 1,
    name: '봄 테마',
    requiredArtworks: 3,
    imageUrl: 'https://storage.supabase.co/themes/bg.png',
    textColor: '#333333',
    toggleType: 'LIGHT',
    sortOrder: 0,
    createdAt: new Date().toISOString(),
  };

  test('GET /api/admin/themes - 테마 목록을 페이지네이션으로 조회한다', async () => {
    mockPrisma.theme.findMany.mockResolvedValue([mockTheme]);
    mockPrisma.theme.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/admin/themes?page=1&pageSize=20')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.totalCount).toBe(1);
  });

  test('POST /api/admin/themes - 테마를 생성한다', async () => {
    mockPrisma.theme.findUnique.mockResolvedValue(null);
    mockPrisma.theme.create.mockResolvedValue(mockTheme);

    const res = await request(app)
      .post('/api/admin/themes')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('image', VALID_PNG_BUFFER, { filename: 'bg.png', contentType: 'image/png' })
      .field('name', '봄 테마')
      .field('requiredArtworks', '3')
      .field('toggleType', 'LIGHT');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/admin/themes - 중복 이름이면 409를 반환한다', async () => {
    mockPrisma.theme.findUnique.mockResolvedValue(mockTheme);

    const res = await request(app)
      .post('/api/admin/themes')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('name', '봄 테마')
      .field('toggleType', 'LIGHT');

    expect(res.status).toBe(409);
  });

  test('PATCH /api/admin/themes/:id - 테마를 수정한다', async () => {
    const updatedTheme = { ...mockTheme, name: '여름 테마', toggleType: 'DARK' };
    mockPrisma.theme.findUnique
      .mockResolvedValueOnce(mockTheme)   // 존재 확인
      .mockResolvedValueOnce(null);       // 이름 중복 검사
    mockPrisma.theme.update.mockResolvedValue(updatedTheme);

    const res = await request(app)
      .patch('/api/admin/themes/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('name', '여름 테마')
      .field('toggleType', 'DARK');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('여름 테마');
    expect(res.body.data.toggleType).toBe('DARK');
  });

  test('PATCH /api/admin/themes/:id - 이미지를 교체한다', async () => {
    const updatedTheme = { ...mockTheme, imageUrl: 'https://storage.supabase.co/themes/new-bg.png' };
    mockPrisma.theme.findUnique.mockResolvedValue(mockTheme);
    mockPrisma.theme.update.mockResolvedValue(updatedTheme);

    const res = await request(app)
      .patch('/api/admin/themes/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('image', VALID_PNG_BUFFER, { filename: 'new-bg.png', contentType: 'image/png' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('PATCH /api/admin/themes/:id - 존재하지 않는 테마이면 404를 반환한다', async () => {
    mockPrisma.theme.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/admin/themes/999')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('name', '수정');

    expect(res.status).toBe(404);
  });

  test('PATCH /api/admin/themes/:id - 중복 이름으로 수정하면 409를 반환한다', async () => {
    const otherTheme = { ...mockTheme, id: 2, name: '겨울 테마' };
    mockPrisma.theme.findUnique
      .mockResolvedValueOnce(mockTheme)   // 존재 확인
      .mockResolvedValueOnce(otherTheme); // 이름 중복 발견

    const res = await request(app)
      .patch('/api/admin/themes/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('name', '겨울 테마');

    expect(res.status).toBe(409);
  });

  test('DELETE /api/admin/themes/:id - 테마를 삭제한다', async () => {
    mockPrisma.theme.findUnique.mockResolvedValue(mockTheme);
    mockPrisma.user.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.theme.delete.mockResolvedValue(mockTheme);

    const res = await request(app)
      .delete('/api/admin/themes/1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Admin Users', () => {
  test('GET /api/admin/users - 회원 목록을 조회한다', async () => {
    const mockUsers = [
      {
        id: 'user-1',
        nickname: '테스터',
        email: 'test@example.com',
        avatarUrl: null,
        createdAt: new Date().toISOString(),
        _count: { artworks: 5 },
      },
    ];
    mockPrisma.user.findMany.mockResolvedValue(mockUsers);
    mockPrisma.user.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/admin/users?page=1&pageSize=20')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data[0].artworkCount).toBe(5);
    expect(res.body.totalCount).toBe(1);
  });
});

describe('Admin Artworks', () => {
  const mockArtwork = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    userId: 'user-1',
    imageUrl: 'https://storage.supabase.co/artworks/test.png',
    status: 'COMPLETED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    user: { nickname: '테스터' },
    design: { title: '꽃 도안' },
  };

  test('GET /api/admin/artworks - 작품 목록을 조회한다', async () => {
    mockPrisma.artwork.findMany.mockResolvedValue([mockArtwork]);
    mockPrisma.artwork.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/admin/artworks?page=1&pageSize=20')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data[0].nickname).toBe('테스터');
    expect(res.body.data[0].designTitle).toBe('꽃 도안');
    expect(res.body.totalCount).toBe(1);
  });

  test('DELETE /api/admin/artworks/:id - 작품을 삭제한다', async () => {
    mockPrisma.artwork.findUnique.mockResolvedValue(mockArtwork);
    mockPrisma.user.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.exhibition.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.communityLike.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.artwork.delete.mockResolvedValue(mockArtwork);

    const res = await request(app)
      .delete(`/api/admin/artworks/${mockArtwork.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeNull();
  });

  test('DELETE /api/admin/artworks/:id - 존재하지 않는 작품이면 404를 반환한다', async () => {
    mockPrisma.artwork.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/admin/artworks/a1b2c3d4-e5f6-7890-abcd-ef1234567890')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  test('DELETE /api/admin/artworks/:id - 잘못된 ID 형식이면 400을 반환한다', async () => {
    const res = await request(app)
      .delete('/api/admin/artworks/invalid-id')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });
});

describe('Admin Recommendations', () => {
  const mockRec = {
    id: 'b1c2d3e4-f5a6-7890-abcd-ef1234567890',
    imageUrl: 'https://storage.supabase.co/recommendations/banner.png',
    designId: 1,
  };

  test('POST /api/admin/recommendations - 추천 배너를 등록한다', async () => {
    mockPrisma.recommendation.count.mockResolvedValue(0);
    mockPrisma.design.findUnique.mockResolvedValue({ id: 1, title: '꽃 도안' });
    mockPrisma.recommendation.create.mockResolvedValue(mockRec);

    const res = await request(app)
      .post('/api/admin/recommendations')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('image', VALID_PNG_BUFFER, { filename: 'banner.png', contentType: 'image/png' })
      .field('designId', '1');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.designId).toBe(1);
  });

  test('POST /api/admin/recommendations - 이미지 없이 요청하면 400을 반환한다', async () => {
    const res = await request(app)
      .post('/api/admin/recommendations')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('designId', '1');

    expect(res.status).toBe(400);
  });

  test('POST /api/admin/recommendations - 존재하지 않는 도안이면 404를 반환한다', async () => {
    mockPrisma.recommendation.count.mockResolvedValue(0);
    mockPrisma.design.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/admin/recommendations')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('image', VALID_PNG_BUFFER, { filename: 'banner.png', contentType: 'image/png' })
      .field('designId', '999');

    expect(res.status).toBe(404);
  });

  test('POST /api/admin/recommendations - 최대 10개 초과 시 409를 반환한다', async () => {
    mockPrisma.recommendation.count.mockResolvedValue(10);

    const res = await request(app)
      .post('/api/admin/recommendations')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('image', VALID_PNG_BUFFER, { filename: 'banner.png', contentType: 'image/png' })
      .field('designId', '1');

    expect(res.status).toBe(409);
  });

  test('DELETE /api/admin/recommendations/:id - 추천 배너를 삭제한다', async () => {
    mockPrisma.recommendation.findUnique.mockResolvedValue(mockRec);
    mockPrisma.recommendation.delete.mockResolvedValue(mockRec);

    const res = await request(app)
      .delete(`/api/admin/recommendations/${mockRec.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeNull();
  });

  test('DELETE /api/admin/recommendations/:id - 존재하지 않는 배너이면 404를 반환한다', async () => {
    mockPrisma.recommendation.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/admin/recommendations/b1c2d3e4-f5a6-7890-abcd-ef1234567890')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

describe('GET /api/designs/recommendations', () => {
  test('인증된 사용자가 추천 배너 목록을 조회한다', async () => {
    const mockRecs = [
      { id: 'rec-1', imageUrl: 'https://cdn.example.com/b1.png', designId: 1 },
      { id: 'rec-2', imageUrl: 'https://cdn.example.com/b2.png', designId: 2 },
    ];
    mockPrisma.recommendation.findMany.mockResolvedValue(mockRecs);

    const res = await request(app)
      .get('/api/designs/recommendations')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].designId).toBe(1);
  });

  test('인증 없이 요청하면 401을 반환한다', async () => {
    const res = await request(app).get('/api/designs/recommendations');
    expect(res.status).toBe(401);
  });
});

describe('Admin Notices', () => {
  const mockNotice = {
    id: 'c1d2e3f4-a5b6-7890-abcd-ef1234567890',
    title: '오픈 갤러리 삭제 규칙',
    content: '부적절한 작품은 사전 경고 없이 삭제될 수 있습니다.',
    createdAt: new Date().toISOString(),
  };

  test('GET /api/admin/notices - 공지사항 목록을 조회한다', async () => {
    mockPrisma.notice.findMany.mockResolvedValue([mockNotice]);

    const res = await request(app)
      .get('/api/admin/notices')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('오픈 갤러리 삭제 규칙');
  });

  test('POST /api/admin/notices - 공지사항을 등록한다', async () => {
    mockPrisma.notice.create.mockResolvedValue(mockNotice);

    const res = await request(app)
      .post('/api/admin/notices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: '오픈 갤러리 삭제 규칙', content: '부적절한 작품은 사전 경고 없이 삭제될 수 있습니다.' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('오픈 갤러리 삭제 규칙');
  });

  test('POST /api/admin/notices - 필수 필드 누락 시 400을 반환한다', async () => {
    const res = await request(app)
      .post('/api/admin/notices')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: '' });

    expect(res.status).toBe(400);
  });

  test('DELETE /api/admin/notices/:id - 공지사항을 삭제한다', async () => {
    mockPrisma.notice.findUnique.mockResolvedValue(mockNotice);
    mockPrisma.notice.delete.mockResolvedValue(mockNotice);

    const res = await request(app)
      .delete(`/api/admin/notices/${mockNotice.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeNull();
  });

  test('DELETE /api/admin/notices/:id - 존재하지 않는 공지이면 404를 반환한다', async () => {
    mockPrisma.notice.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/admin/notices/c1d2e3f4-a5b6-7890-abcd-ef1234567890')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

describe('GET /api/notices', () => {
  test('인증된 사용자가 공지사항 목록을 조회한다', async () => {
    const mockNotices = [
      { id: 'n-1', title: '공지1', content: '내용1', createdAt: new Date().toISOString() },
    ];
    mockPrisma.notice.findMany.mockResolvedValue(mockNotices);

    const res = await request(app)
      .get('/api/notices')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });

  test('인증 없이 요청하면 401을 반환한다', async () => {
    const res = await request(app).get('/api/notices');
    expect(res.status).toBe(401);
  });
});
