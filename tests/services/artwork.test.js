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
  user: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
  theme: { findFirst: jest.fn() },
  exhibition: { deleteMany: jest.fn() },
  galleryLike: { deleteMany: jest.fn() },
  $transaction: jest.fn((fn) => fn(mockPrisma)),
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

    test('동일 도안에 IN_PROGRESS 작품이 있어도 새 작품을 생성한다', async () => {
      const newArtwork = { ...mockArtwork, id: 'artwork-2' };
      mockPrisma.design.findUnique.mockResolvedValue(mockDesign);
      mockPrisma.artwork.create.mockResolvedValue(newArtwork);

      const result = await artworkService.createArtwork({
        userId: 'user-1',
        designId: 1,
      });

      expect(mockPrisma.artwork.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.artwork.create).toHaveBeenCalled();
      expect(result.id).toBe('artwork-2');
    });

    test('존재하지 않는 도안이면 404 에러를 던진다', async () => {
      mockPrisma.design.findUnique.mockResolvedValue(null);

      await expect(
        artworkService.createArtwork({ userId: 'user-1', designId: 999 }),
      ).rejects.toMatchObject({ message: '도안을 찾을 수 없습니다.', status: 404 });
    });

    test('rootArtworkId 전달 시 원본의 rootArtworkId가 없으면 해당 ID를 저장한다', async () => {
      const sourceArtwork = { id: 'root-1', userId: 'user-1', rootArtworkId: null };
      mockPrisma.design.findUnique.mockResolvedValue(mockDesign);
      mockPrisma.artwork.findUnique.mockResolvedValue(sourceArtwork);
      mockPrisma.artwork.create.mockResolvedValue({ ...mockArtwork, rootArtworkId: 'root-1' });

      const result = await artworkService.createArtwork({
        userId: 'user-1',
        designId: 1,
        rootArtworkId: 'root-1',
      });

      expect(mockPrisma.artwork.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', designId: 1, rootArtworkId: 'root-1', status: 'IN_PROGRESS' },
        include: { design: true },
      });
      expect(result.rootArtworkId).toBe('root-1');
    });

    test('rootArtworkId 전달 시 직접 부모 ID를 그대로 저장한다 (체인 추적 안 함)', async () => {
      const sourceArtwork = { id: 'child-1', userId: 'user-1' };
      mockPrisma.design.findUnique.mockResolvedValue(mockDesign);
      mockPrisma.artwork.findUnique.mockResolvedValue(sourceArtwork);
      mockPrisma.artwork.create.mockResolvedValue({ ...mockArtwork, rootArtworkId: 'child-1' });

      const result = await artworkService.createArtwork({
        userId: 'user-1',
        designId: 1,
        rootArtworkId: 'child-1',
      });

      expect(mockPrisma.artwork.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', designId: 1, rootArtworkId: 'child-1', status: 'IN_PROGRESS' },
        include: { design: true },
      });
      expect(result.rootArtworkId).toBe('child-1');
    });

    test('rootArtworkId가 존재하지 않는 작품이면 404 에러를 던진다', async () => {
      mockPrisma.design.findUnique.mockResolvedValue(mockDesign);
      mockPrisma.artwork.findUnique.mockResolvedValue(null);

      await expect(
        artworkService.createArtwork({ userId: 'user-1', designId: 1, rootArtworkId: 'nonexistent' }),
      ).rejects.toMatchObject({ status: 404 });
    });

    test('rootArtworkId가 타인의 작품이면 403 에러를 던진다', async () => {
      mockPrisma.design.findUnique.mockResolvedValue(mockDesign);
      mockPrisma.artwork.findUnique.mockResolvedValue({ id: 'other-art', userId: 'other-user', rootArtworkId: null });

      await expect(
        artworkService.createArtwork({ userId: 'user-1', designId: 1, rootArtworkId: 'other-art' }),
      ).rejects.toMatchObject({ status: 403 });
    });
  });

  describe('completeArtwork', () => {
    test('작품을 완성 처리한다', async () => {
      mockPrisma.artwork.findUnique.mockResolvedValue(mockArtwork);
      mockPrisma.user.findUnique.mockResolvedValue({ totalCompletedCount: 2, featuredArtworkId: null });
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
        data: { status: 'COMPLETED', progress: 100, isPublic: true },
        include: { design: true },
      });
      expect(result.status).toBe('COMPLETED');
      expect(result.unlockedTheme).toBeNull();
    });

    test('첫 작품 완성 시 대표 작품으로 설정한다', async () => {
      mockPrisma.artwork.findUnique.mockResolvedValue(mockArtwork);
      mockPrisma.user.findUnique.mockResolvedValue({ totalCompletedCount: 0, featuredArtworkId: null });
      mockPrisma.artwork.update.mockResolvedValue({
        ...mockArtwork,
        status: 'COMPLETED',
        progress: 100,
      });
      mockPrisma.user.update.mockResolvedValue({ totalCompletedCount: 1 });
      mockPrisma.theme.findFirst.mockResolvedValue(null);

      await artworkService.completeArtwork({
        artworkId: 'artwork-1',
        userId: 'user-1',
      });

      // 첫 작품이면 increment + featuredArtworkId를 한 번에 업데이트
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          totalCompletedCount: { increment: 1 },
          featuredArtworkId: 'artwork-1',
        },
        select: { totalCompletedCount: true },
      });
    });

    test('작품 완성 시 새 테마가 해금되면 반환한다', async () => {
      const unlockedTheme = { id: 2, name: '바다', imageUrl: 'https://example.com/sea.png' };
      mockPrisma.artwork.findUnique.mockResolvedValue(mockArtwork);
      mockPrisma.user.findUnique.mockResolvedValue({ totalCompletedCount: 2, featuredArtworkId: null });
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

    test('이미 완성된 작품 재완성 시 해금 카운트가 증가하지 않는다', async () => {
      const completedArtwork = { ...mockArtwork, status: 'COMPLETED', progress: 100 };
      mockPrisma.artwork.findUnique.mockResolvedValue(completedArtwork);

      const result = await artworkService.completeArtwork({
        artworkId: 'artwork-1',
        userId: 'user-1',
      });

      // user.findUnique, user.update, artwork.update 호출되지 않아야 함
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
      expect(mockPrisma.artwork.update).not.toHaveBeenCalled();
      expect(result.status).toBe('COMPLETED');
      expect(result.unlockedTheme).toBeNull();
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

    test('rootArtworkId가 있으면 원본 작품을 삭제한다', async () => {
      const artworkWithRoot = { ...mockArtwork, rootArtworkId: 'root-1' };
      const rootArtwork = { userId: 'user-1', imageUrl: null };

      // getOwnArtwork 호출 (findUnique 1차)
      mockPrisma.artwork.findUnique
        .mockResolvedValueOnce(artworkWithRoot) // getOwnArtwork
        .mockResolvedValueOnce(rootArtwork); // 원본 조회

      mockPrisma.user.findUnique.mockResolvedValue({ totalCompletedCount: 2, featuredArtworkId: 'other-art' });
      mockPrisma.artwork.update.mockResolvedValue({ ...artworkWithRoot, status: 'COMPLETED', progress: 100 });
      mockPrisma.user.update.mockResolvedValue({ totalCompletedCount: 3 });
      mockPrisma.theme.findFirst.mockResolvedValue(null);
      mockPrisma.artwork.delete.mockResolvedValue({});

      const result = await artworkService.completeArtwork({
        artworkId: 'artwork-1',
        userId: 'user-1',
      });

      expect(result.replacedRoot).toBe(true);
      expect(result.updatedFeatured).toBe(false);
      expect(mockPrisma.artwork.delete).toHaveBeenCalledWith({ where: { id: 'root-1' } });
    });

    test('rootArtworkId가 featuredArtworkId이면 대표 작품을 교체한다', async () => {
      const artworkWithRoot = { ...mockArtwork, rootArtworkId: 'root-1' };
      const rootArtwork = { userId: 'user-1', imageUrl: null };

      mockPrisma.artwork.findUnique
        .mockResolvedValueOnce(artworkWithRoot)
        .mockResolvedValueOnce(rootArtwork);

      mockPrisma.user.findUnique.mockResolvedValue({ totalCompletedCount: 2, featuredArtworkId: 'root-1' });
      mockPrisma.artwork.update.mockResolvedValue({ ...artworkWithRoot, status: 'COMPLETED', progress: 100 });
      mockPrisma.user.update
        .mockResolvedValueOnce({ totalCompletedCount: 3 }) // increment
        .mockResolvedValueOnce({}); // featured 교체
      mockPrisma.theme.findFirst.mockResolvedValue(null);
      mockPrisma.artwork.delete.mockResolvedValue({});

      const result = await artworkService.completeArtwork({
        artworkId: 'artwork-1',
        userId: 'user-1',
      });

      expect(result.replacedRoot).toBe(true);
      expect(result.updatedFeatured).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { featuredArtworkId: 'artwork-1' },
      });
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
