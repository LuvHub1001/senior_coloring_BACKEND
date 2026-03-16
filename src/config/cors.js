// 허용 Origin 목록 (CLIENT_URL 쉼표 구분)
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

module.exports = { allowedOrigins };
