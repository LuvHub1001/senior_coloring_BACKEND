const artworkService = require('../services/artwork');

// 색칠 시작 (작품 생성)
async function create(req, res, next) {
  try {
    const { designId } = req.body;

    if (!designId) {
      return res.status(400).json({ success: false, error: 'designId는 필수입니다.' });
    }

    const artwork = await artworkService.createArtwork({
      userId: req.user.id,
      designId: Number(designId),
    });

    res.status(201).json({ success: true, data: artwork });
  } catch (err) {
    next(err);
  }
}

// 임시 저장
async function save(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '이미지 파일이 필요합니다.' });
    }

    const artwork = await artworkService.saveArtwork({
      artworkId: req.params.id,
      userId: req.user.id,
      file: req.file,
      progress: req.body.progress,
    });

    res.json({ success: true, data: artwork });
  } catch (err) {
    next(err);
  }
}

// 작품 완성
async function complete(req, res, next) {
  try {
    const artwork = await artworkService.completeArtwork({
      artworkId: req.params.id,
      userId: req.user.id,
    });

    res.json({ success: true, data: artwork });
  } catch (err) {
    next(err);
  }
}

// 내 작품 목록
async function list(req, res, next) {
  try {
    const { status } = req.query;
    const artworks = await artworkService.getMyArtworks({
      userId: req.user.id,
      status,
    });

    res.json({ success: true, data: artworks });
  } catch (err) {
    next(err);
  }
}

// 작품 상세 조회
async function detail(req, res, next) {
  try {
    const artwork = await artworkService.getArtworkById({
      artworkId: req.params.id,
      userId: req.user.id,
    });

    res.json({ success: true, data: artwork });
  } catch (err) {
    next(err);
  }
}

// 작품 삭제
async function remove(req, res, next) {
  try {
    await artworkService.deleteArtwork({
      artworkId: req.params.id,
      userId: req.user.id,
    });

    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

module.exports = { create, save, complete, list, detail, remove };
