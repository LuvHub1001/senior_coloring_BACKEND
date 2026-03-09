require('./setup');

const { validate } = require('../src/middlewares/validate');
const { requestId } = require('../src/middlewares/requestId');
const { z } = require('zod');

describe('validate middleware', () => {
  const schema = z.object({
    body: z.object({
      name: z.string().min(1),
    }),
  });

  function createMockReqRes(body = {}, query = {}, params = {}) {
    const req = { body, query, params };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();
    return { req, res, next };
  }

  test('유효한 입력은 next()를 호출한다', () => {
    const { req, res, next } = createMockReqRes({ name: 'test' });
    validate(schema)(req, res, next);
    expect(next).toHaveBeenCalledWith();
  });

  test('잘못된 입력은 400 응답을 반환한다', () => {
    const { req, res, next } = createMockReqRes({ name: '' });
    validate(schema)(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('에러 응답에 details 배열이 포함된다', () => {
    const { req, res, next } = createMockReqRes({});
    validate(schema)(req, res, next);
    const response = res.json.mock.calls[0][0];
    expect(response.details).toBeDefined();
    expect(Array.isArray(response.details)).toBe(true);
  });
});

describe('requestId middleware', () => {
  test('요청에 id를 추가한다', () => {
    const req = { headers: {} };
    const res = { setHeader: jest.fn() };
    const next = jest.fn();

    requestId(req, res, next);

    expect(req.id).toBeDefined();
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', req.id);
    expect(next).toHaveBeenCalled();
  });

  test('기존 X-Request-Id 헤더를 사용한다', () => {
    const req = { headers: { 'x-request-id': 'existing-id' } };
    const res = { setHeader: jest.fn() };
    const next = jest.fn();

    requestId(req, res, next);

    expect(req.id).toBe('existing-id');
  });
});
