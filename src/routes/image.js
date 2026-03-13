const express = require('express');
const { validate } = require('../middlewares/validate');
const { proxyLimiter } = require('../middlewares/rateLimiter');
const { imageProxy } = require('../validators/image');
const { proxy } = require('../controllers/image');

const router = express.Router();

// 이미지 프록시 (Supabase Storage CORS 우회)
router.get('/proxy', proxyLimiter, validate(imageProxy), proxy);

module.exports = router;
