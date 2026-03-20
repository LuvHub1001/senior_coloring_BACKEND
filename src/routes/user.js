const express = require('express');
const { authenticate, optionalAuth } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { actionLimiter } = require('../middlewares/rateLimiter');
const { updateNickname, updateProfile, userIdParams, listUserPublishedArtworks } = require('../validators/user');
const { getMe, patchNickname, patchProfile, getUserProfilePublic, getUserPublished, follow, unfollow } = require('../controllers/user');

const router = express.Router();

// 내 프로필 조회
router.get('/me', authenticate, getMe);

// 프로필 수정 (닉네임, 상태 메시지, 아바타)
router.patch('/me/profile', authenticate, validate(updateProfile), patchProfile);

// 닉네임 변경 (하위호환)
router.patch('/me/nickname', authenticate, validate(updateNickname), patchNickname);

// 타인 프로필 조회 (비로그인 허용)
router.get('/:userId/profile', optionalAuth, validate(userIdParams), getUserProfilePublic);

// 타인의 자랑한 작품 목록 (비로그인 허용)
router.get('/:userId/artworks/published', optionalAuth, validate(listUserPublishedArtworks), getUserPublished);

// 팔로우 (로그인 필수, 스팸 방지)
router.post('/:userId/follow', authenticate, actionLimiter, validate(userIdParams), follow);

// 언팔로우 (로그인 필수, 스팸 방지)
router.delete('/:userId/follow', authenticate, actionLimiter, validate(userIdParams), unfollow);

module.exports = router;
