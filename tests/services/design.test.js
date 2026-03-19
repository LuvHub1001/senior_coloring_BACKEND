require('../setup');

// Prisma mock
const mockPrisma = {
  design: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

// Supabase mock
jest.mock('../../src/config/supabase', () => ({
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn().mockResolvedValue({ error: null }),
      getPublicUrl: jest.fn().mockReturnValue({
        data: { publicUrl: 'https://storage.supabase.co/designs/test.png' },
      }),
    })),
  },
}));

const { createDesign, getDesigns, getDesignById, designCache, categoryCache } = require('../../src/services/design');

const mockDesign = {
  id: 1,
  title: '꽃 도안',
  category: '자연',
  description: null,
  imageUrl: 'https://storage.supabase.co/designs/test.png',
  createdAt: new Date(),
};

const mockFile = {
  originalname: 'flower.png',
  buffer: Buffer.from('fake-image'),
  mimetype: 'image/png',
};

beforeEach(() => {
  jest.clearAllMocks();
  designCache.clear();
  categoryCache.clear();
});

describe('Design Service', () => {
  describe('createDesign', () => {
    test('도안을 생성하고 반환한다', async () => {
      mockPrisma.design.create.mockResolvedValue(mockDesign);

      const result = await createDesign({
        title: '꽃 도안',
        category: '자연',
        description: null,
        file: mockFile,
      });

      expect(mockPrisma.design.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: '꽃 도안',
          category: '자연',
          description: null,
        }),
      });
      expect(result).toEqual(mockDesign);
    });

    test('Supabase 업로드 실패 시 500 에러를 던진다', async () => {
      const supabase = require('../../src/config/supabase');
      supabase.storage.from.mockReturnValueOnce({
        upload: jest.fn().mockResolvedValue({ error: { message: 'upload failed' } }),
        getPublicUrl: jest.fn(),
      });

      await expect(
        createDesign({ title: '테스트', category: '자연', file: mockFile }),
      ).rejects.toMatchObject({ status: 500 });
    });
  });

  describe('getDesigns', () => {
    test('전체 도안 목록을 반환한다', async () => {
      mockPrisma.design.findMany.mockResolvedValue([mockDesign]);

      const result = await getDesigns();

      expect(mockPrisma.design.findMany).toHaveBeenCalledWith({
        where: {},
        select: {
          id: true,
          title: true,
          category: true,
          description: true,
          imageUrl: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
    });

    test('category 필터를 적용한다', async () => {
      mockPrisma.design.findMany.mockResolvedValue([]);

      await getDesigns({ category: '동물' });

      expect(mockPrisma.design.findMany).toHaveBeenCalledWith({
        where: { category: '동물' },
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    test('category 없이 호출해도 동작한다', async () => {
      mockPrisma.design.findMany.mockResolvedValue([]);

      await getDesigns({});

      expect(mockPrisma.design.findMany).toHaveBeenCalledWith({
        where: {},
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    test('캐시된 결과를 반환한다', async () => {
      mockPrisma.design.findMany.mockResolvedValue([mockDesign]);

      await getDesigns();
      await getDesigns();

      // 두 번째 호출에서는 DB를 조회하지 않음
      expect(mockPrisma.design.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('getDesignById', () => {
    test('존재하는 도안을 반환한다', async () => {
      mockPrisma.design.findUnique.mockResolvedValue(mockDesign);

      const result = await getDesignById(1);

      expect(result).toEqual(mockDesign);
      expect(mockPrisma.design.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    test('존재하지 않는 도안이면 404 에러를 던진다', async () => {
      mockPrisma.design.findUnique.mockResolvedValue(null);

      await expect(getDesignById(999)).rejects.toMatchObject({
        message: '도안을 찾을 수 없습니다.',
        status: 404,
      });
    });
  });
});
