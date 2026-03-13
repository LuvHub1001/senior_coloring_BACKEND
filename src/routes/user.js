const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { updateNickname } = require('../validators/user');
const { getMe, patchNickname } = require('../controllers/user');

const router = express.Router();

// 내 프로필 조회
router.get('/me', authenticate, getMe);

// 닉네임 변경
router.patch('/me/nickname', authenticate, validate(updateNickname), patchNickname);

module.exports = router;
