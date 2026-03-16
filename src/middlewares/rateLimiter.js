const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV !== 'production';

// 일반 API: 프로덕션 15분당 300회, 개발 15분당 1000회
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.' },
});

// 인증 관련: 프로덕션 15분당 30회, 개발 15분당 200회
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 200 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.' },
});

// 파일 업로드: 프로덕션 15분당 50회, 개발 15분당 200회
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 200 : 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: '업로드 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
});

// 이미지 프록시: 프로덕션 15분당 200회, 개발 15분당 500회
// (갤러리 무한스크롤 20개/페이지 + 리사이즈 요청 대응)
const proxyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 500 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: '이미지 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
});

module.exports = { apiLimiter, authLimiter, uploadLimiter, proxyLimiter };
