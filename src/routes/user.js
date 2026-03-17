const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { updateNickname, updateProfile } = require('../validators/user');
const { getMe, patchNickname, patchProfile } = require('../controllers/user');

const router = express.Router();

// 내 프로필 조회
router.get('/me', authenticate, getMe);

// 프로필 수정 (닉네임, 상태 메시지, 아바타)
router.patch('/me/profile', authenticate, validate(updateProfile), patchProfile);

// 닉네임 변경 (하위호환)
router.patch('/me/nickname', authenticate, validate(updateNickname), patchNickname);

module.exports = router;
