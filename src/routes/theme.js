const express = require('express');
const multer = require('multer');
const { authenticate } = require('../middlewares/auth');
const { list, select, uploadImage } = require('../controllers/theme');

const router = express.Router();

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

router.use(authenticate);

// 테마 목록 조회 (해금 여부 포함)
router.get('/', list);

// 테마 선택
router.patch('/select', select);

// 테마 이미지 업로드 (관리용)
router.put('/:id/image', upload.single('image'), uploadImage);

module.exports = router;
