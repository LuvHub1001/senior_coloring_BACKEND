const {
  getUserProfile,
  updateNickname,
  updateProfile,
  getPublicProfile,
  getUserPublishedArtworks,
  followUser,
  unfollowUser,
} = require('../services/user');

async function getMe(req, res, next) {
  try {
    const user = await getUserProfile(req.user.id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

async function patchNickname(req, res, next) {
  try {
    const result = await updateNickname(req.user.id, req.body.nickname);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

async function patchProfile(req, res, next) {
  try {
    const { nickname, statusMessage, avatarUrl } = req.body;
    const result = await updateProfile(req.user.id, { nickname, statusMessage, avatarUrl });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// 타인 프로필 조회
async function getUserProfilePublic(req, res, next) {
  try {
    const profile = await getPublicProfile({
      targetUserId: req.params.userId,
      currentUserId: req.user?.id || null,
    });
    res.json({ success: true, data: profile });
  } catch (err) {
    next(err);
  }
}

// 타인의 자랑한 작품 목록
async function getUserPublished(req, res, next) {
  try {
    const { sort, page, size } = req.query;
    const result = await getUserPublishedArtworks({
      targetUserId: req.params.userId,
      currentUserId: req.user?.id || null,
      sort,
      page,
      size,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// 팔로우
async function follow(req, res, next) {
  try {
    const result = await followUser({
      followerId: req.user.id,
      followingId: req.params.userId,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// 언팔로우
async function unfollow(req, res, next) {
  try {
    const result = await unfollowUser({
      followerId: req.user.id,
      followingId: req.params.userId,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMe, patchNickname, patchProfile, getUserProfilePublic, getUserPublished, follow, unfollow };
