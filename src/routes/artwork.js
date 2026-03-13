const express = require('express');
const multer = require('multer');
const { authenticate } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { uploadLimiter } = require('../middlewares/rateLimiter');
const { createArtwork, saveArtwork, artworkParams, listArtworks, publishArtwork } = require('../validators/artwork');
const { create, save, complete, list, detail, remove, feature, publish } = require('../controllers/artwork');

const router = express.Router();

// 이미지 업로드 설정 (메모리 저장, 최대 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('PNG, JPEG, WEBP 이미지만 업로드할 수 있습니다.'));
    }
  },
});

// 모든 라우트에 인증 필요
router.use(authenticate);

// 색칠 시작 (작품 생성)
router.post('/', validate(createArtwork), create);

// 내 작품 목록 조회
router.get('/', validate(listArtworks), list);

// 작품 상세 조회
router.get('/:id', validate(artworkParams), detail);

// 임시 저장 (색칠 진행 이미지 업로드)
router.put('/:id/save', uploadLimiter, upload.single('image'), validate(saveArtwork), save);

// 작품 완성
router.patch('/:id/complete', validate(artworkParams), complete);

// 대표 작품 선택
router.patch('/:id/feature', validate(artworkParams), feature);

// 작품 공개/비공개 전환
router.patch('/:id/publish', validate(publishArtwork), publish);

// 작품 삭제
router.delete('/:id', validate(artworkParams), remove);

module.exports = router;
