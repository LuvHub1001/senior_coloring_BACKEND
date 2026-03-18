const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { listNotifications } = require('../validators/notification');
const { list, readAll } = require('../controllers/notification');

const router = express.Router();

// 알림 목록 조회
router.get('/', authenticate, validate(listNotifications), list);

// 모두 읽기
router.put('/read-all', authenticate, readAll);

module.exports = router;
