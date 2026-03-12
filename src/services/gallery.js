const prisma = require('../config/prisma');

// 갤러리 작품 목록 조회 (커서 기반이 아닌 오프셋 페이지네이션 - 프론트 요구사항)
async function getGalleryArtworks({ sort, page, size, userId }) {
  const skip = (page - 1) * size;

  const orderBy =
    sort === 'popular'
      ? [{ likeCount: 'desc' }, { createdAt: 'desc' }]
      : [{ createdAt: 'desc' }];

  const [artworks, totalCount] = await Promise.all([
    prisma.artwork.findMany({
      where: { status: 'COMPLETED', imageUrl: { not: null } },
      select: {
        id: true,
        imageUrl: true,
        likeCount: true,
        createdAt: true,
        design: { select: { title: true } },
        user: { select: { nickname: true } },
        ...(userId && {
          likes: {
            where: { userId },
            select: { id: true },
          },
        }),
      },
      orderBy,
      skip,
      take: size,
    }),
    prisma.artwork.count({
      where: { status: 'COMPLETED', imageUrl: { not: null } },
    }),
  ]);

  return {
    artworks: artworks.map((a) => ({
      id: a.id,
      imageUrl: a.imageUrl,
      title: a.design.title,
      authorName: a.user.nickname,
      createdAt: a.createdAt,
      likeCount: a.likeCount,
      isLiked: userId ? a.likes?.length > 0 : false,
    })),
    pagination: {
      page,
      size,
      totalCount,
      totalPages: Math.ceil(totalCount / size),
    },
  };
}

// 오늘의 인기 작품 (오늘 받은 좋아요 기준 상위)
async function getPopularArtworks({ size, userId }) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // 오늘 좋아요를 많이 받은 작품 조회
  const popularArtworkIds = await prisma.galleryLike.groupBy({
    by: ['artworkId'],
    where: { createdAt: { gte: todayStart } },
    _count: { artworkId: true },
    orderBy: { _count: { artworkId: 'desc' } },
    take: size,
  });

  if (popularArtworkIds.length === 0) {
    // 오늘 좋아요가 없으면 전체 인기순 fallback
    return getGalleryArtworks({ sort: 'popular', page: 1, size, userId }).then(
      (result) => result.artworks,
    );
  }

  const ids = popularArtworkIds.map((g) => g.artworkId);

  const artworks = await prisma.artwork.findMany({
    where: { id: { in: ids }, status: 'COMPLETED' },
    select: {
      id: true,
      imageUrl: true,
      likeCount: true,
      createdAt: true,
      design: { select: { title: true } },
      user: { select: { nickname: true } },
      ...(userId && {
        likes: {
          where: { userId },
          select: { id: true },
        },
      }),
    },
  });

  // 오늘의 좋아요 수 순서 유지
  const orderMap = new Map(ids.map((id, i) => [id, i]));
  artworks.sort((a, b) => orderMap.get(a.id) - orderMap.get(b.id));

  return artworks.map((a) => ({
    id: a.id,
    imageUrl: a.imageUrl,
    title: a.design.title,
    authorName: a.user.nickname,
    createdAt: a.createdAt,
    likeCount: a.likeCount,
    isLiked: userId ? a.likes?.length > 0 : false,
  }));
}

// 작품 상세 조회
async function getGalleryArtworkDetail({ artworkId, userId }) {
  const artwork = await prisma.artwork.findUnique({
    where: { id: artworkId },
    select: {
      id: true,
      imageUrl: true,
      likeCount: true,
      createdAt: true,
      status: true,
      design: { select: { title: true } },
      user: { select: { nickname: true } },
      ...(userId && {
        likes: {
          where: { userId },
          select: { id: true },
        },
      }),
    },
  });

  if (!artwork || artwork.status !== 'COMPLETED') {
    const error = new Error('작품을 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }

  return {
    id: artwork.id,
    imageUrl: artwork.imageUrl,
    title: artwork.design.title,
    authorName: artwork.user.nickname,
    createdAt: artwork.createdAt,
    likeCount: artwork.likeCount,
    isLiked: userId ? artwork.likes?.length > 0 : false,
  };
}

// 좋아요 토글
async function toggleLike({ artworkId, userId }) {
  // 작품 존재 + COMPLETED 확인
  const artwork = await prisma.artwork.findUnique({
    where: { id: artworkId },
    select: { id: true, status: true },
  });

  if (!artwork || artwork.status !== 'COMPLETED') {
    const error = new Error('작품을 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }

  // 기존 좋아요 확인
  const existingLike = await prisma.galleryLike.findUnique({
    where: { userId_artworkId: { userId, artworkId } },
  });

  if (existingLike) {
    // 좋아요 취소
    await prisma.$transaction([
      prisma.galleryLike.delete({ where: { id: existingLike.id } }),
      prisma.artwork.update({
        where: { id: artworkId },
        data: { likeCount: { decrement: 1 } },
      }),
    ]);

    const updated = await prisma.artwork.findUnique({
      where: { id: artworkId },
      select: { likeCount: true },
    });

    return { isLiked: false, likeCount: updated.likeCount };
  }

  // 좋아요 추가
  await prisma.$transaction([
    prisma.galleryLike.create({
      data: { userId, artworkId },
    }),
    prisma.artwork.update({
      where: { id: artworkId },
      data: { likeCount: { increment: 1 } },
    }),
  ]);

  const updated = await prisma.artwork.findUnique({
    where: { id: artworkId },
    select: { likeCount: true },
  });

  return { isLiked: true, likeCount: updated.likeCount };
}

module.exports = {
  getGalleryArtworks,
  getPopularArtworks,
  getGalleryArtworkDetail,
  toggleLike,
};
