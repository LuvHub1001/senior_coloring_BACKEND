const { getUserProfile } = require('../services/user');

async function getMe(req, res, next) {
  try {
    const user = await getUserProfile(req.user.id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMe };
