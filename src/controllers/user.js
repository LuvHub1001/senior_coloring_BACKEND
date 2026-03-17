const { getUserProfile, updateNickname, updateProfile } = require('../services/user');

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

module.exports = { getMe, patchNickname, patchProfile };
