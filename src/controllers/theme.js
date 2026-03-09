const themeService = require('../services/theme');

// 테마 목록 조회
async function list(req, res, next) {
  try {
    const themes = await themeService.getThemes(req.user.id);
    res.json({ success: true, data: themes });
  } catch (err) {
    next(err);
  }
}

// 테마 선택
async function select(req, res, next) {
  try {
    const { themeId } = req.body;

    const result = await themeService.selectTheme(req.user.id, themeId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// 테마 이미지 업로드 (관리용)
async function uploadImage(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '이미지 파일이 필요합니다.' });
    }

    const theme = await themeService.uploadThemeImage(
      req.params.id,
      req.file,
    );

    res.json({ success: true, data: theme });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, select, uploadImage };
