const { getNotifications, readNotification, readAllNotifications } = require('../services/notification');

async function list(req, res, next) {
  try {
    const { type, page, size } = req.query;
    const data = await getNotifications({
      userId: req.user.id,
      type: type || null,
      page,
      size,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

async function read(req, res, next) {
  try {
    await readNotification({
      notificationId: req.params.notificationId,
      userId: req.user.id,
    });
    res.json({ success: true });
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

module.exports = { list, read, readAll };
