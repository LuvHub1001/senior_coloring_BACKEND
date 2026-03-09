const prisma = require('../config/prisma');
const supabase = require('../config/supabase');
const path = require('path');
const crypto = require('crypto');
const logger = require('../config/logger');
const BUCKET_NAME = 'artworks';

// 색칠 시작 (작품 생성 또는 기존 IN_PROGRESS 반환)
async function createArtwork({ userId, designId }) {
  // 도안 존재 여부 확인
  const design = await prisma.design.findUnique({ where: { id: designId } });
  if (!design) {
    const error = new Error('도안을 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }

  // 동일 유저 + 동일 도안 + IN_PROGRESS 작품이 있으면 기존 반환
  const existing = await prisma.artwork.findFirst({
    where: { userId, designId, status: 'IN_PROGRESS' },
    include: { design: true },
  });

  if (existing) {
    return existing;
  }

  return prisma.artwork.create({
    data: {
      userId,
      designId,
      status: 'IN_PROGRESS',
    },
    include: { design: true },
  });
}

// 임시 저장 (색칠 진행 이미지 업로드)
async function saveArtwork({ artworkId, userId, file, progress }) {
  const artwork = await getOwnArtwork(artworkId, userId);

  // Supabase Storage에 이미지 업로드
  const ext = path.extname(file.originalname);
  const fileName = `${userId}/${artworkId}_${Date.now()}${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
      upsert: true,
    });

  if (uploadError) {
    logger.error('Supabase upload error', { error: uploadError.message });
    const error = new Error('이미지 업로드에 실패했습니다.');
    error.status = 500;
    throw error;
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName);

  // 이전 이미지 삭제 (있으면)
  if (artwork.imageUrl) {
    const oldPath = extractStoragePath(artwork.imageUrl);
    if (oldPath) {
      await supabase.storage.from(BUCKET_NAME).remove([oldPath]);
    }
  }

  const updateData = { imageUrl: urlData.publicUrl };
  if (progress !== undefined) {
    updateData.progress = Math.max(0, Math.min(100, Number(progress)));
  }

  return prisma.artwork.update({
    where: { id: artworkId },
    data: updateData,
    include: { design: true },
  });
}

// 작품 완성
async function completeArtwork({ artworkId, userId }) {
  await getOwnArtwork(artworkId, userId);

  // 완성 전 작품 수
  const beforeCount = await prisma.artwork.count({
    where: { userId, status: 'COMPLETED' },
  });

  const artwork = await prisma.artwork.update({
    where: { id: artworkId },
    data: { status: 'COMPLETED', progress: 100 },
    include: { design: true },
  });

  // 완성 후 작품 수
  const afterCount = beforeCount + 1;

  // 첫 작품 완성 시 자동으로 대표 작품 설정
  if (beforeCount === 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { featuredArtworkId: artworkId },
    });
  }

  // 새로 해금된 테마 확인: beforeCount로는 해금 안 됐지만 afterCount로 해금되는 테마
  const unlockedTheme = await prisma.theme.findFirst({
    where: {
      requiredArtworks: { gt: beforeCount, lte: afterCount },
    },
    select: { id: true, name: true, imageUrl: true },
  });

  return { ...artwork, unlockedTheme: unlockedTheme || null };
}

// 내 작품 목록 조회
async function getMyArtworks({ userId, status }) {
  const where = { userId };
  if (status) {
    where.status = status;
  }

  return prisma.artwork.findMany({
    where,
    include: { design: true },
    orderBy: { updatedAt: 'desc' },
  });
}

// 작품 상세 조회
async function getArtworkById({ artworkId, userId }) {
  return getOwnArtwork(artworkId, userId);
}

// 작품 삭제
async function deleteArtwork({ artworkId, userId }) {
  const artwork = await getOwnArtwork(artworkId, userId);

  // Storage 이미지 삭제
  if (artwork.imageUrl) {
    const storagePath = extractStoragePath(artwork.imageUrl);
    if (storagePath) {
      await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
    }
  }

  return prisma.artwork.delete({ where: { id: artworkId } });
}

// 본인 작품 조회 (공통 검증)
async function getOwnArtwork(artworkId, userId) {
  const artwork = await prisma.artwork.findUnique({
    where: { id: artworkId },
    include: { design: true },
  });

  if (!artwork) {
    const error = new Error('작품을 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }

  if (artwork.userId !== userId) {
    const error = new Error('접근 권한이 없습니다.');
    error.status = 403;
    throw error;
  }

  return artwork;
}

// Supabase Storage URL에서 경로 추출
function extractStoragePath(publicUrl) {
  const marker = `/storage/v1/object/public/${BUCKET_NAME}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}

// 대표 작품 선택
async function featureArtwork({ artworkId, userId }) {
  const artwork = await getOwnArtwork(artworkId, userId);

  if (artwork.status !== 'COMPLETED') {
    const error = new Error('완성된 작품만 대표 작품으로 설정할 수 있습니다.');
    error.status = 400;
    throw error;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { featuredArtworkId: artworkId },
  });

  return { featuredArtworkId: artworkId };
}

module.exports = {
  createArtwork,
  saveArtwork,
  completeArtwork,
  getMyArtworks,
  getArtworkById,
  deleteArtwork,
  featureArtwork,
};
