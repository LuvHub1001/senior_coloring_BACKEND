const { getHomeData } = require('../services/home');

async function getHome(req, res, next) {
  try {
    const data = await getHomeData(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

module.exports = { getHome };
