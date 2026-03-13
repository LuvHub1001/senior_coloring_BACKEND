const express = require('express');
const passport = require('passport');
const { generateToken, generateRefreshToken, rotateTokens, revokeAllTokens } = require('../utils/jwt');
const { authenticate } = require('../middlewares/auth');
const { authLimiter } = require('../middlewares/rateLimiter');
const { validate } = require('../middlewares/validate');
const { z } = require('zod');
const logger = require('../config/logger');

const router = express.Router();

// 인증 라우트에 rate limiting 적용
router.use(authLimiter);

const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, 'refreshToken은 필수입니다.'),
  }),
});

// 프론트엔드 콜백 URL 생성 헬퍼
function getClientCallbackUrl() {
  return (process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].trim() + '/auth/callback';
}

// 에러 리다이렉트 헬퍼
function redirectWithError(res, errorCode, errorMessage) {
  const callbackUrl = getClientCallbackUrl();
  const encodedMessage = encodeURIComponent(errorMessage);
  res.redirect(`${callbackUrl}#error=${errorCode}&error_message=${encodedMessage}`);
}

// OAuth 에러 분류
function classifyOAuthError(err, info) {
  // 사용자가 동의 화면에서 취소한 경우
  if (info?.message?.includes('cancel') || info?.message?.includes('denied') ||
      err?.message?.includes('cancel') || err?.message?.includes('denied') ||
      info?.message?.includes('access_denied') || err?.code === 'access_denied') {
    return { code: 'user_cancelled', message: '' };
  }

  // provider 측 장애 (네트워크/타임아웃/5xx)
  if (err?.code === 'ECONNREFUSED' || err?.code === 'ETIMEDOUT' || err?.code === 'ENOTFOUND' ||
      err?.statusCode >= 500) {
    return { code: 'provider_unavailable', message: '로그인 서비스에 일시적인 문제가 발생했습니다' };
  }

  // 인증 실패 (토큰 교환 실패, 잘못된 코드 등)
  if (info || err?.statusCode === 401 || err?.statusCode === 403) {
    return { code: 'auth_failed', message: '로그인 인증에 실패했습니다' };
  }

  // 그 외 서버 에러
  return { code: 'server_error', message: '서버에 문제가 발생했습니다' };
}

// OAuth 콜백 핸들러 생성 (provider별 공통)
function createOAuthCallbackHandler(provider) {
  return (req, res, next) => {
    passport.authenticate(provider, { session: false }, async (err, user, info) => {
      // 에러 또는 인증 실패
      if (err || !user) {
        const classified = classifyOAuthError(err, info);
        logger.warn('OAuth 인증 실패', {
          provider,
          errorCode: classified.code,
          errMessage: err?.message,
          infoMessage: info?.message,
        });

        if (classified.code === 'user_cancelled') {
          return res.redirect(`${getClientCallbackUrl()}#error=user_cancelled`);
        }
        return redirectWithError(res, classified.code, classified.message);
      }

      // 인증 성공 → 토큰 발급
      try {
        const { isNew, ...userData } = user;
        const accessToken = generateToken(userData);
        const refresh = await generateRefreshToken(userData.id);

        const callbackUrl = getClientCallbackUrl();
        res.redirect(
          `${callbackUrl}#token=${accessToken}&refreshToken=${refresh.token}&isNew=${isNew}`,
        );
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

module.exports = router;
