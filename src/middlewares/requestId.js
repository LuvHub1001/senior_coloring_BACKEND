const crypto = require('crypto');

function requestId(req, res, next) {
  // 서버에서만 생성 (클라이언트 제공 X-Request-Id 무시 — 로그 오염 방지)
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}

module.exports = { requestId };
