require('./setup');

const { authenticate, optionalAuth } = require('../src/middlewares/auth');
const { generateToken } = require('../src/utils/jwt');

function createMockReqRes({ authHeader, cookies } = {}) {
  const req = {
    headers: authHeader ? { authorization: authHeader } : {},
    cookies: cookies || {},
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next };
}

describe('authenticate 미들웨어', () => {
  const validUser = { id: 'user-123', email: 'test@example.com' };

  test('유효한 Bearer 토큰이면 req.user를 설정하고 next()를 호출한다', () => {
    const token = generateToken(validUser);
    const { req, res, next } = createMockReqRes({ authHeader: `Bearer ${token}` });

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe(validUser.id);
    expect(req.user.email).toBe(validUser.email);
  });

  test('httpOnly 쿠키의 토큰으로 인증한다', () => {
    const token = generateToken(validUser);
    const { req, res, next } = createMockReqRes({ cookies: { accessToken: token } });

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.id).toBe(validUser.id);
  });

  test('쿠키와 Bearer 헤더가 모두 있으면 쿠키를 우선한다', () => {
    const cookieUser = { id: 'cookie-user', email: 'cookie@test.com' };
    const headerUser = { id: 'header-user', email: 'header@test.com' };
    const { req, res, next } = createMockReqRes({
      cookies: { accessToken: generateToken(cookieUser) },
      authHeader: `Bearer ${generateToken(headerUser)}`,
    });

    authenticate(req, res, next);

    expect(req.user.id).toBe('cookie-user');
  });

  test('Authorization 헤더가 없으면 401을 반환한다', () => {
    const { req, res, next } = createMockReqRes();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: '인증이 필요합니다.' }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('Bearer 접두사가 없으면 401을 반환한다', () => {
    const token = generateToken(validUser);
    const { req, res, next } = createMockReqRes({ authHeader: `Basic ${token}` });

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
  });

  test('빈 Bearer 값이면 401을 반환한다', () => {
    const { req, res, next } = createMockReqRes({ authHeader: 'Bearer ' });

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('잘못된 토큰이면 401을 반환한다', () => {
    const { req, res, next } = createMockReqRes({ authHeader: 'Bearer invalid-token' });

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: '유효하지 않은 토큰입니다.' }),
    );
  });

  test('만료된 토큰이면 401을 반환한다', () => {
    const jwt = require('jsonwebtoken');
    const expiredToken = jwt.sign(
      { id: validUser.id, email: validUser.email },
      process.env.JWT_SECRET,
      { expiresIn: '0s' },
    );
    const { req, res, next } = createMockReqRes({ authHeader: `Bearer ${expiredToken}` });

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('optionalAuth 미들웨어', () => {
  const validUser = { id: 'user-123', email: 'test@example.com' };

  test('토큰이 없으면 req.user를 null로 설정하고 next()를 호출한다', () => {
    const { req, res, next } = createMockReqRes();

    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeNull();
  });

  test('유효한 쿠키 토큰이면 req.user를 설정한다', () => {
    const token = generateToken(validUser);
    const { req, res, next } = createMockReqRes({ cookies: { accessToken: token } });

    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user.id).toBe(validUser.id);
  });

  test('잘못된 토큰이면 req.user를 null로 설정하고 계속 진행한다', () => {
    const { req, res, next } = createMockReqRes({ cookies: { accessToken: 'invalid' } });

    optionalAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeNull();
  });
});
