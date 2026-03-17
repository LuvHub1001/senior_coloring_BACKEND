const { verifyToken } = require('../utils/jwt');
const prisma = require('../config/prisma');
const logger = require('../config/logger');

// 요청에서 access token 추출 (쿠키 우선, Bearer 헤더 fallback)
function extractToken(req) {
  // 1. httpOnly 쿠키
  if (req.cookies?.token) {
    return req.cookies.token;
  }
  // 2. Authorization: Bearer (전환 기간 호환)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return null;
}

const authenticate = (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ success: false, error: '인증이 필요합니다.' });
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: '유효하지 않은 토큰입니다.' });
  }
};

// 선택적 인증: 토큰이 있으면 파싱하고, 없어도 통과
const optionalAuth = (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
  } catch {
    req.user = null;
  }

  next();
};

// 관리자 권한 검증 (authenticate 이후에 사용)
// JWT 토큰의 role + DB 실시간 확인 이중 검증
const requireAdmin = async (req, res, next) => {
  // 1차: 토큰 기반 빠른 거부 (DB 조회 없이 비관리자 차단)
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: '관리자 권한이 필요합니다.',
      },
    });
  }

  try {
    // 2차: DB에서 현재 role 실시간 확인 (권한 해제 즉시 반영)
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true },
    });

    if (!user || user.role !== 'ADMIN') {
      logger.warn('토큰의 role과 DB role 불일치 — 관리자 접근 거부', {
        userId: req.user.id,
        tokenRole: req.user.role,
        dbRole: user?.role || 'NOT_FOUND',
      });
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '관리자 권한이 필요합니다.',
        },
      });
    }

    next();
  } catch (err) {
    logger.error('관리자 권한 DB 확인 중 오류', { userId: req.user.id, error: err.message });
    next(err);
  }
};

module.exports = { authenticate, optionalAuth, requireAdmin };
