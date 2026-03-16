const isProduction = process.env.NODE_ENV === 'production';

const ACCESS_TOKEN_MAX_AGE = 60 * 60 * 1000; // 1시간
const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30일

const COOKIE_BASE = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax', // 같은 사이트(artispace.co.kr) 내 크로스 오리진 대응 + CSRF 방어
};

const ACCESS_TOKEN_COOKIE = {
  ...COOKIE_BASE,
  path: '/',
  maxAge: ACCESS_TOKEN_MAX_AGE,
};

const REFRESH_TOKEN_COOKIE = {
  ...COOKIE_BASE,
  path: '/api/auth',
  maxAge: REFRESH_TOKEN_MAX_AGE,
};

// 토큰 쿠키 설정
function setTokenCookies(res, accessToken, refreshToken) {
  res.cookie('token', accessToken, ACCESS_TOKEN_COOKIE);
  res.cookie('refreshToken', refreshToken, REFRESH_TOKEN_COOKIE);
}

// 토큰 쿠키 제거
function clearTokenCookies(res) {
  res.clearCookie('token', { path: ACCESS_TOKEN_COOKIE.path });
  res.clearCookie('refreshToken', { path: REFRESH_TOKEN_COOKIE.path });
}

module.exports = {
  setTokenCookies,
  clearTokenCookies,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
};
