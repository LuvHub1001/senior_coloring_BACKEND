const express = require('express');
const multer = require('multer');
const { authenticate } = require('../middlewares/auth');
const { create, list, detail } = require('../controllers/design');

const router = express.Router();

// 이미지 업로드 설정 (메모리 저장, 최대 5MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('PNG, JPEG, WEBP, SVG 이미지만 업로드할 수 있습니다.'));
    }
  },
});

// 도안 등록 (인증 필요)
router.post('/', authenticate, upload.single('image'), create);

// 도안 목록 조회
router.get('/', list);

// 도안 상세 조회
router.get('/:id', detail);

module.exports = router;
