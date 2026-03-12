// 공유 Prisma mock - 모든 라우트 테스트에서 사용
// jest.mock 팩토리에서 참조 가능하도록 모듈로 분리
const mockPrisma = {
  $queryRaw: jest.fn(),
  $transaction: jest.fn((fn) => fn(mockPrisma)),
  design: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  artwork: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    deleteMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  theme: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(),
  },
  exhibition: {
    deleteMany: jest.fn(),
  },
  galleryLike: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    groupBy: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
};

module.exports = mockPrisma;
