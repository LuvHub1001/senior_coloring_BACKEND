const prisma = require('../config/prisma');
const { uploadFile, generateFileName, removeFile } = require('../utils/storage');
const { MemoryCache } = require('../utils/cache');
const BUCKET_NAME = 'themes';

// 테마 데이터 캐시 (TTL 5분)
const themeCache = new MemoryCache(5 * 60 * 1000);

// 테마 목록 조회 (유저별 해금 여부 포함)
async function getThemes(userId) {
  let themes = themeCache.get('all');
  if (!themes) {
    themes = await prisma.theme.findMany({ orderBy: { sortOrder: 'asc' } });
    themeCache.set('all', themes);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { selectedThemeId: true, totalCompletedCount: true },
  });

  const completedCount = user.totalCompletedCount;

  return themes.map((theme) => ({
    id: theme.id,
    name: theme.name,
    requiredArtworks: theme.requiredArtworks,
    imageUrl: theme.imageUrl,
    buttonColor: theme.buttonColor,
    buttonTextColor: theme.buttonTextColor,
    textColor: theme.textColor,
    toggleType: theme.toggleType,
    unlocked: completedCount >= theme.requiredArtworks,
    selected: user.selectedThemeId === theme.id,
  }));
}

// 테마 선택
async function selectTheme(userId, themeId) {
  const theme = await prisma.theme.findUnique({ where: { id: themeId } });
  if (!theme) {
    const error = new Error('테마를 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }

  // 해금 여부 확인 (누적 완성 수 기준)
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { totalCompletedCount: true },
  });

  if (currentUser.totalCompletedCount < theme.requiredArtworks) {
    const error = new Error('아직 해금되지 않은 테마입니다.');
    error.status = 403;
    throw error;
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { selectedThemeId: themeId },
    select: { id: true, selectedThemeId: true },
  });

  return { selectedThemeId: user.selectedThemeId, theme };
}

// 테마 생성 (이미지 포함)
async function createTheme({ name, requiredArtworks, buttonColor, buttonTextColor, textColor, toggleType, sortOrder, file }) {
  // 중복 이름 검사
  const existing = await prisma.theme.findUnique({ where: { name } });
  if (existing) {
    const error = new Error('이미 존재하는 테마 이름입니다.');
    error.status = 409;
    throw error;
  }

  let imageUrl = null;

  if (file) {
    const fileName = generateFileName(file.originalname);
    imageUrl = await uploadFile(BUCKET_NAME, fileName, file.buffer, file.mimetype);
  }

  const created = await prisma.theme.create({
    data: {
      name,
      requiredArtworks: requiredArtworks || 0,
      buttonColor: buttonColor || null,
      buttonTextColor: buttonTextColor || null,
      textColor: textColor || null,
      toggleType: toggleType || 'LIGHT',
      sortOrder: sortOrder || 0,
      imageUrl,
    },
  });

  themeCache.invalidate('all');
  return created;
}

// 테마 이미지 업로드 (관리용)
async function uploadThemeImage(themeId, file) {
  const theme = await prisma.theme.findUnique({ where: { id: themeId } });
  if (!theme) {
    const error = new Error('테마를 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }

  const fileName = generateFileName(file.originalname, String(themeId));
  const publicUrl = await uploadFile(BUCKET_NAME, fileName, file.buffer, file.mimetype, { upsert: true });

  // 이전 이미지 삭제
  if (theme.imageUrl) {
    await removeFile(BUCKET_NAME, theme.imageUrl);
  }

  const updated = await prisma.theme.update({
    where: { id: themeId },
    data: { imageUrl: publicUrl },
  });

  themeCache.invalidate('all');
  return updated;
}

module.exports = { getThemes, selectTheme, createTheme, uploadThemeImage, themeCache };
