require('./setup');

const { errorHandler } = require('../src/middlewares/errorHandler');

function createMockContext(err) {
  const req = {
    id: 'req-123',
    method: 'GET',
    originalUrl: '/api/test',
    ip: '127.0.0.1',
    user: { id: 'user-1' },
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const next = jest.fn();
  return { req, res, next, err };
}

describe('errorHandler 미들웨어', () => {
  test('statusCode가 설정된 에러는 해당 상태코드로 응답한다', () => {
    const err = new Error('찾을 수 없습니다.');
    err.statusCode = 404;
    const { req, res, next } = createMockContext(err);

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: '찾을 수 없습니다.',
    });
  });

  test('statusCode가 없는 에러는 500으로 응답한다', () => {
    const err = new Error('알 수 없는 에러');
    const { req, res, next } = createMockContext(err);

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('개발 환경에서는 500 에러 메시지를 그대로 노출한다', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const err = new Error('DB 연결 실패');
    const { req, res, next } = createMockContext(err);

    errorHandler(err, req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'DB 연결 실패',
    });

    process.env.NODE_ENV = originalEnv;
  });

  test('운영 환경에서는 500 에러 메시지를 숨긴다', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const err = new Error('DB connection refused at 10.0.0.1:5432');
    const { req, res, next } = createMockContext(err);

    errorHandler(err, req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: '서버 내부 오류가 발생했습니다.',
    });

    process.env.NODE_ENV = originalEnv;
  });

  test('운영 환경에서 4xx 에러 메시지는 노출한다', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const err = new Error('잘못된 요청입니다.');
    err.statusCode = 400;
    const { req, res, next } = createMockContext(err);

    errorHandler(err, req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: '잘못된 요청입니다.',
    });

    process.env.NODE_ENV = originalEnv;
  });

  test('Multer LIMIT_FILE_SIZE 에러는 413으로 처리한다', () => {
    const err = new Error('File too large');
    err.code = 'LIMIT_FILE_SIZE';
    const { req, res, next } = createMockContext(err);

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: '파일 크기가 제한을 초과했습니다.',
    });
  });

  test('err.status 속성도 상태코드로 인식한다', () => {
    const err = new Error('도안을 찾을 수 없습니다.');
    err.status = 404;
    const { req, res, next } = createMockContext(err);

    errorHandler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: '도안을 찾을 수 없습니다.',
    });
  });

  test('응답 형식이 API 표준을 따른다', () => {
    const err = new Error('에러');
    err.statusCode = 422;
    const { req, res, next } = createMockContext(err);

    errorHandler(err, req, res, next);

    const response = res.json.mock.calls[0][0];
    expect(response).toHaveProperty('success', false);
    expect(response).toHaveProperty('error');
    expect(response).not.toHaveProperty('data');
  });
});
