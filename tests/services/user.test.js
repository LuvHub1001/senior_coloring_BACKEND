require('../setup');

// Prisma mock
const mockPrisma = {
  user: { findUnique: jest.fn() },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

const { getUserProfile } = require('../../src/services/user');

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
  jest.clearAllMocks();
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
          email: true,
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
});
