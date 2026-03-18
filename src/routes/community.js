const express = require('express');
const { authenticate, optionalAuth } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { listCommunityArtworks, popularCommunityArtworks, communityArtworkParams } = require('../validators/community');
const { list, popular, detail, toggleLike } = require('../controllers/community');

const router = express.Router();

// 커뮤니티 목록 조회 (비로그인 허용)
router.get('/artworks', optionalAuth, validate(listCommunityArtworks), list);

// 이번 주 인기 작품 (비로그인 허용)
router.get('/artworks/popular', optionalAuth, validate(popularCommunityArtworks), popular);

// 작품 상세 조회 (비로그인 허용)
router.get('/artworks/:artworkId', optionalAuth, validate(communityArtworkParams), detail);

// 좋아요 토글 (로그인 필수)
router.post('/artworks/:artworkId/like', authenticate, validate(communityArtworkParams), toggleLike);

module.exports = router;
