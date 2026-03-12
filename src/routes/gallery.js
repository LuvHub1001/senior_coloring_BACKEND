const express = require('express');
const { authenticate, optionalAuth } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { listGalleryArtworks, popularGalleryArtworks, galleryArtworkParams } = require('../validators/gallery');
const { list, popular, detail, toggleLike } = require('../controllers/gallery');

const router = express.Router();

// 갤러리 목록 조회 (비로그인 허용)
router.get('/artworks', optionalAuth, validate(listGalleryArtworks), list);

// 오늘의 인기 작품 (비로그인 허용)
router.get('/artworks/popular', optionalAuth, validate(popularGalleryArtworks), popular);

// 작품 상세 조회 (비로그인 허용)
router.get('/artworks/:artworkId', optionalAuth, validate(galleryArtworkParams), detail);

// 좋아요 토글 (로그인 필수)
router.post('/artworks/:artworkId/like', authenticate, validate(galleryArtworkParams), toggleLike);

module.exports = router;
