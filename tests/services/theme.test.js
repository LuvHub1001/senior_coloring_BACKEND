require('../setup');

// Prisma mock
const mockPrisma = {
  theme: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  artwork: { count: jest.fn() },
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

// Supabase mock
const mockFrom = jest.fn(() => ({
  upload: jest.fn().mockResolvedValue({ error: null }),
  getPublicUrl: jest.fn().mockReturnValue({
    data: { publicUrl: 'https://storage.supabase.co/themes/1_test.png' },
  }),
  remove: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../src/config/supabase', () => ({
  storage: { from: mockFrom },
}));

const { getThemes, selectTheme, uploadThemeImage } = require('../../src/services/theme');

const mockThemes = [
  { id: 1, name: '기본', requiredArtworks: 0, imageUrl: null, buttonColor: '#000', buttonTextColor: '#fff', textColor: '#333', sortOrder: 0 },
  { id: 2, name: '바다', requiredArtworks: 3, imageUrl: null, buttonColor: '#00f', buttonTextColor: '#fff', textColor: '#006', sortOrder: 1 },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Theme Service', () => {
  describe('getThemes', () => {
    test('테마 목록에 해금 여부와 선택 여부를 포함한다', async () => {
      mockPrisma.theme.findMany.mockResolvedValue(mockThemes);
      mockPrisma.user.findUnique.mockResolvedValue({ selectedThemeId: 1, totalCompletedCount: 2 });

      const result = await getThemes('user-1');

      expect(result).toHaveLength(2);
      // 기본 테마: requiredArtworks=0, 누적 완성 2개 → 해금
      expect(result[0].unlocked).toBe(true);
      expect(result[0].selected).toBe(true);
      // 바다 테마: requiredArtworks=3, 누적 완성 2개 → 미해금
      expect(result[1].unlocked).toBe(false);
      expect(result[1].selected).toBe(false);
    });

    test('누적 완성 수가 충분하면 모든 테마가 해금된다', async () => {
      mockPrisma.theme.findMany.mockResolvedValue(mockThemes);
      mockPrisma.user.findUnique.mockResolvedValue({ selectedThemeId: null, totalCompletedCount: 5 });

      const result = await getThemes('user-1');

      expect(result.every((t) => t.unlocked)).toBe(true);
    });

    test('병렬로 데이터를 조회한다 (2개 쿼리)', async () => {
      mockPrisma.theme.findMany.mockResolvedValue([]);
      mockPrisma.user.findUnique.mockResolvedValue({ selectedThemeId: null, totalCompletedCount: 0 });

      await getThemes('user-1');

      expect(mockPrisma.theme.findMany).toHaveBeenCalledTimes(1);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  describe('selectTheme', () => {
    test('해금된 테마를 선택한다', async () => {
      mockPrisma.theme.findUnique.mockResolvedValue(mockThemes[0]);
      mockPrisma.user.findUnique.mockResolvedValue({ totalCompletedCount: 5 });
      mockPrisma.user.update.mockResolvedValue({ id: 'user-1', selectedThemeId: 1 });

      const result = await selectTheme('user-1', 1);

      expect(result.selectedThemeId).toBe(1);
      expect(result.theme).toEqual(mockThemes[0]);
    });

    test('존재하지 않는 테마를 선택하면 404 에러를 던진다', async () => {
      mockPrisma.theme.findUnique.mockResolvedValue(null);

      await expect(selectTheme('user-1', 999)).rejects.toMatchObject({
        status: 404,
      });
    });

    test('미해금 테마를 선택하면 403 에러를 던진다', async () => {
      mockPrisma.theme.findUnique.mockResolvedValue(mockThemes[1]); // 바다: 3개 필요
      mockPrisma.user.findUnique.mockResolvedValue({ totalCompletedCount: 1 }); // 누적 완성 1개

      await expect(selectTheme('user-1', 2)).rejects.toMatchObject({
        message: '아직 해금되지 않은 테마입니다.',
        status: 403,
      });
    });
  });

  describe('uploadThemeImage', () => {
    const mockFile = {
      originalname: 'bg.png',
      buffer: Buffer.from('fake'),
      mimetype: 'image/png',
    };

    test('테마 이미지를 업로드하고 업데이트한다', async () => {
      mockPrisma.theme.findUnique.mockResolvedValue(mockThemes[0]);
      mockPrisma.theme.update.mockResolvedValue({
        ...mockThemes[0],
        imageUrl: 'https://storage.supabase.co/themes/1_test.png',
      });

      const result = await uploadThemeImage(1, mockFile);

      expect(mockFrom).toHaveBeenCalledWith('themes');
      expect(mockPrisma.theme.update).toHaveBeenCalled();
      expect(result.imageUrl).toBeDefined();
    });

    test('존재하지 않는 테마에 업로드하면 404 에러를 던진다', async () => {
      mockPrisma.theme.findUnique.mockResolvedValue(null);

      await expect(uploadThemeImage(999, mockFile)).rejects.toMatchObject({
        status: 404,
      });
    });

    test('Supabase 업로드 실패 시 500 에러를 던진다', async () => {
      mockPrisma.theme.findUnique.mockResolvedValue(mockThemes[0]);
      mockFrom.mockReturnValueOnce({
        upload: jest.fn().mockResolvedValue({ error: { message: 'fail' } }),
        getPublicUrl: jest.fn(),
        remove: jest.fn(),
      });

      await expect(uploadThemeImage(1, mockFile)).rejects.toMatchObject({
        status: 500,
      });
    });
  });
});
