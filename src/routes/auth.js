const express = require('express');
const passport = require('passport');
const { generateToken, generateRefreshToken, rotateTokens, revokeAllTokens } = require('../utils/jwt');
const { setTokenCookies, clearTokenCookies } = require('../utils/cookie');
const { authenticate } = require('../middlewares/auth');
const { authLimiter } = require('../middlewares/rateLimiter');
const logger = require('../config/logger');

const router = express.Router();

// 인증 라우트에 rate limiting 적용
router.use(authLimiter);

// 프론트엔드 콜백 URL 생성 헬퍼
function getClientCallbackUrl() {
  return (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim() + '/auth/callback';
}

// 에러 리다이렉트 헬퍼
function redirectWithError(res, errorCode, errorMessage) {
  const callbackUrl = getClientCallbackUrl();
  const encodedMessage = encodeURIComponent(errorMessage);
  res.redirect(`${callbackUrl}?error=${errorCode}&error_message=${encodedMessage}`);
}

// OAuth 에러 분류
function classifyOAuthError(err, info) {
  if (info?.message?.includes('cancel') || info?.message?.includes('denied') ||
      err?.message?.includes('cancel') || err?.message?.includes('denied') ||
      info?.message?.includes('access_denied') || err?.code === 'access_denied') {
    return { code: 'user_cancelled', message: '' };
  }

  if (err?.code === 'ECONNREFUSED' || err?.code === 'ETIMEDOUT' || err?.code === 'ENOTFOUND' ||
      err?.statusCode >= 500) {
    return { code: 'provider_unavailable', message: '로그인 서비스에 일시적인 문제가 발생했습니다' };
  }

  if (info || err?.statusCode === 401 || err?.statusCode === 403) {
    return { code: 'auth_failed', message: '로그인 인증에 실패했습니다' };
  }

  return { code: 'server_error', message: '서버에 문제가 발생했습니다' };
}

// OAuth 콜백 핸들러 생성 (provider별 공통)
function createOAuthCallbackHandler(provider) {
  return (req, res, next) => {
    passport.authenticate(provider, { session: false }, async (err, user, info) => {
      if (err || !user) {
        const classified = classifyOAuthError(err, info);
        logger.warn('OAuth 인증 실패', {
          provider,
          errorCode: classified.code,
          errMessage: err?.message,
          infoMessage: info?.message,
        });

        if (classified.code === 'user_cancelled') {
          return res.redirect(`${getClientCallbackUrl()}?error=user_cancelled`);
        }
        return redirectWithError(res, classified.code, classified.message);
      }

      // 인증 성공 → 토큰을 httpOnly 쿠키로 설정 후 프론트로 리다이렉트
      try {
        const { isNew, ...userData } = user;
        const accessToken = generateToken(userData);
        const refresh = await generateRefreshToken(userData.id);

        setTokenCookies(res, accessToken, refresh.token);

        const callbackUrl = getClientCallbackUrl();
        res.redirect(`${callbackUrl}?isNew=${isNew}`);
      } catch (tokenErr) {
        logger.error('OAuth 토큰 발급 실패', {
          provider,
          userId: user?.id,
          error: tokenErr.message,
        });
        redirectWithError(res, 'server_error', '서버에 문제가 발생했습니다');
      }
    })(req, res, next);
  };
}

// 카카오
router.get('/kakao', passport.authenticate('kakao'));
router.get('/kakao/callback', createOAuthCallbackHandler('kakao'));

// 네이버
router.get('/naver', passport.authenticate('naver'));
router.get('/naver/callback', createOAuthCallbackHandler('naver'));

// 토큰 갱신 (쿠키 기반 — refreshToken 쿠키에서 읽고, 새 토큰을 쿠키로 설정)
router.post('/refresh', async (req, res, next) => {
  try {
    // 쿠키 우선, body fallback (전환 기간 호환)
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!refreshToken) {
      return res.status(400).json({ success: false, error: 'refreshToken은 필수입니다.' });
    }

    const tokens = await rotateTokens(refreshToken);

    setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

    res.json({
      success: true,
      data: { message: '토큰이 갱신되었습니다.' },
    });
  } catch (err) {
    // 토큰 재사용 감지 시 쿠키도 제거
    if (err.statusCode === 401) {
      clearTokenCookies(res);
    }
    next(err);
  }
});

// E2E 테스트 전용 로그인 (프로덕션 비활성화)
const TEST_ALLOWED_EMAILS = ['e2e-test@artispace.co.kr', 'admin@artispace.co.kr'];

router.post('/test-login', async (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ success: false, error: 'Not Found' });
  }

  try {
    const { email } = req.body;

    if (!email || !TEST_ALLOWED_EMAILS.includes(email)) {
      return res.status(403).json({ success: false, error: '허용되지 않은 테스트 계정입니다.' });
    }

    const prisma = require('../config/prisma');
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: '테스트 계정이 등록되지 않았습니다. prisma db seed를 실행해주세요.' });
    }

    const accessToken = generateToken(user);
    const refresh = await generateRefreshToken(user.id);

    setTokenCookies(res, accessToken, refresh.token);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// 로그아웃 (모든 refresh token 무효화 + 쿠키 제거)
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await revokeAllTokens(req.user.id);
    clearTokenCookies(res);
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
