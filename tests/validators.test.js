require('./setup');

const { createArtwork, saveArtwork, listArtworks } = require('../src/validators/artwork');
const { createDesign, listDesigns, designParams } = require('../src/validators/design');
const { selectTheme, themeParams } = require('../src/validators/theme');
const { listGalleryArtworks, popularGalleryArtworks, galleryArtworkParams } = require('../src/validators/gallery');

describe('Artwork Validators', () => {
  describe('createArtwork', () => {
    test('유효한 designId를 통과시킨다', () => {
      const result = createArtwork.safeParse({ body: { designId: 1 } });
      expect(result.success).toBe(true);
    });

    test('문자열 designId를 숫자로 변환한다', () => {
      const result = createArtwork.safeParse({ body: { designId: '5' } });
      expect(result.success).toBe(true);
      expect(result.data.body.designId).toBe(5);
    });

    test('음수 designId를 거부한다', () => {
      const result = createArtwork.safeParse({ body: { designId: -1 } });
      expect(result.success).toBe(false);
    });

    test('designId 누락 시 실패한다', () => {
      const result = createArtwork.safeParse({ body: {} });
      expect(result.success).toBe(false);
    });

    test('숫자가 아닌 designId를 거부한다', () => {
      const result = createArtwork.safeParse({ body: { designId: 'abc' } });
      expect(result.success).toBe(false);
    });
  });

  describe('saveArtwork', () => {
    test('progress 0~100 범위를 통과시킨다', () => {
      const result = saveArtwork.safeParse({
        params: { id: 'uuid-123' },
        body: { progress: 50 },
      });
      expect(result.success).toBe(true);
    });

    test('progress 101을 거부한다', () => {
      const result = saveArtwork.safeParse({
        params: { id: 'uuid-123' },
        body: { progress: 101 },
      });
      expect(result.success).toBe(false);
    });

    test('progress 없이도 통과한다', () => {
      const result = saveArtwork.safeParse({
        params: { id: 'uuid-123' },
        body: {},
      });
      expect(result.success).toBe(true);
    });
  });

  describe('listArtworks', () => {
    test('유효한 status를 통과시킨다', () => {
      const result = listArtworks.safeParse({ query: { status: 'COMPLETED' } });
      expect(result.success).toBe(true);
    });

    test('잘못된 status를 거부한다', () => {
      const result = listArtworks.safeParse({ query: { status: 'INVALID' } });
      expect(result.success).toBe(false);
    });

    test('status 없이도 통과한다', () => {
      const result = listArtworks.safeParse({ query: {} });
      expect(result.success).toBe(true);
    });
  });
});

describe('Design Validators', () => {
  describe('createDesign', () => {
    test('유효한 입력을 통과시킨다', () => {
      const result = createDesign.safeParse({
        body: { title: '꽃 도안', category: '자연' },
      });
      expect(result.success).toBe(true);
    });

    test('빈 title을 거부한다', () => {
      const result = createDesign.safeParse({
        body: { title: '', category: '자연' },
      });
      expect(result.success).toBe(false);
    });

    test('100자 초과 title을 거부한다', () => {
      const result = createDesign.safeParse({
        body: { title: 'a'.repeat(101), category: '자연' },
      });
      expect(result.success).toBe(false);
    });

    test('description은 선택적이다', () => {
      const result = createDesign.safeParse({
        body: { title: '꽃', category: '자연', description: '설명' },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('designParams', () => {
    test('숫자 id를 통과시킨다', () => {
      const result = designParams.safeParse({ params: { id: '3' } });
      expect(result.success).toBe(true);
      expect(result.data.params.id).toBe(3);
    });

    test('숫자가 아닌 id를 거부한다', () => {
      const result = designParams.safeParse({ params: { id: 'abc' } });
      expect(result.success).toBe(false);
    });
  });
});

describe('Theme Validators', () => {
  describe('selectTheme', () => {
    test('유효한 themeId를 통과시킨다', () => {
      const result = selectTheme.safeParse({ body: { themeId: 2 } });
      expect(result.success).toBe(true);
    });

    test('themeId 누락 시 실패한다', () => {
      const result = selectTheme.safeParse({ body: {} });
      expect(result.success).toBe(false);
    });
  });
});

describe('Gallery Validators', () => {
  describe('listGalleryArtworks', () => {
    test('기본값이 적용된다', () => {
      const result = listGalleryArtworks.safeParse({ query: {} });
      expect(result.success).toBe(true);
      expect(result.data.query).toEqual({ sort: 'recent', page: 1, size: 20 });
    });

    test('유효한 sort 옵션을 통과시킨다', () => {
      const result = listGalleryArtworks.safeParse({ query: { sort: 'popular' } });
      expect(result.success).toBe(true);
    });

    test('잘못된 sort 옵션을 거부한다', () => {
      const result = listGalleryArtworks.safeParse({ query: { sort: 'invalid' } });
      expect(result.success).toBe(false);
    });

    test('size 범위를 벗어나면 거부한다', () => {
      const result = listGalleryArtworks.safeParse({ query: { size: 100 } });
      expect(result.success).toBe(false);
    });

    test('문자열 page를 숫자로 변환한다', () => {
      const result = listGalleryArtworks.safeParse({ query: { page: '3' } });
      expect(result.success).toBe(true);
      expect(result.data.query.page).toBe(3);
    });
  });

  describe('galleryArtworkParams', () => {
    test('유효한 UUID를 통과시킨다', () => {
      const result = galleryArtworkParams.safeParse({
        params: { artworkId: '550e8400-e29b-41d4-a716-446655440000' },
      });
      expect(result.success).toBe(true);
    });

    test('잘못된 UUID를 거부한다', () => {
      const result = galleryArtworkParams.safeParse({
        params: { artworkId: 'not-a-uuid' },
      });
      expect(result.success).toBe(false);
    });
  });
});
