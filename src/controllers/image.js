const logger = require('../config/logger');

const ALLOWED_CONTENT_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

// 이미지 프록시 (Supabase Storage CORS 우회)
async function proxy(req, res, next) {
  try {
    const { url } = req.query;

    const response = await fetch(url);

    if (!response.ok) {
      logger.warn('이미지 프록시 실패', { url, status: response.status });
      return res.status(response.status).json({
        success: false,
        error: '이미지를 불러올 수 없습니다.',
      });
    }

    // Content-Type 검증 (이미지만 허용)
    const contentType = response.headers.get('content-type');
    if (!contentType || !ALLOWED_CONTENT_TYPES.some((t) => contentType.startsWith(t))) {
      logger.warn('이미지 프록시 비허용 Content-Type', { url, contentType });
      return res.status(400).json({
        success: false,
        error: '허용되지 않는 파일 형식입니다.',
      });
    }

    // 응답 크기 제한 검증
    const contentLength = Number(response.headers.get('content-length'));
    if (contentLength > MAX_IMAGE_SIZE) {
      logger.warn('이미지 프록시 크기 초과', { url, contentLength });
      return res.status(413).json({
        success: false,
        error: '이미지 크기가 너무 큽니다.',
      });
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Content-Length 헤더 없는 경우 버퍼 크기로 재검증
    if (buffer.length > MAX_IMAGE_SIZE) {
      logger.warn('이미지 프록시 크기 초과', { url, size: buffer.length });
      return res.status(413).json({
        success: false,
        error: '이미지 크기가 너무 큽니다.',
      });
    }

    res.set({
      'Content-Type': contentType,
      'Content-Length': buffer.length,
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
    });

    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

module.exports = { proxy };
