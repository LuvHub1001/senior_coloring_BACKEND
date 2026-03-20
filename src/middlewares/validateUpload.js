const { validateImageBuffer } = require('../utils/fileValidation');

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

module.exports = { validateUploadedFiles };
