require('../setup');

// Prisma mock
const mockPrisma = {
  artwork: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  communityLike: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    groupBy: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  notification: {
    create: jest.fn(),
  },
  $transaction: jest.fn((args) => {
    if (Array.isArray(args)) return Promise.all(args);
    return args(mockPrisma);
  }),
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

const {
  getCommunityArtworks,
  getPopularArtworks,
  getCommunityArtworkDetail,
  toggleLike,
  popularCache,
  countCache,
} = require('../../src/services/community');

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
  popularCache.clear();
  countCache.clear();
});

describe('Community Service', () => {
  describe('getCommunityArtworks', () => {
    it('최신순으로 커뮤니티 작품 목록을 조회한다', async () => {
      mockPrisma.artwork.findMany.mockResolvedValue([mockArtwork]);
      mockPrisma.artwork.count.mockResolvedValue(1);

      const result = await getCommunityArtworks({
        sort: 'recent',
        page: 1,
        size: 20,
        userId: null,
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toEqual({
        artworkId: 'artwork-1',
        imageUrl: mockArtwork.imageUrl,
        title: '꽃 도안',
        author: { id: 'user-10', nickname: '테스트유저' },
        createdAt: mockArtwork.createdAt,
        likeCount: 5,
        isLiked: false,
      });
      expect(result.page).toBe(0);
      expect(result.size).toBe(20);
      expect(result.totalElements).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.last).toBe(true);

      expect(mockPrisma.artwork.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'COMPLETED', isPublic: true, imageUrl: { not: null } },
          orderBy: [{ publishedAt: 'desc' }],
          skip: 0,
          take: 20,
        }),
      );
    });

    it('인기순으로 정렬한다', async () => {
      mockPrisma.artwork.findMany.mockResolvedValue([mockArtwork]);
      mockPrisma.artwork.count.mockResolvedValue(1);

      await getCommunityArtworks({ sort: 'popular', page: 1, size: 20, userId: null });

      expect(mockPrisma.artwork.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ likeCount: 'desc' }, { publishedAt: 'desc' }],
        }),
      );
    });

    it('로그인 사용자의 좋아요 상태를 포함한다', async () => {
      const artworkWithLike = { ...mockArtwork, likes: [{ id: 'like-1' }] };
      mockPrisma.artwork.findMany.mockResolvedValue([artworkWithLike]);
      mockPrisma.artwork.count.mockResolvedValue(1);

      const result = await getCommunityArtworks({
        sort: 'recent',
        page: 1,
        size: 20,
        userId: 'user-1',
      });

      expect(result.content[0].isLiked).toBe(true);
    });

    it('페이지네이션이 올바르게 동작한다', async () => {
      mockPrisma.artwork.findMany.mockResolvedValue([]);
      mockPrisma.artwork.count.mockResolvedValue(50);

      const result = await getCommunityArtworks({
        sort: 'recent',
        page: 3,
        size: 10,
        userId: null,
      });

      expect(mockPrisma.artwork.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
      expect(result.totalPages).toBe(5);
      expect(result.last).toBe(false);
    });
  });

  describe('getCommunityArtworkDetail', () => {
    it('커뮤니티 작품 상세를 조회한다', async () => {
      mockPrisma.artwork.findUnique.mockResolvedValue(mockArtwork);

      const result = await getCommunityArtworkDetail({
        artworkId: 'artwork-1',
        userId: null,
      });

      expect(result.artworkId).toBe('artwork-1');
      expect(result.title).toBe('꽃 도안');
      expect(result.author).toEqual({ id: 'user-10', nickname: '테스트유저' });
      expect(result.design).toEqual({
        id: 1,
        title: '꽃 도안',
        imageUrl: 'https://storage.supabase.co/designs/flower.png',
      });
    });

    it('존재하지 않는 작품 조회 시 404 에러', async () => {
      mockPrisma.artwork.findUnique.mockResolvedValue(null);

      await expect(
        getCommunityArtworkDetail({ artworkId: 'nonexistent', userId: null }),
      ).rejects.toThrow('작품을 찾을 수 없습니다.');
    });

    it('COMPLETED가 아닌 작품 조회 시 404 에러', async () => {
      mockPrisma.artwork.findUnique.mockResolvedValue({
        ...mockArtwork,
        status: 'IN_PROGRESS',
      });

      await expect(
        getCommunityArtworkDetail({ artworkId: 'artwork-1', userId: null }),
      ).rejects.toThrow('작품을 찾을 수 없습니다.');
    });

    it('비공개 작품 조회 시 404 에러', async () => {
      mockPrisma.artwork.findUnique.mockResolvedValue({
        ...mockArtwork,
        isPublic: false,
      });

      await expect(
        getCommunityArtworkDetail({ artworkId: 'artwork-1', userId: null }),
      ).rejects.toThrow('작품을 찾을 수 없습니다.');
    });
  });

  describe('toggleLike', () => {
    it('좋아요를 추가한다', async () => {
      mockPrisma.artwork.findUnique.mockResolvedValue({
        id: 'artwork-1', userId: 'owner-1', title: null, status: 'COMPLETED', isPublic: true,
        design: { title: '등산' },
        likes: [],
      });
      mockPrisma.$transaction.mockResolvedValueOnce([{}, { likeCount: 6 }]);
      mockPrisma.user.findUnique.mockResolvedValue({ nickname: '꼬마 화가' });

      const result = await toggleLike({
        artworkId: 'artwork-1',
        userId: 'user-1',
      });

      expect(result).toEqual({ isLiked: true, likeCount: 6 });
    });

    it('좋아요를 취소한다', async () => {
      mockPrisma.artwork.findUnique.mockResolvedValue({
        id: 'artwork-1', userId: 'owner-1', title: null, status: 'COMPLETED', isPublic: true,
        design: { title: '등산' },
        likes: [{ id: 'like-1' }],
      });
      mockPrisma.$transaction.mockResolvedValueOnce([{}, { likeCount: 4 }]);

      const result = await toggleLike({
        artworkId: 'artwork-1',
        userId: 'user-1',
      });

      expect(result).toEqual({ isLiked: false, likeCount: 4 });
    });

    it('존재하지 않는 작품에 좋아요 시 404 에러', async () => {
      mockPrisma.artwork.findUnique.mockResolvedValue(null);

      await expect(
        toggleLike({ artworkId: 'nonexistent', userId: 'user-1' }),
      ).rejects.toThrow('작품을 찾을 수 없습니다.');
    });

    it('비공개 작품에 좋아요 시 404 에러', async () => {
      mockPrisma.artwork.findUnique.mockResolvedValue({
        id: 'artwork-1',
        status: 'COMPLETED',
        isPublic: false,
      });

      await expect(
        toggleLike({ artworkId: 'artwork-1', userId: 'user-1' }),
      ).rejects.toThrow('작품을 찾을 수 없습니다.');
    });
  });

  describe('getPopularArtworks', () => {
    it('오늘 좋아요가 없으면 전체 인기순으로 fallback', async () => {
      mockPrisma.communityLike.groupBy.mockResolvedValue([]);
      mockPrisma.artwork.findMany.mockResolvedValue([mockArtwork]);
      mockPrisma.artwork.count.mockResolvedValue(1);

      const result = await getPopularArtworks({ size: 10, userId: null });

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('꽃 도안');
    });

    it('오늘의 인기 작품을 조회한다', async () => {
      mockPrisma.communityLike.groupBy.mockResolvedValue([
        { artworkId: 'artwork-1', _count: { artworkId: 3 } },
      ]);
      mockPrisma.artwork.findMany.mockResolvedValue([mockArtwork]);

      const result = await getPopularArtworks({ size: 10, userId: null });

      expect(result).toHaveLength(1);
      expect(result[0].artworkId).toBe('artwork-1');
    });
  });
});
