const { verifyToken } = require('../utils/jwt');

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

module.exports = { authenticate, optionalAuth };
