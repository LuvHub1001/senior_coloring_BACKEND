const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../config/prisma');

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
async function generateRefreshToken(userId) {
  const token = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: { token, userId, expiresAt },
  });

  return { token, expiresAt };
}

// Refresh Token 검증 및 새 토큰 쌍 발급
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

  if (stored.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { id: stored.id } });
    const error = new Error('만료된 refresh token입니다.');
    error.statusCode = 401;
    throw error;
  }

  // 기존 토큰 삭제 (rotation)
  await prisma.refreshToken.delete({ where: { id: stored.id } });

  // 새 토큰 쌍 발급
  const accessToken = generateToken(stored.user);
  const newRefresh = await generateRefreshToken(stored.userId);

  return { accessToken, refreshToken: newRefresh.token, expiresAt: newRefresh.expiresAt };
}

// 유저의 모든 Refresh Token 삭제 (로그아웃)
async function revokeAllTokens(userId) {
  await prisma.refreshToken.deleteMany({ where: { userId } });
}

// 만료된 Refresh Token 정리
async function cleanupExpiredTokens() {
  const { count } = await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
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
