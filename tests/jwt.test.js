require('./setup');

const jwt = require('jsonwebtoken');
const { generateToken, verifyToken } = require('../src/utils/jwt');

describe('JWT 유틸리티', () => {
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  describe('generateToken', () => {
    test('유효한 JWT 토큰을 생성한다', () => {
      const token = generateToken(mockUser);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    test('토큰에 id와 email이 포함된다', () => {
      const token = generateToken(mockUser);
      const decoded = jwt.decode(token);
      expect(decoded.id).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
    });

    test('토큰에 만료시간(exp)이 설정된다', () => {
      const token = generateToken(mockUser);
      const decoded = jwt.decode(token);
      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });

    test('토큰 만료시간이 1시간이다', () => {
      const token = generateToken(mockUser);
      const decoded = jwt.decode(token);
      const diffSeconds = decoded.exp - decoded.iat;
      expect(diffSeconds).toBe(3600);
    });

    test('민감 정보(password 등)는 토큰에 포함하지 않는다', () => {
      const userWithPassword = { ...mockUser, password: 'secret123' };
      const token = generateToken(userWithPassword);
      const decoded = jwt.decode(token);
      expect(decoded.password).toBeUndefined();
    });
  });

  describe('verifyToken', () => {
    test('유효한 토큰을 검증한다', () => {
      const token = generateToken(mockUser);
      const decoded = verifyToken(token);
      expect(decoded.id).toBe(mockUser.id);
      expect(decoded.email).toBe(mockUser.email);
    });

    test('잘못된 토큰은 에러를 던진다', () => {
      expect(() => verifyToken('invalid-token')).toThrow();
    });

    test('변조된 토큰은 에러를 던진다', () => {
      const token = generateToken(mockUser);
      const tamperedToken = token.slice(0, -5) + 'xxxxx';
      expect(() => verifyToken(tamperedToken)).toThrow();
    });

    test('다른 secret으로 서명된 토큰은 에러를 던진다', () => {
      const token = jwt.sign({ id: 'user-1' }, 'wrong-secret', { expiresIn: '1h' });
      expect(() => verifyToken(token)).toThrow();
    });

    test('만료된 토큰은 에러를 던진다', () => {
      const token = jwt.sign(
        { id: mockUser.id, email: mockUser.email },
        process.env.JWT_SECRET,
        { expiresIn: '0s' },
      );
      expect(() => verifyToken(token)).toThrow(jwt.TokenExpiredError);
    });
  });
});
