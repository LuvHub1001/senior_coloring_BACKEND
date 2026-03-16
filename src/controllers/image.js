const sharp = require('sharp');
const dns = require('dns').promises;
const logger = require('../config/logger');
const { allowedOrigins } = require('../config/cors');

// SSRF 방어: 내부 네트워크 IP 대역 차단
const INTERNAL_IP_PATTERNS = [
  /^127\./,                          // loopback
  /^10\./,                           // Class A private
  /^172\.(1[6-9]|2[0-9]|3[01])\./,  // Class B private
  /^192\.168\./,                     // Class C private
  /^169\.254\./,                     // link-local
  /^0\./,                            // current network
  /^::1$/,                           // IPv6 loopback
  /^f[cd][0-9a-f]{2}:/i,            // IPv6 unique local (fc00::/7)
  /^fe80:/i,                         // IPv6 link-local
];

function isInternalIp(ip) {
  return INTERNAL_IP_PATTERNS.some((pattern) => pattern.test(ip));
}

async function validateNotInternalIp(urlString) {
  const { hostname } = new URL(urlString);
  const { address } = await dns.lookup(hostname);
  if (isInternalIp(address)) {
    const error = new Error('내부 네트워크 접근이 차단되었습니다.');
    error.status = 403;
    throw error;
  }
}

const ALLOWED_CONTENT_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
];

const FORMAT_CONTENT_TYPE = {
  webp: 'image/webp',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const FETCH_TIMEOUT = 10000; // 10초
const MAX_INPUT_PIXELS = 100 * 1024 * 1024; // 1억 픽셀 (10000x10000) - 이미지 폭탄 방지

// 리사이즈된 이미지는 장시간 캐싱 (7일), 원본 프록시는 1시간
const RESIZE_CACHE_MAX_AGE = 7 * 24 * 3600;
const PROXY_CACHE_MAX_AGE = 3600;

/**
 * 이미지 리사이즈 처리
 * @param {Buffer} buffer - 원본 이미지 버퍼
 * @param {Object} options - { w, q, f }
 * @returns {Promise<{ data: Buffer, contentType: string }>}
 */
async function resizeImage(buffer, { w, q, f }) {
  let pipeline = sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS });

  if (w) {
    pipeline = pipeline.resize(w, null, { withoutEnlargement: true });
  }

  if (f) {
    pipeline = pipeline.toFormat(f, { quality: q });
  } else if (q !== undefined) {
    // 포맷 변환 없이 품질만 조정 시, 원본 포맷 유지
    const metadata = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
    const format = metadata.format;
    if (['jpeg', 'webp', 'png'].includes(format)) {
      pipeline = pipeline.toFormat(format, { quality: q });
    }
  }

  const data = await pipeline.toBuffer();
  const contentType = f ? FORMAT_CONTENT_TYPE[f] : null;
  return { data, contentType };
}

// 이미지 프록시 (Supabase Storage CORS 우회 + 리사이징)
async function proxy(req, res, next) {
  try {
    const { url, f } = req.query;
    const w = req.query.w != null ? Number(req.query.w) : undefined;
    const q = req.query.q != null ? Number(req.query.q) : 80;
    const needsResize = w || f || q !== 80;

    // SSRF 방어: DNS 해석 후 내부 IP 여부 확인
    await validateNotInternalIp(url);

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

    let buffer = Buffer.concat(chunks);
    let outputContentType = contentType;
    let cacheMaxAge = PROXY_CACHE_MAX_AGE;

    // 리사이즈 처리 (SVG는 벡터 포맷이므로 리사이징 불필요, 그대로 프록시)
    const isSvg = contentType.startsWith('image/svg+xml');
    if (needsResize && !isSvg) {
      const result = await resizeImage(buffer, { w, q, f });
      buffer = result.data;
      if (result.contentType) {
        outputContentType = result.contentType;
      }
      cacheMaxAge = RESIZE_CACHE_MAX_AGE;
    }

    const requestOrigin = req.headers.origin;
    const corsOrigin = allowedOrigins.includes(requestOrigin) ? requestOrigin : allowedOrigins[0];

    const headers = {
      'Content-Type': outputContentType,
      'Content-Length': buffer.length,
      'Cache-Control': `public, max-age=${cacheMaxAge}`,
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET',
      'X-Content-Type-Options': 'nosniff',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Vary': 'Accept',
    };

    // SVG XSS 방지: 스크립트 실행 차단 CSP 헤더 추가
    if (isSvg) {
      headers['Content-Security-Policy'] = "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:";
    }

    res.set(headers);

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

module.exports = { proxy, resizeImage };
