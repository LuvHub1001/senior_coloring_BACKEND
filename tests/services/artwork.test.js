require('../setup');

// Prisma mock
const mockPrisma = {
  design: { findUnique: jest.fn() },
  artwork: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  user: { findUnique: jest.fn(), update: jest.fn() },
  theme: { findFirst: jest.fn() },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

// Supabase mock
const mockSupabaseStorage = {
  from: jest.fn(() => ({
    upload: jest.fn().mockResolvedValue({ error: null }),
    getPublicUrl: jest.fn().mockReturnValue({
      data: { publicUrl: 'https://storage.supabase.co/artworks/test.png' },
    }),
    remove: jest.fn().mockResolvedValue({}),
  })),
};

jest.mock('../../src/config/supabase', () => ({
  storage: mockSupabaseStorage,
}));

const artworkService = require('../../src/services/artwork');

const mockDesign = { id: 1, title: '꽃', category: '자연', imageUrl: 'https://example.com/design.png' };
const mockArtwork = {
  id: 'artwork-1',
  userId: 'user-1',
  designId: 1,
  status: 'IN_PROGRESS',
  progress: 0,
  imageUrl: null,
  design: mockDesign,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Artwork Service', () => {
  describe('createArtwork', () => {
    test('도안이 존재하면 새 작품을 생성한다', async () => {
      mockPrisma.design.findUnique.mockResolvedValue(mockDesign);
      mockPrisma.artwork.findFirst.mockResolvedValue(null);
      mockPrisma.artwork.create.mockResolvedValue(mockArtwork);

      const result = await artworkService.createArtwork({
        userId: 'user-1',
        designId: 1,
      });

      expect(mockPrisma.design.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockPrisma.artwork.create).toHaveBeenCalled();
      expect(result).toEqual(mockArtwork);
    });

    test('동일 도안에 IN_PROGRESS 작품이 있으면 기존 작품을 반환한다', async () => {
      mockPrisma.design.findUnique.mockResolvedValue(mockDesign);
      mockPrisma.artwork.findFirst.mockResolvedValue(mockArtwork);

      const result = await artworkService.createArtwork({
        userId: 'user-1',
        designId: 1,
      });

      expect(mockPrisma.artwork.create).not.toHaveBeenCalled();
      expect(result).toEqual(mockArtwork);
    });

    test('존재하지 않는 도안이면 404 에러를 던진다', async () => {
      mockPrisma.design.findUnique.mockResolvedValue(null);

      await expect(
        artworkService.createArtwork({ userId: 'user-1', designId: 999 }),
      ).rejects.toMatchObject({ message: '도안을 찾을 수 없습니다.', status: 404 });
    });
  });

  describe('completeArtwork', () => {
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

      const result = await artworkService.completeArtwork({
        artworkId: 'artwork-1',
        userId: 'user-1',
      });

      expect(mockPrisma.artwork.update).toHaveBeenCalledWith({
        where: { id: 'artwork-1' },
        data: { status: 'COMPLETED', progress: 100 },
        include: { design: true },
      });
      expect(result.status).toBe('COMPLETED');
      expect(result.unlockedTheme).toBeNull();
    });

    test('첫 작품 완성 시 대표 작품으로 설정한다', async () => {
      mockPrisma.artwork.findUnique.mockResolvedValue(mockArtwork);
      mockPrisma.user.findUnique.mockResolvedValue({ totalCompletedCount: 0 });
      mockPrisma.artwork.update.mockResolvedValue({
        ...mockArtwork,
        status: 'COMPLETED',
        progress: 100,
      });
      mockPrisma.user.update
        .mockResolvedValueOnce({ totalCompletedCount: 1 })
        .mockResolvedValueOnce({});
      mockPrisma.theme.findFirst.mockResolvedValue(null);

      await artworkService.completeArtwork({
        artworkId: 'artwork-1',
        userId: 'user-1',
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { featuredArtworkId: 'artwork-1' },
      });
    });

    test('작품 완성 시 새 테마가 해금되면 반환한다', async () => {
      const unlockedTheme = { id: 2, name: '바다', imageUrl: 'https://example.com/sea.png' };
      mockPrisma.artwork.findUnique.mockResolvedValue(mockArtwork);
      mockPrisma.user.findUnique.mockResolvedValue({ totalCompletedCount: 2 });
      mockPrisma.artwork.update.mockResolvedValue({
        ...mockArtwork,
        status: 'COMPLETED',
        progress: 100,
      });
      mockPrisma.user.update.mockResolvedValue({ totalCompletedCount: 3 });
      mockPrisma.theme.findFirst.mockResolvedValue(unlockedTheme);

      const result = await artworkService.completeArtwork({
        artworkId: 'artwork-1',
        userId: 'user-1',
      });

      expect(result.unlockedTheme).toEqual(unlockedTheme);
    });

    test('다른 유저의 작품을 완성하려 하면 403 에러를 던진다', async () => {
      mockPrisma.artwork.findUnique.mockResolvedValue({
        ...mockArtwork,
        userId: 'other-user',
      });

      await expect(
        artworkService.completeArtwork({ artworkId: 'artwork-1', userId: 'user-1' }),
      ).rejects.toMatchObject({ status: 403 });
    });
  });

  describe('getMyArtworks', () => {
    test('유저의 전체 작품 목록을 반환한다', async () => {
      mockPrisma.artwork.findMany.mockResolvedValue([mockArtwork]);

      const result = await artworkService.getMyArtworks({ userId: 'user-1' });

      expect(mockPrisma.artwork.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { design: true },
        orderBy: { updatedAt: 'desc' },
      });
      expect(result).toHaveLength(1);
    });

    test('status 필터를 적용한다', async () => {
      mockPrisma.artwork.findMany.mockResolvedValue([]);

      await artworkService.getMyArtworks({ userId: 'user-1', status: 'COMPLETED' });

      expect(mockPrisma.artwork.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: 'COMPLETED' },
        include: { design: true },
        orderBy: { updatedAt: 'desc' },
      });
    });
  });

  describe('getArtworkById', () => {
    test('본인 작품을 반환한다', async () => {
      mockPrisma.artwork.findUnique.mockResolvedValue(mockArtwork);

      const result = await artworkService.getArtworkById({
        artworkId: 'artwork-1',
        userId: 'user-1',
      });

      expect(result).toEqual(mockArtwork);
    });

    test('존재하지 않는 작품이면 404 에러를 던진다', async () => {
      mockPrisma.artwork.findUnique.mockResolvedValue(null);

      await expect(
        artworkService.getArtworkById({ artworkId: 'nonexistent', userId: 'user-1' }),
      ).rejects.toMatchObject({ status: 404 });
    });

    test('타인의 작품이면 403 에러를 던진다', async () => {
      mockPrisma.artwork.findUnique.mockResolvedValue({
        ...mockArtwork,
        userId: 'other-user',
      });

      await expect(
        artworkService.getArtworkById({ artworkId: 'artwork-1', userId: 'user-1' }),
      ).rejects.toMatchObject({ status: 403 });
    });
  });

  describe('deleteArtwork', () => {
    test('본인 작품을 삭제한다', async () => {
      mockPrisma.artwork.findUnique.mockResolvedValue(mockArtwork);
      mockPrisma.artwork.delete.mockResolvedValue(mockArtwork);

      await artworkService.deleteArtwork({ artworkId: 'artwork-1', userId: 'user-1' });

      expect(mockPrisma.artwork.delete).toHaveBeenCalledWith({
        where: { id: 'artwork-1' },
      });
    });

    test('이미지가 있는 작품 삭제 시 Storage에서도 삭제한다', async () => {
      const artworkWithImage = {
        ...mockArtwork,
        imageUrl: 'https://test.supabase.co/storage/v1/object/public/artworks/user-1/art.png',
      };
      mockPrisma.artwork.findUnique.mockResolvedValue(artworkWithImage);
      mockPrisma.artwork.delete.mockResolvedValue(artworkWithImage);

      await artworkService.deleteArtwork({ artworkId: 'artwork-1', userId: 'user-1' });

      expect(mockSupabaseStorage.from).toHaveBeenCalledWith('artworks');
    });
  });

  describe('featureArtwork', () => {
    test('완성된 작품을 대표 작품으로 설정한다', async () => {
      const completedArtwork = { ...mockArtwork, status: 'COMPLETED' };
      mockPrisma.artwork.findUnique.mockResolvedValue(completedArtwork);
      mockPrisma.user.update.mockResolvedValue({});

      const result = await artworkService.featureArtwork({
        artworkId: 'artwork-1',
        userId: 'user-1',
      });

      expect(result).toEqual({ featuredArtworkId: 'artwork-1' });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { featuredArtworkId: 'artwork-1' },
      });
    });

    test('미완성 작품은 대표 작품으로 설정할 수 없다', async () => {
      mockPrisma.artwork.findUnique.mockResolvedValue(mockArtwork);

      await expect(
        artworkService.featureArtwork({ artworkId: 'artwork-1', userId: 'user-1' }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });
});
