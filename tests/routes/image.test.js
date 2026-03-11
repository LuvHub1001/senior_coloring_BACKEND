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

const request = require('supertest');
const app = require('../../src/app');

const originalFetch = global.fetch;
const SUPABASE_URL = process.env.SUPABASE_URL;

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
      arrayBuffer: () => Promise.resolve(fakeImage.buffer),
    });

    const url = `${SUPABASE_URL}/storage/v1/object/public/artworks/test.png`;
    const res = await request(app)
      .get('/api/images/proxy')
      .query({ url });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('image/png');
    expect(res.headers['access-control-allow-origin']).toBe('*');
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
