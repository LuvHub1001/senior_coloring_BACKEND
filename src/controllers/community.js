const communityService = require('../services/community');

// 커뮤니티 작품 목록 조회
async function list(req, res, next) {
  try {
    const { sort, page, size } = req.query;

    const result = await communityService.getCommunityArtworks({
      sort,
      page,
      size,
      userId: req.user?.id || null,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// 오늘의 인기 작품
async function popular(req, res, next) {
  try {
    const { size } = req.query;

    const artworks = await communityService.getPopularArtworks({
      size,
      userId: req.user?.id || null,
    });

    res.json({ success: true, data: artworks });
  } catch (err) {
    next(err);
  }
}

// 작품 상세 조회
async function detail(req, res, next) {
  try {
    const artwork = await communityService.getCommunityArtworkDetail({
      artworkId: req.params.artworkId,
      userId: req.user?.id || null,
    });

    res.json({ success: true, data: artwork });
  } catch (err) {
    next(err);
  }
}

// 좋아요 토글
async function toggleLike(req, res, next) {
  try {
    const result = await communityService.toggleLike({
      artworkId: req.params.artworkId,
      userId: req.user.id,
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, popular, detail, toggleLike };
