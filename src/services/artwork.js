const path = require('path');
const prisma = require('../config/prisma');
const { uploadFile, removeFile } = require('../utils/storage');
const { MemoryCache } = require('../utils/cache');
const { createNotification, createNotificationBatch } = require('./notification');
const BUCKET_NAME = 'artworks';

// 프로필 통계 캐시 (TTL 3분, 유저별)
const statsCache = new MemoryCache(3 * 60 * 1000);

// 색칠 시작 (항상 새 작품 생성)
async function createArtwork({ userId, designId, rootArtworkId }) {
  // 도안 존재 여부 확인
  const design = await prisma.design.findUnique({ where: { id: designId } });
  if (!design) {
    const error = new Error('도안을 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }

  // rootArtworkId 검증: 프론트가 보낸 직접 부모 ID를 그대로 저장
  let resolvedRootId = null;

  if (rootArtworkId) {
    const sourceArtwork = await prisma.artwork.findUnique({
      where: { id: rootArtworkId },
      select: { id: true, userId: true },
    });

    if (!sourceArtwork) {
      const error = new Error('원본 작품을 찾을 수 없습니다.');
      error.status = 404;
      throw error;
    }

    if (sourceArtwork.userId !== userId) {
      const error = new Error('접근 권한이 없습니다.');
      error.status = 403;
      throw error;
    }

    resolvedRootId = sourceArtwork.id;
  }

  return prisma.artwork.create({
    data: {
      userId,
      designId,
      rootArtworkId: resolvedRootId,
      status: 'IN_PROGRESS',
    },
    include: { design: { select: { id: true, title: true, imageUrl: true, category: true } } },
  });
}

// 임시 저장 (색칠 진행 이미지 업로드)
async function saveArtwork({ artworkId, userId, file, progress }) {
  const artwork = await getOwnArtwork(artworkId, userId);

  // Supabase Storage에 이미지 업로드
  const ext = path.extname(file.originalname);
  const fileName = `${userId}/${artworkId}_${Date.now()}${ext}`;

  const publicUrl = await uploadFile(BUCKET_NAME, fileName, file.buffer, file.mimetype, { upsert: true });

  // 이전 이미지 삭제 (있으면)
  if (artwork.imageUrl) {
    await removeFile(BUCKET_NAME, artwork.imageUrl);
  }

  const updateData = { imageUrl: publicUrl };
  if (progress !== undefined) {
    updateData.progress = Math.max(0, Math.min(100, Number(progress)));
  }

  return prisma.artwork.update({
    where: { id: artworkId },
    data: updateData,
    include: { design: { select: { id: true, title: true, imageUrl: true, category: true } } },
  });
}

// 작품 완성
async function completeArtwork({ artworkId, userId }) {
  const existingArtwork = await getOwnArtwork(artworkId, userId);

  // 이미 완성된 작품 재저장 → 이미지/상태 유지, 해금 로직 스킵
  if (existingArtwork.status === 'COMPLETED') {
    return { ...existingArtwork, unlockedTheme: null, replacedRoot: false, updatedFeatured: false };
  }

  // 최초 완성 (IN_PROGRESS → COMPLETED)
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { totalCompletedCount: true, featuredArtworkId: true },
  });
  const beforeCount = currentUser.totalCompletedCount;

  // 첫 작품이면 대표 작품 설정도 함께 처리 (user update 1회로 통합)
  const userUpdateData = { totalCompletedCount: { increment: 1 } };
  if (beforeCount === 0) {
    userUpdateData.featuredArtworkId = artworkId;
  }

  const [artwork, user] = await Promise.all([
    prisma.artwork.update({
      where: { id: artworkId },
      data: { status: 'COMPLETED', progress: 100 },
      include: { design: true },
    }),
    prisma.user.update({
      where: { id: userId },
      data: userUpdateData,
      select: { totalCompletedCount: true },
    }),
  ]);

  const afterCount = user.totalCompletedCount;

  // 새로 해금된 테마 확인
  const unlockedTheme = await prisma.theme.findFirst({
    where: {
      requiredArtworks: { gt: beforeCount, lte: afterCount },
    },
    select: { id: true, name: true, imageUrl: true },
  });

  // 원본 작품 교체 처리 (수정하기로 생성된 작품인 경우)
  let replacedRoot = false;
  let updatedFeatured = false;

  if (existingArtwork.rootArtworkId) {
    const rootId = existingArtwork.rootArtworkId;

    // 원본이 대표 작품이면 새 작품으로 교체
    if (currentUser.featuredArtworkId === rootId) {
      await prisma.user.update({
        where: { id: userId },
        data: { featuredArtworkId: artworkId },
      });
      updatedFeatured = true;
    }

    // 원본 작품 삭제 (Storage 이미지 + 전시 + DB)
    const rootArtwork = await prisma.artwork.findUnique({
      where: { id: rootId },
      select: { userId: true, imageUrl: true },
    });

    if (rootArtwork && rootArtwork.userId === userId) {
      if (rootArtwork.imageUrl) {
        await removeFile(BUCKET_NAME, rootArtwork.imageUrl);
      }

      await prisma.$transaction(async (tx) => {
        await tx.exhibition.deleteMany({ where: { artworkId: rootId } });
        await tx.communityLike.deleteMany({ where: { artworkId: rootId } });
        await tx.artwork.delete({ where: { id: rootId } });
      });

      replacedRoot = true;
    }
  }

  return { ...artwork, unlockedTheme: unlockedTheme || null, replacedRoot, updatedFeatured };
}

// 내 작품 목록 조회 (limit 지정 시 최근 N개만 반환)
async function getMyArtworks({ userId, status, limit }) {
  const where = { userId };
  if (status) {
    where.status = status;
  }

  return prisma.artwork.findMany({
    where,
    select: {
      id: true,
      title: true,
      imageUrl: true,
      progress: true,
      status: true,
      isPublic: true,
      likeCount: true,
      rootArtworkId: true,
      updatedAt: true,
      createdAt: true,
      design: { select: { id: true, title: true, imageUrl: true, category: true } },
    },
    orderBy: { updatedAt: 'desc' },
    ...(limit && { take: limit }),
  });
}

// 작품 상세 조회
async function getArtworkById({ artworkId, userId }) {
  return getOwnArtwork(artworkId, userId);
}

// 작품 삭제
async function deleteArtwork({ artworkId, userId }) {
  const artwork = await getOwnArtwork(artworkId, userId, { includeDesign: false });

  // Storage 이미지 삭제
  if (artwork.imageUrl) {
    await removeFile(BUCKET_NAME, artwork.imageUrl);
  }
  // 트랜잭션으로 연관 데이터 정리 후 삭제
  return prisma.$transaction(async (tx) => {
    // 대표 작품인 경우 해제
    await tx.user.updateMany({
      where: { featuredArtworkId: artworkId },
      data: { featuredArtworkId: null },
    });

    // 연결된 전시 삭제
    await tx.exhibition.deleteMany({
      where: { artworkId },
    });

    // 커뮤니티 좋아요 삭제
    await tx.communityLike.deleteMany({
      where: { artworkId },
    });

    return tx.artwork.delete({ where: { id: artworkId } });
  });
}

// 본인 작품 조회 (공통 검증, includeDesign으로 JOIN 제어 — 필요한 필드만 select)
async function getOwnArtwork(artworkId, userId, { includeDesign = true } = {}) {
  const artwork = await prisma.artwork.findUnique({
    where: { id: artworkId },
    ...(includeDesign && {
      include: { design: { select: { id: true, title: true, imageUrl: true, category: true } } },
    }),
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

// 작품 공개/비공개 전환
async function publishArtwork({ artworkId, userId, isPublic, title }) {
  const artwork = await getOwnArtwork(artworkId, userId);

  if (artwork.status !== 'COMPLETED') {
    const error = new Error('완성된 작품만 갤러리에 공개할 수 있습니다.');
    error.status = 400;
    throw error;
  }

  const data = { isPublic, updatedAt: artwork.updatedAt };
  if (title !== undefined) data.title = title;
  if (isPublic) data.publishedAt = new Date();

  // 공개 상태 변경 시 통계 캐시 무효화
  statsCache.invalidate(`stats_${userId}`);

  // 자랑 취소 시 좋아요 데이터 초기화 (트랜잭션)
  if (!isPublic) {
    data.likeCount = 0;

    const [updated] = await prisma.$transaction([
      prisma.artwork.update({
        where: { id: artworkId },
        data,
        select: { id: true, isPublic: true, title: true, publishedAt: true },
      }),
      prisma.communityLike.deleteMany({
        where: { artworkId },
      }),
    ]);

    return { artworkId: updated.id, isPublic: updated.isPublic, title: updated.title, publishedAt: updated.publishedAt };
  }

  const updated = await prisma.artwork.update({
    where: { id: artworkId },
    data,
    select: { id: true, isPublic: true, title: true, publishedAt: true },
  });

  // 공개 전환 시 팔로워에게 알림 일괄 생성
  if (isPublic) {
    const [followers, publisher] = await Promise.all([
      prisma.follow.findMany({
        where: { followingId: userId },
        select: { followerId: true },
      }),
      prisma.user.findUnique({ where: { id: userId }, select: { nickname: true } }),
    ]);
    const nickname = publisher?.nickname || '관심 작가';
    createNotificationBatch(
      followers.map((f) => ({
        userId: f.followerId,
        targetUserId: userId,
        type: 'artwork',
        title: '새 작품',
        message: `관심 작가인 ${nickname}님이 작품을 자랑했어요`,
        artworkId: updated.id,
      })),
    );
  }

  return { artworkId: updated.id, isPublic: updated.isPublic, title: updated.title, publishedAt: updated.publishedAt };
}

// 자랑한 작품 목록 조회 (본인이 공개한 작품)
async function getPublishedArtworks({ userId, sort, page, size }) {
  page = Number(page) || 1;
  size = Number(size) || 20;
  const skip = (page - 1) * size;

  const where = { userId, status: 'COMPLETED', isPublic: true };

  const orderByMap = {
    likes: [{ likeCount: 'desc' }, { publishedAt: 'desc' }],
    oldest: [{ publishedAt: 'asc' }],
  };
  const orderBy = orderByMap[sort] || [{ publishedAt: 'desc' }];

  const [artworks, totalCount] = await Promise.all([
    prisma.artwork.findMany({
      where,
      select: {
        id: true,
        title: true,
        imageUrl: true,
        likeCount: true,
        createdAt: true,
        publishedAt: true,
        design: { select: { title: true } },
      },
      orderBy,
      skip,
      take: size,
    }),
    prisma.artwork.count({ where }),
  ]);

  // 좋아요 여부를 배치로 조회 (작품별 서브쿼리 N개 → 단일 IN 쿼리 1개)
  let likedSet = new Set();
  if (artworks.length > 0) {
    const likedRecords = await prisma.communityLike.findMany({
      where: {
        userId,
        artworkId: { in: artworks.map((a) => a.id) },
      },
      select: { artworkId: true },
    });
    likedSet = new Set(likedRecords.map((l) => l.artworkId));
  }

  const totalPages = Math.ceil(totalCount / size);

  return {
    content: artworks.map((a) => ({
      artworkId: a.id,
      title: a.title || a.design.title,
      imageUrl: a.imageUrl,
      likeCount: a.likeCount,
      isLiked: likedSet.has(a.id),
      createdAt: a.createdAt,
      publishedAt: a.publishedAt,
    })),
    page,
    size,
    totalElements: totalCount,
    last: page >= totalPages,
  };
}

// 프로필 통계 (자랑한 작품 수, 받은 좋아요 합산) — 유저별 3분 캐싱
async function getPublishedStats(userId) {
  const cacheKey = `stats_${userId}`;
  const cached = statsCache.get(cacheKey);
  if (cached) return cached;

  const [result, user] = await Promise.all([
    prisma.artwork.aggregate({
      where: { userId, status: 'COMPLETED', isPublic: true },
      _count: { id: true },
      _sum: { likeCount: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { followerCount: true },
    }),
  ]);

  const stats = {
    publishedCount: result._count.id,
    totalLikesReceived: result._sum.likeCount || 0,
    followerCount: user?.followerCount || 0,
  };

  statsCache.set(cacheKey, stats);
  return stats;
}

module.exports = {
  createArtwork,
  saveArtwork,
  completeArtwork,
  getMyArtworks,
  getArtworkById,
  deleteArtwork,
  featureArtwork,
  publishArtwork,
  getPublishedArtworks,
  getPublishedStats,
  statsCache,
};
