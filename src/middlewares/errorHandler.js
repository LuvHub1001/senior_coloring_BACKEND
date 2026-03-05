const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    error: statusCode === 500 ? '서버 내부 오류가 발생했습니다.' : err.message,
  });
};

module.exports = { errorHandler };
