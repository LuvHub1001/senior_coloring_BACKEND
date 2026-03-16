require('../setup');

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => require('../helpers/prisma-mock')),
}));

jest.mock('../../src/config/passport', () => {
  const passport = require('passport');
  return passport;
});

jest.mock('../../src/config/supabase', () => ({
  storage: { from: jest.fn() },
}));

// SSRF 방어 DNS lookup 모킹 (테스트 도메인은 외부 IP로 해석)
jest.mock('dns', () => ({
  promises: {
    lookup: jest.fn().mockResolvedValue({ address: '54.230.1.1', family: 4 }),
  },
}));

const request = require('supertest');
const sharp = require('sharp');
const app = require('../../src/app');

const originalFetch = global.fetch;
const SUPABASE_URL = process.env.SUPABASE_URL;

// 테스트용 실제 이미지 생성 (100x100 빨간 PNG)
async function createTestImage(width = 100, height = 100) {
  return sharp({
    create: { width, height, channels: 3, background: { r: 255, g: 0, b: 0 } },
  }).png().toBuffer();
}

describe('GET /api/images/proxy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  test('유효한 Supabase URL로 이미지를 프록시한다', async () => {
    const fakeImage = Buffer.from('fake-image-data');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: (key) => ({ 'content-type': 'image/png', 'content-length': '15' }[key] || null) },
      body: (async function* () { yield fakeImage; })(),
    });

    const url = `${SUPABASE_URL}/storage/v1/object/public/artworks/test.png`;
    const res = await request(app)
      .get('/api/images/proxy')
      .query({ url });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('image/png');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['cache-control']).toContain('max-age=3600');
  });

  test('url 파라미터 누락 시 400을 반환한다', async () => {
    const res = await request(app).get('/api/images/proxy');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('Supabase 이외 URL은 거부한다', async () => {
    const res = await request(app)
      .get('/api/images/proxy')
      .query({ url: 'https://evil.com/hack.png' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('SSRF 우회 시도를 거부한다 (Supabase URL을 쿼리에 포함)', async () => {
    const res = await request(app)
      .get('/api/images/proxy')
      .query({ url: `https://evil.com?redirect=${SUPABASE_URL}/test.png` });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('잘못된 URL 형식은 거부한다', async () => {
    const res = await request(app)
      .get('/api/images/proxy')
      .query({ url: 'not-a-url' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('원본 서버 오류 시 해당 상태코드를 반환한다', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: { get: () => null },
    });

    const url = `${SUPABASE_URL}/storage/v1/object/public/artworks/missing.png`;
    const res = await request(app)
      .get('/api/images/proxy')
      .query({ url });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('이미지가 아닌 Content-Type은 거부한다', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: (key) => ({ 'content-type': 'text/html', 'content-length': '100' }[key] || null) },
      arrayBuffer: () => Promise.resolve(Buffer.from('<html>').buffer),
    });

    const url = `${SUPABASE_URL}/storage/v1/object/public/artworks/evil.html`;
    const res = await request(app)
      .get('/api/images/proxy')
      .query({ url });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('허용되지 않는 파일 형식입니다.');
  });
});

describe('GET /api/images/proxy (리사이즈)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  function mockFetchWithImage(imageBuffer) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: (key) => ({
          'content-type': 'image/png',
          'content-length': String(imageBuffer.length),
        }[key] || null),
      },
      body: (async function* () { yield imageBuffer; })(),
    });
  }

  test('w 파라미터로 이미지를 리사이즈한다', async () => {
    const testImage = await createTestImage(400, 400);
    mockFetchWithImage(testImage);

    const url = `${SUPABASE_URL}/storage/v1/object/public/artworks/test.png`;
    const res = await request(app)
      .get('/api/images/proxy')
      .query({ url, w: 200 });

    expect(res.status).toBe(200);
    // 리사이즈된 이미지 크기 검증
    const metadata = await sharp(res.body).metadata();
    expect(metadata.width).toBe(200);
    // 비율 유지 확인
    expect(metadata.height).toBe(200);
    // 리사이즈 시 7일 캐싱
    expect(res.headers['cache-control']).toContain('max-age=604800');
  });

  test('f=webp로 포맷을 변환한다', async () => {
    const testImage = await createTestImage(100, 100);
    mockFetchWithImage(testImage);

    const url = `${SUPABASE_URL}/storage/v1/object/public/artworks/test.png`;
    const res = await request(app)
      .get('/api/images/proxy')
      .query({ url, f: 'webp' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/webp');
    const metadata = await sharp(res.body).metadata();
    expect(metadata.format).toBe('webp');
  });

  test('w + q + f 조합으로 리사이즈 + 품질 + 포맷 변환한다', async () => {
    const testImage = await createTestImage(400, 300);
    mockFetchWithImage(testImage);

    const url = `${SUPABASE_URL}/storage/v1/object/public/artworks/test.png`;
    const res = await request(app)
      .get('/api/images/proxy')
      .query({ url, w: 200, q: 60, f: 'webp' });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/webp');
    const metadata = await sharp(res.body).metadata();
    expect(metadata.width).toBe(200);
    // 비율 유지: 400:300 = 200:150
    expect(metadata.height).toBe(150);
  });

  test('withoutEnlargement: 원본보다 큰 너비를 지정해도 확대하지 않는다', async () => {
    const testImage = await createTestImage(100, 100);
    mockFetchWithImage(testImage);

    const url = `${SUPABASE_URL}/storage/v1/object/public/artworks/test.png`;
    const res = await request(app)
      .get('/api/images/proxy')
      .query({ url, w: 500 });

    expect(res.status).toBe(200);
    const metadata = await sharp(res.body).metadata();
    expect(metadata.width).toBe(100);
  });

  test('잘못된 w 값은 400을 반환한다', async () => {
    const url = `${SUPABASE_URL}/storage/v1/object/public/artworks/test.png`;
    const res = await request(app)
      .get('/api/images/proxy')
      .query({ url, w: 0 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('허용되지 않는 포맷은 400을 반환한다', async () => {
    const url = `${SUPABASE_URL}/storage/v1/object/public/artworks/test.png`;
    const res = await request(app)
      .get('/api/images/proxy')
      .query({ url, f: 'gif' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('SVG 파일은 리사이즈 파라미터가 있어도 원본을 그대로 프록시한다', async () => {
    const svgContent = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect fill="red" width="400" height="400"/></svg>');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: (key) => ({
          'content-type': 'image/svg+xml',
          'content-length': String(svgContent.length),
        }[key] || null),
      },
      body: (async function* () { yield svgContent; })(),
    });

    const url = `${SUPABASE_URL}/storage/v1/object/public/designs/test.svg`;
    const res = await request(app)
      .get('/api/images/proxy')
      .query({ url, w: 100, f: 'webp' });

    expect(res.status).toBe(200);
    // SVG는 변환 없이 원본 Content-Type 유지
    expect(res.headers['content-type']).toContain('image/svg+xml');
  });

  test('리사이즈 파라미터 없으면 원본을 그대로 반환한다', async () => {
    const testImage = await createTestImage(100, 100);
    mockFetchWithImage(testImage);

    const url = `${SUPABASE_URL}/storage/v1/object/public/artworks/test.png`;
    const res = await request(app)
      .get('/api/images/proxy')
      .query({ url });

    expect(res.status).toBe(200);
    // 원본은 1시간 캐싱
    expect(res.headers['cache-control']).toContain('max-age=3600');
  });
});
