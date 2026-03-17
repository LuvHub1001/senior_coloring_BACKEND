const adminService = require('../services/admin');

// 대시보드 통계
async function stats(req, res, next) {
  try {
    const data = await adminService.getStats();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// 도안 목록 조회
async function listDesigns(req, res, next) {
  try {
    const result = await adminService.getDesigns(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

// 도안 등록
async function createDesign(req, res, next) {
  try {
    const imageFile = req.files?.image?.[0];
    if (!imageFile) {
      return res.status(400).json({ success: false, error: '도안 이미지 파일(image)이 필요합니다.' });
    }

    const { title, category, description } = req.body;
    const originalFile = req.files?.originalImage?.[0] || null;

    const design = await adminService.createDesign({
      title,
      category,
      description,
      file: imageFile,
      originalFile,
    });

    res.status(201).json({ success: true, data: design });
  } catch (err) {
    next(err);
  }
}

// 도안 수정
async function updateDesign(req, res, next) {
  try {
    const { title, category, description } = req.body;
    const imageFile = req.files?.image?.[0] || null;
    const originalFile = req.files?.originalImage?.[0] || null;

    const design = await adminService.updateDesign(req.params.id, {
      title,
      category,
      description,
      file: imageFile,
      originalFile,
    });

    res.json({ success: true, data: design });
  } catch (err) {
    next(err);
  }
}

// 도안 삭제
async function deleteDesign(req, res, next) {
  try {
    await adminService.deleteDesign(req.params.id);
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

// 테마 목록 조회
async function listThemes(req, res, next) {
  try {
    const result = await adminService.getThemes(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

// 테마 등록
async function createTheme(req, res, next) {
  try {
    const file = req.file || null;
    const { name, requiredArtworks, textColor, toggleType } = req.body;

    const theme = await adminService.createTheme({
      name,
      requiredArtworks,
      textColor,
      toggleType,
      file,
    });

    res.status(201).json({ success: true, data: theme });
  } catch (err) {
    next(err);
  }
}

// 테마 수정
async function updateTheme(req, res, next) {
  try {
    const { name, requiredArtworks, textColor, toggleType } = req.body;
    const file = req.file || null;

    const theme = await adminService.updateTheme(req.params.id, {
      name,
      requiredArtworks,
      textColor,
      toggleType,
      file,
    });

    res.json({ success: true, data: theme });
  } catch (err) {
    next(err);
  }
}

// 테마 삭제
async function deleteTheme(req, res, next) {
  try {
    await adminService.deleteTheme(req.params.id);
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

// 회원 목록 조회
async function listUsers(req, res, next) {
  try {
    const result = await adminService.getUsers(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

// 작품 목록 조회
async function listArtworks(req, res, next) {
  try {
    const result = await adminService.getArtworks(req.query);
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

// 작품 삭제
async function deleteArtwork(req, res, next) {
  try {
    await adminService.deleteArtwork(req.params.id);
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

// 추천 배너 목록 조회
async function listRecommendations(req, res, next) {
  try {
    const data = await adminService.getRecommendations();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// 추천 배너 등록
async function createRecommendation(req, res, next) {
  try {
    const imageFile = req.file;
    if (!imageFile) {
      return res.status(400).json({ success: false, error: '배너 이미지 파일(image)이 필요합니다.' });
    }

    const { designId } = req.body;
    const rec = await adminService.createRecommendation({
      designId,
      file: imageFile,
    });

    res.status(201).json({ success: true, data: rec });
  } catch (err) {
    next(err);
  }
}

// 추천 배너 삭제
async function deleteRecommendation(req, res, next) {
  try {
    await adminService.deleteRecommendation(req.params.id);
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

// 공지사항 목록 조회
async function listNotices(req, res, next) {
  try {
    const data = await adminService.getNotices();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// 공지사항 등록
async function createNotice(req, res, next) {
  try {
    const { title, content } = req.body;
    const notice = await adminService.createNotice({ title, content });
    res.status(201).json({ success: true, data: notice });
  } catch (err) {
    next(err);
  }
}

// 공지사항 삭제
async function deleteNotice(req, res, next) {
  try {
    await adminService.deleteNotice(req.params.id);
    res.json({ success: true, data: null });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  stats,
  listDesigns,
  createDesign,
  updateDesign,
  deleteDesign,
  listThemes,
  createTheme,
  updateTheme,
  deleteTheme,
  listUsers,
  listArtworks,
  deleteArtwork,
  listRecommendations,
  createRecommendation,
  deleteRecommendation,
  listNotices,
  createNotice,
  deleteNotice,
};
