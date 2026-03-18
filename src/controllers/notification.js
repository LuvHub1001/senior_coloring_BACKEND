const { getNotifications, readAllNotifications } = require('../services/notification');

async function list(req, res, next) {
  try {
    const data = await getNotifications({
      userId: req.user.id,
      type: req.query.type || null,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function readAll(req, res, next) {
  try {
    await readAllNotifications({ userId: req.user.id });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, readAll };
