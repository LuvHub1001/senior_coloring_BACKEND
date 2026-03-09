const { createDesign, getDesigns, getDesignById } = require('../services/design');

// 도안 등록 (이미지 업로드)
async function create(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '이미지 파일이 필요합니다.' });
    }

    const { title, category, description } = req.body;

    const design = await createDesign({
      title,
      category,
      description,
      file: req.file,
    });

    res.status(201).json({ success: true, data: design });
  } catch (err) {
    next(err);
  }
}

// 도안 목록 조회
async function list(req, res, next) {
  try {
    const { category } = req.query;
    const designs = await getDesigns({ category });
    res.json({ success: true, data: designs });
  } catch (err) {
    next(err);
  }
}

// 도안 상세 조회
async function detail(req, res, next) {
  try {
    const design = await getDesignById(req.params.id);
    res.json({ success: true, data: design });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, list, detail };
