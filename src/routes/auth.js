const express = require('express');
const passport = require('passport');
const { generateToken } = require('../utils/jwt');

const router = express.Router();

// 로그인 성공 후 JWT 발급
function handleOAuthCallback(req, res) {
  const token = generateToken(req.user);

  // 프론트엔드로 토큰 전달 (리다이렉트 방식)
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  res.redirect(`${clientUrl}/auth/callback?token=${token}`);
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

// 로그인 실패
router.get('/failure', (req, res) => {
  res.status(401).json({ success: false, error: '로그인에 실패했습니다.' });
});

module.exports = router;
