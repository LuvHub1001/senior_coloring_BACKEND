require('../setup');

// Prisma mock
const mockPrisma = {
  user: { findUnique: jest.fn(), update: jest.fn() },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

const { getUserProfile, updateNickname } = require('../../src/services/user');

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
      mockPrisma.user.update.mockResolvedValue({ id: 'user-1' });
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        nickname: '새닉네임',
      });

      const result = await updateNickname('user-1', '새닉네임');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { nickname: '새닉네임' },
        select: { id: true },
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
});
