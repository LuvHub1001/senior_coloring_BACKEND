const { ZodError } = require('zod');

// Zod 스키마 기반 요청 검증 미들웨어
function validate(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      req.body = parsed.body ?? req.body;
      req.query = parsed.query ?? req.query;
      req.params = parsed.params ?? req.params;

      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.issues.map((issue) => ({
          field: issue.path.slice(1).join('.'),
          message: issue.message,
        }));

        return res.status(400).json({
          success: false,
          error: '입력값이 올바르지 않습니다.',
          details: errors,
        });
      }
      next(err);
    }
  };
}

module.exports = { validate };
