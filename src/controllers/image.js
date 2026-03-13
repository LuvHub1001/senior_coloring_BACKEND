const logger = require('../config/logger');

const ALLOWED_CONTENT_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const FETCH_TIMEOUT = 10000; // 10초

// 이미지 프록시 (Supabase Storage CORS 우회)
async function proxy(req, res, next) {
  try {
    const { url } = req.query;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });

    if (!response.ok) {
      logger.warn('이미지 프록시 실패', { status: response.status });
      return res.status(response.status).json({
        success: false,
        error: '이미지를 불러올 수 없습니다.',
      });
    }

    // Content-Type 검증 (이미지만 허용, SVG 제외)
    const contentType = response.headers.get('content-type');
    if (!contentType || !ALLOWED_CONTENT_TYPES.some((t) => contentType.startsWith(t))) {
      logger.warn('이미지 프록시 비허용 Content-Type', { contentType });
      return res.status(400).json({
        success: false,
        error: '허용되지 않는 파일 형식입니다.',
      });
    }

    // Content-Length 사전 검증
    const contentLength = Number(response.headers.get('content-length'));
    if (contentLength > MAX_IMAGE_SIZE) {
      return res.status(413).json({
        success: false,
        error: '이미지 크기가 너무 큽니다.',
      });
    }

    // 스트리밍 방식 크기 검증 (Content-Length 헤더 없는 경우 대비)
    const chunks = [];
    let totalSize = 0;

    for await (const chunk of response.body) {
      totalSize += chunk.length;
      if (totalSize > MAX_IMAGE_SIZE) {
        return res.status(413).json({
          success: false,
          error: '이미지 크기가 너무 큽니다.',
        });
      }
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);

    const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
      .split(',')
      .map((o) => o.trim());
    const requestOrigin = req.headers.origin;
    const corsOrigin = allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0];

    res.set({
      'Content-Type': contentType,
      'Content-Length': buffer.length,
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET',
      'X-Content-Type-Options': 'nosniff',
    });

    res.send(buffer);
  } catch (err) {
    if (err.name === 'TimeoutError') {
      return res.status(504).json({
        success: false,
        error: '이미지 요청 시간이 초과되었습니다.',
      });
    }
    next(err);
  }
}

module.exports = { proxy };
