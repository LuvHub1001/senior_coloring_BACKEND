const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { listNotifications, notificationParams } = require('../validators/notification');
const { list, read, readAll } = require('../controllers/notification');

const router = express.Router();

// 알림 목록 조회
router.get('/', authenticate, validate(listNotifications), list);

// 개별 알림 읽기
router.put('/:notificationId/read', authenticate, validate(notificationParams), read);

// 모두 읽기
router.put('/read-all', authenticate, readAll);

module.exports = router;
