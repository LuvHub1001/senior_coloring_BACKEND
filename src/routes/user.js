const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { getMe } = require('../controllers/user');

const router = express.Router();

// 내 프로필 조회
router.get('/me', authenticate, getMe);

module.exports = router;
