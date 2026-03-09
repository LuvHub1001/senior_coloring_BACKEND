require('./setup');

const { authenticate } = require('../src/middlewares/auth');
const { generateToken } = require('../src/utils/jwt');

function createMockReqRes(authHeader) {
  const req = {
    headers: authHeader ? { authorization: authHeader } : {},
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
    const { req, res, next } = createMockReqRes(`Bearer ${token}`);

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.id).toBe(validUser.id);
    expect(req.user.email).toBe(validUser.email);
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
    const { req, res, next } = createMockReqRes(`Basic ${token}`);

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
  });

  test('빈 Bearer 값이면 401을 반환한다', () => {
    const { req, res, next } = createMockReqRes('Bearer ');

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('잘못된 토큰이면 401을 반환한다', () => {
    const { req, res, next } = createMockReqRes('Bearer invalid-token');

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
    const { req, res, next } = createMockReqRes(`Bearer ${expiredToken}`);

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});
