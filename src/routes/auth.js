const express = require('express');
const passport = require('passport');
const { generateToken, generateRefreshToken, rotateTokens, revokeAllTokens } = require('../utils/jwt');
const { authenticate } = require('../middlewares/auth');
const { authLimiter } = require('../middlewares/rateLimiter');
const { validate } = require('../middlewares/validate');
const { z } = require('zod');

const router = express.Router();

// 인증 라우트에 rate limiting 적용
router.use(authLimiter);

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'refreshToken은 필수입니다.'),
  }),
});

// 로그인 성공 후 JWT + Refresh Token 발급
async function handleOAuthCallback(req, res) {
  const { isNew, ...userData } = req.user;
  const accessToken = generateToken(userData);
  const refresh = await generateRefreshToken(userData.id);

  // 프론트엔드로 토큰 전달 (리다이렉트 방식)
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  res.redirect(
    `${clientUrl}/auth/callback?token=${accessToken}&refreshToken=${refresh.token}&isNew=${isNew}`,
  );
}

// 카카오
router.get('/kakao', passport.authenticate('kakao'));
router.get(
  '/kakao/callback',
  passport.authenticate('kakao', { session: false, failureRedirect: '/api/auth/failure' }),
  handleOAuthCallback,
);

// 네이버
router.get('/naver', passport.authenticate('naver'));
router.get(
  '/naver/callback',
  passport.authenticate('naver', { session: false, failureRedirect: '/api/auth/failure' }),
  handleOAuthCallback,
);

// 토큰 갱신
router.post('/refresh', validate(refreshSchema), async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const tokens = await rotateTokens(refreshToken);

    res.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
});

// 로그아웃 (모든 refresh token 무효화)
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await revokeAllTokens(req.user.id);
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
});

// 로그인 실패
router.get('/failure', (req, res) => {
  res.status(401).json({ success: false, error: '로그인에 실패했습니다.' });
});

module.exports = router;
