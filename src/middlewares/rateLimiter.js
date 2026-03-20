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

// 관리자 조회: 프로덕션 15분당 100회, 개발 15분당 500회 (사용자 ID 기반)
// admin 라우트는 authenticate 이후에만 도달하므로 req.user.id가 항상 존재
const adminReadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 500 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `admin:read:${req.user.id}`,
  message: { success: false, error: '관리자 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
});

// 관리자 변경(생성/수정/삭제): 프로덕션 15분당 30회, 개발 15분당 200회 (사용자 ID 기반)
const adminWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 200 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `admin:write:${req.user.id}`,
  message: { success: false, error: '관리자 변경 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
});

// 토큰 갱신 전용: 프로덕션 15분당 60회, 개발 15분당 200회 (IP 기반)
// 정상 사용 시 1시간당 1회이므로 60회/15분은 충분한 여유
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 200 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: '토큰 갱신 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
});

// 커뮤니티 액션(좋아요/신고/팔로우): 프로덕션 15분당 100회, 개발 15분당 300회
// authenticate 이후에만 도달하므로 req.user.id가 항상 존재
const actionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 300 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `action:${req.user.id}`,
  message: { success: false, error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
});

module.exports = {
  apiLimiter, authLimiter, uploadLimiter, proxyLimiter,
  adminReadLimiter, adminWriteLimiter, refreshLimiter, actionLimiter,
};
