const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { getHome } = require('../controllers/home');

const router = express.Router();

// 홈 통합 데이터 조회
router.get('/', authenticate, getHome);

module.exports = router;
