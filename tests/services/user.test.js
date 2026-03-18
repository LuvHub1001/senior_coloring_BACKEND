require('../setup');

// Prisma mock
const mockPrisma = {
  user: { findUnique: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
  artwork: { aggregate: jest.fn() },
  follow: { findUnique: jest.fn(), create: jest.fn(), delete: jest.fn() },
  $transaction: jest.fn(),
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

const { getUserProfile, updateNickname, getPublicProfile, followUser, unfollowUser } = require('../../src/services/user');

const mockUser = {
  id: 'user-1',
  nickname: '테스터',
  avatarUrl: null,
  email: 'test@example.com',
  selectedThemeId: 1,
  selectedTheme: { id: 1, name: '기본' },
  featuredArtworkId: null,
  createdAt: new Date(),
};

beforeEach(() => {
  jest.resetAllMocks();
});

describe('User Service', () => {
  describe('getUserProfile', () => {
    test('유저 프로필을 반환한다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await getUserProfile('user-1');

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: {
          id: true,
          nickname: true,
          avatarUrl: true,
          statusMessage: true,
          email: true,
          role: true,
          selectedThemeId: true,
          selectedTheme: { select: { id: true, name: true, toggleType: true } },
          featuredArtworkId: true,
          featuredArtwork: { select: { id: true, imageUrl: true } },
          createdAt: true,
        },
      });
    });

    test('존재하지 않는 유저이면 404 에러를 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(getUserProfile('nonexistent')).rejects.toMatchObject({
        message: '사용자를 찾을 수 없습니다.',
        status: 404,
      });
    });

    test('비밀번호 등 민감 정보는 select에 포함하지 않는다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await getUserProfile('user-1');

      const selectArg = mockPrisma.user.findUnique.mock.calls[0][0].select;
      expect(selectArg.password).toBeUndefined();
      expect(selectArg.provider).toBeUndefined();
      expect(selectArg.providerId).toBeUndefined();
    });
  });

  describe('updateNickname', () => {
    test('닉네임을 변경하고 전체 프로필을 반환한다', async () => {
      const updatedUser = { ...mockUser, nickname: '새닉네임' };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const result = await updateNickname('user-1', '새닉네임');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { nickname: '새닉네임' },
        select: expect.objectContaining({
          id: true,
          nickname: true,
          statusMessage: true,
          email: true,
          role: true,
        }),
      });
      expect(result.nickname).toBe('새닉네임');
      expect(result.id).toBe('user-1');
      expect(result.email).toBeDefined();
    });

    test('존재하지 않는 유저이면 404 에러를 던진다', async () => {
      const prismaError = new Error('Record not found');
      prismaError.code = 'P2025';
      mockPrisma.user.update.mockRejectedValue(prismaError);

      await expect(updateNickname('nonexistent', '닉네임')).rejects.toMatchObject({
        message: '사용자를 찾을 수 없습니다.',
        status: 404,
      });
    });
  });

  describe('getPublicProfile', () => {
    test('타인 프로필을 통계와 함께 반환한다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        nickname: '열정판다',
        avatarUrl: '🐶',
        statusMessage: '안녕하세요',
        followerCount: 10,
        followers: [],
      });
      mockPrisma.artwork.aggregate.mockResolvedValue({
        _count: { id: 4 },
        _sum: { likeCount: 123 },
      });

      const result = await getPublicProfile({ targetUserId: 'user-2', currentUserId: 'user-1' });

      expect(result.id).toBe('user-2');
      expect(result.nickname).toBe('열정판다');
      expect(result.publishedCount).toBe(4);
      expect(result.totalLikesReceived).toBe(123);
      expect(result.followerCount).toBe(10);
      expect(result.isFollowing).toBe(false);
    });

    test('팔로우 중이면 isFollowing이 true이다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        nickname: '열정판다',
        avatarUrl: '🐶',
        statusMessage: null,
        followerCount: 10,
        followers: [{ id: 'follow-1' }],
      });
      mockPrisma.artwork.aggregate.mockResolvedValue({
        _count: { id: 0 },
        _sum: { likeCount: null },
      });

      const result = await getPublicProfile({ targetUserId: 'user-2', currentUserId: 'user-1' });

      expect(result.isFollowing).toBe(true);
    });

    test('존재하지 않는 유저이면 404 에러를 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        getPublicProfile({ targetUserId: 'nonexistent', currentUserId: null }),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('followUser', () => {
    test('팔로우를 생성하고 팔로워 수를 반환한다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-2' });
      mockPrisma.follow.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockResolvedValue([
        { id: 'follow-1' },
        { followerCount: 11 },
      ]);

      const result = await followUser({ followerId: 'user-1', followingId: 'user-2' });

      expect(result).toEqual({ isFollowing: true, followerCount: 11 });
    });

    test('자기 자신을 팔로우하면 400 에러를 던진다', async () => {
      await expect(
        followUser({ followerId: 'user-1', followingId: 'user-1' }),
      ).rejects.toMatchObject({ status: 400 });
    });

    test('이미 팔로우 중이면 409 에러를 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-2' });
      mockPrisma.follow.findUnique.mockResolvedValue({ id: 'follow-1' });

      await expect(
        followUser({ followerId: 'user-1', followingId: 'user-2' }),
      ).rejects.toMatchObject({ status: 409 });
    });

    test('존재하지 않는 유저를 팔로우하면 404 에러를 던진다', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        followUser({ followerId: 'user-1', followingId: 'nonexistent' }),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('unfollowUser', () => {
    test('팔로우를 삭제하고 팔로워 수를 반환한다', async () => {
      mockPrisma.follow.findUnique.mockResolvedValue({ id: 'follow-1' });
      mockPrisma.$transaction.mockResolvedValue([
        { id: 'follow-1' },
        { followerCount: 9 },
      ]);

      const result = await unfollowUser({ followerId: 'user-1', followingId: 'user-2' });

      expect(result).toEqual({ isFollowing: false, followerCount: 9 });
    });

    test('자기 자신을 언팔로우하면 400 에러를 던진다', async () => {
      await expect(
        unfollowUser({ followerId: 'user-1', followingId: 'user-1' }),
      ).rejects.toMatchObject({ status: 400 });
    });

    test('팔로우하지 않은 유저를 언팔로우하면 404 에러를 던진다', async () => {
      mockPrisma.follow.findUnique.mockResolvedValue(null);

      await expect(
        unfollowUser({ followerId: 'user-1', followingId: 'user-2' }),
      ).rejects.toMatchObject({ status: 404 });
    });
  });
});
