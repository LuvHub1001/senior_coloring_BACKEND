const isProduction = process.env.NODE_ENV === 'production';

const ACCESS_TOKEN_MAX_AGE = 60 * 60 * 1000; // 1시간
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7일

const COOKIE_BASE = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
};

const ACCESS_TOKEN_COOKIE = {
  ...COOKIE_BASE,
  path: '/',
  maxAge: ACCESS_TOKEN_MAX_AGE,
};

const REFRESH_TOKEN_COOKIE = {
  ...COOKIE_BASE,
  path: '/',
  maxAge: REFRESH_TOKEN_MAX_AGE,
};

// 토큰 쿠키 설정
function setTokenCookies(res, accessToken, refreshToken) {
  res.cookie('accessToken', accessToken, ACCESS_TOKEN_COOKIE);
  res.cookie('refreshToken', refreshToken, REFRESH_TOKEN_COOKIE);
}

// 토큰 쿠키 제거 (maxAge: 0으로 즉시 만료)
function clearTokenCookies(res) {
  res.cookie('accessToken', '', { httpOnly: true, path: '/', maxAge: 0 });
  res.cookie('refreshToken', '', { httpOnly: true, path: '/', maxAge: 0 });
}

module.exports = {
  setTokenCookies,
  clearTokenCookies,
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
};
