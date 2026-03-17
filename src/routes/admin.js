const express = require('express');
const multer = require('multer');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const { validate } = require('../middlewares/validate');
const { adminReadLimiter, adminWriteLimiter } = require('../middlewares/rateLimiter');
const { validateImageBuffer } = require('../utils/fileValidation');
const validators = require('../validators/admin');
const controller = require('../controllers/admin');

const router = express.Router();

// 허용 MIME 타입 (SVG 포함 — 업로드 후 매직 바이트 + 콘텐츠 검증으로 보호)
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

// 이미지 업로드 설정 (메모리 저장, 최대 5MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('PNG, JPEG, WEBP, SVG 이미지만 업로드할 수 있습니다.'));
    }
  },
});

// 업로드된 파일의 매직 바이트 검증 미들웨어
// multer 이후에 적용하여 버퍼 내용의 실제 타입을 확인
const validateUploadedFiles = async (req, res, next) => {
  const files = [];

  // upload.fields() 방식
  if (req.files && typeof req.files === 'object') {
    for (const fieldFiles of Object.values(req.files)) {
      files.push(...fieldFiles);
    }
  }
  // upload.single() 방식
  if (req.file) {
    files.push(req.file);
  }

  for (const file of files) {
    const result = await validateImageBuffer(file.buffer, file.mimetype);
    if (!result.valid) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: result.error },
      });
    }
  }

  next();
};

// 모든 관리자 API에 인증 + 권한 검증 적용
router.use(authenticate, requireAdmin);

// 대시보드 통계
router.get('/stats', adminReadLimiter, controller.stats);

// 도안 관리
const designUpload = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'originalImage', maxCount: 1 },
]);
router.get('/designs', adminReadLimiter, validate(validators.listDesigns), controller.listDesigns);
router.post('/designs', adminWriteLimiter, designUpload, validateUploadedFiles, validate(validators.createDesign), controller.createDesign);
router.patch('/designs/:id', adminWriteLimiter, designUpload, validateUploadedFiles, validate(validators.updateDesign), controller.updateDesign);
router.delete('/designs/:id', adminWriteLimiter, validate(validators.deleteDesign), controller.deleteDesign);

// 테마 관리
router.get('/themes', adminReadLimiter, validate(validators.listThemes), controller.listThemes);
router.post('/themes', adminWriteLimiter, upload.single('image'), validateUploadedFiles, validate(validators.createTheme), controller.createTheme);
router.patch('/themes/:id', adminWriteLimiter, upload.single('image'), validateUploadedFiles, validate(validators.updateTheme), controller.updateTheme);
router.delete('/themes/:id', adminWriteLimiter, validate(validators.deleteTheme), controller.deleteTheme);

// 회원 관리
router.get('/users', adminReadLimiter, validate(validators.listUsers), controller.listUsers);

// 작품 관리
router.get('/artworks', adminReadLimiter, validate(validators.listArtworks), controller.listArtworks);
router.delete('/artworks/:id', adminWriteLimiter, validate(validators.deleteArtwork), controller.deleteArtwork);

// 추천 배너 관리
router.get('/recommendations', adminReadLimiter, controller.listRecommendations);
router.post('/recommendations', adminWriteLimiter, upload.single('image'), validateUploadedFiles, validate(validators.createRecommendation), controller.createRecommendation);
router.delete('/recommendations/:id', adminWriteLimiter, validate(validators.deleteRecommendation), controller.deleteRecommendation);

// 공지사항 관리
router.get('/notices', adminReadLimiter, controller.listNotices);
router.post('/notices', adminWriteLimiter, validate(validators.createNotice), controller.createNotice);
router.delete('/notices/:id', adminWriteLimiter, validate(validators.deleteNotice), controller.deleteNotice);

module.exports = router;
