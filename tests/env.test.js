describe('환경변수 검증', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    // 필수 환경변수 설정
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'test-key';
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
    process.env.JWT_SECRET = 'a'.repeat(32);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('유효한 환경변수로 성공한다', () => {
    const { validateEnv } = require('../src/config/env');
    const result = validateEnv();
    expect(result.PORT).toBe(3000);
    expect(result.NODE_ENV).toBe('test');
  });

  test('JWT_SECRET이 32자 미만이면 프로세스를 종료한다', () => {
    process.env.JWT_SECRET = 'short';
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    const { validateEnv } = require('../src/config/env');
    expect(() => validateEnv()).toThrow('process.exit called');
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
  });

  test('SUPABASE_URL 누락 시 프로세스를 종료한다', () => {
    delete process.env.SUPABASE_URL;
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    const { validateEnv } = require('../src/config/env');
    expect(() => validateEnv()).toThrow('process.exit called');

    mockExit.mockRestore();
  });

  test('잘못된 NODE_ENV를 거부한다', () => {
    process.env.NODE_ENV = 'invalid';
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    const { validateEnv } = require('../src/config/env');
    expect(() => validateEnv()).toThrow('process.exit called');

    mockExit.mockRestore();
  });

  test('DATABASE_URL이 postgresql:// 형식이 아니면 프로세스를 종료한다', () => {
    process.env.DATABASE_URL = 'mysql://test:test@localhost:3306/test';
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    const { validateEnv } = require('../src/config/env');
    expect(() => validateEnv()).toThrow('process.exit called');

    mockExit.mockRestore();
  });

  test('postgres:// 형식의 DATABASE_URL도 허용한다', () => {
    process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/test';

    const { validateEnv } = require('../src/config/env');
    const result = validateEnv();
    expect(result.DATABASE_URL).toBe('postgres://test:test@localhost:5432/test');
  });
});
