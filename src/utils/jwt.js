const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const logger = require('../config/logger');

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRES_IN = '1h';
const REFRESH_TOKEN_EXPIRES_DAYS = 30;

// Access Token 생성 (단기)
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN, algorithm: 'HS256' },
  );
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
}

// Refresh Token 생성 (장기, DB 저장)
async function generateRefreshToken(userId, family) {
  const token = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt,
      family: family || crypto.randomUUID(),
    },
  });

  return { token, expiresAt };
}

// Refresh Token 검증 및 새 토큰 쌍 발급 (재사용 감지 포함)
async function rotateTokens(refreshToken) {
  const stored = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  if (!stored) {
    const error = new Error('유효하지 않은 refresh token입니다.');
    error.statusCode = 401;
    throw error;
  }

  // 재사용 감지: 이미 사용된 토큰으로 요청 → 탈취 의심 → 전체 세션 강제 만료
  if (stored.usedAt) {
    logger.warn('Refresh token 재사용 감지 — 전체 세션 강제 만료', {
      userId: stored.userId,
      family: stored.family,
      usedAt: stored.usedAt,
    });
    await prisma.refreshToken.deleteMany({ where: { userId: stored.userId } });
    const error = new Error('비정상적인 토큰 사용이 감지되어 모든 세션이 만료되었습니다.');
    error.statusCode = 401;
    throw error;
  }

  if (stored.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { id: stored.id } });
    const error = new Error('만료된 refresh token입니다.');
    error.statusCode = 401;
    throw error;
  }

  // 기존 토큰을 '사용됨'으로 마킹 (삭제하지 않음 — 재사용 감지에 필요)
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { usedAt: new Date() },
  });

  // 같은 family로 새 토큰 쌍 발급
  const accessToken = generateToken(stored.user);
  const newRefresh = await generateRefreshToken(stored.userId, stored.family);

  return { accessToken, refreshToken: newRefresh.token, expiresAt: newRefresh.expiresAt };
}

// 유저의 모든 Refresh Token 삭제 (로그아웃)
async function revokeAllTokens(userId) {
  await prisma.refreshToken.deleteMany({ where: { userId } });
}

// 만료 및 사용 완료된 Refresh Token 정리
async function cleanupExpiredTokens() {
  const { count } = await prisma.refreshToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        // 사용된 토큰은 7일 후 정리 (재사용 감지 기간)
        { usedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      ],
    },
  });
  return count;
}

module.exports = {
  generateToken,
  verifyToken,
  generateRefreshToken,
  rotateTokens,
  revokeAllTokens,
  cleanupExpiredTokens,
};
