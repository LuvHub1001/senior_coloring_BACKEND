const rateLimit = require('express-rate-limit');

// 일반 API: 15분당 100회
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.' },
});

// 인증 관련: 15분당 20회 (브루트포스 방지)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.' },
});

// 파일 업로드: 15분당 30회
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: '업로드 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
});

module.exports = { apiLimiter, authLimiter, uploadLimiter };
