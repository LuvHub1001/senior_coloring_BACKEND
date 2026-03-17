const express = require('express');
const { authenticate } = require('../middlewares/auth');
const { getNotices } = require('../services/admin');

const router = express.Router();

// 공지사항 목록 조회 (인증 필요, 최신순)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const data = await getNotices();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
