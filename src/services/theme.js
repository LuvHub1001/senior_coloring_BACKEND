const { PrismaClient } = require('@prisma/client');
const supabase = require('../config/supabase');
const path = require('path');
const crypto = require('crypto');

const prisma = new PrismaClient();
const BUCKET_NAME = 'themes';

// 테마 목록 조회 (유저별 해금 여부 포함)
async function getThemes(userId) {
  const [themes, completedCount, user] = await Promise.all([
    prisma.theme.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.artwork.count({
      where: { userId, status: 'COMPLETED' },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { selectedThemeId: true },
    }),
  ]);

  return themes.map((theme) => ({
    id: theme.id,
    name: theme.name,
    requiredArtworks: theme.requiredArtworks,
    imageUrl: theme.imageUrl,
    buttonColor: theme.buttonColor,
    buttonTextColor: theme.buttonTextColor,
    textColor: theme.textColor,
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

  // 해금 여부 확인
  const completedCount = await prisma.artwork.count({
    where: { userId, status: 'COMPLETED' },
  });

  if (completedCount < theme.requiredArtworks) {
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

// 테마 이미지 업로드 (관리용)
async function uploadThemeImage(themeId, file) {
  const theme = await prisma.theme.findUnique({ where: { id: themeId } });
  if (!theme) {
    const error = new Error('테마를 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }

  const ext = path.extname(file.originalname);
  const fileName = `${themeId}_${crypto.randomUUID()}${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });

  if (uploadError) {
    console.error('Supabase upload error:', uploadError);
    const error = new Error('테마 이미지 업로드에 실패했습니다.');
    error.status = 500;
    throw error;
  }

  // 이전 이미지 삭제
  if (theme.imageUrl) {
    const marker = `/storage/v1/object/public/${BUCKET_NAME}/`;
    const idx = theme.imageUrl.indexOf(marker);
    if (idx !== -1) {
      const oldPath = theme.imageUrl.slice(idx + marker.length);
      await supabase.storage.from(BUCKET_NAME).remove([oldPath]);
    }
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName);

  return prisma.theme.update({
    where: { id: themeId },
    data: { imageUrl: urlData.publicUrl },
  });
}

module.exports = { getThemes, selectTheme, uploadThemeImage };
