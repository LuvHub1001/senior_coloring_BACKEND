const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;

  // 운영 환경에서는 500 에러의 상세 내용 숨김
  const isProduction = process.env.NODE_ENV === 'production';

  // 구조화된 로깅
  logger.error(err.message, {
    requestId: req.id,
    statusCode,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?.id,
    ...(statusCode === 500 && { stack: err.stack }),
  });

  // Multer 파일 크기 초과 에러 처리
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: '파일 크기가 제한을 초과했습니다.',
    });
  }

  res.status(statusCode).json({
    success: false,
    error: statusCode === 500 && isProduction
      ? '서버 내부 오류가 발생했습니다.'
      : err.message,
  });
};

module.exports = { errorHandler };
