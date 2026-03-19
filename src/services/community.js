const prisma = require('../config/prisma');
const { MemoryCache } = require('../utils/cache');
const { createNotification } = require('./notification');
const { statsCache } = require('./artwork');

// 인기 작품 캐시 (TTL 5분)
const popularCache = new MemoryCache(5 * 60 * 1000);
// 커뮤니티 총 개수 캐시 (TTL 1분)
const countCache = new MemoryCache(60 * 1000);

// 커뮤니티 작품 목록 조회 (공개된 완성 작품만)
async function getCommunityArtworks({ sort, page, size, userId }) {
  page = Number(page) || 1;
  size = Number(size) || 20;
  const skip = (page - 1) * size;
  const where = { status: 'COMPLETED', isPublic: true, imageUrl: { not: null } };

  const orderBy =
    sort === 'popular'
      ? [{ likeCount: 'desc' }, { publishedAt: 'desc' }]
      : [{ publishedAt: 'desc' }];

  let totalCount = countCache.get('community');
  const [artworks, freshCount] = await Promise.all([
    prisma.artwork.findMany({
      where,
      select: {
        id: true,
        title: true,
        imageUrl: true,
        likeCount: true,
        createdAt: true,
        design: { select: { title: true } },
        user: { select: { id: true, nickname: true } },
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
    totalCount != null ? Promise.resolve(totalCount) : prisma.artwork.count({ where }),
  ]);
  if (totalCount == null) {
    totalCount = freshCount;
    countCache.set('community', totalCount);
  }

  const totalPages = Math.ceil(totalCount / size);

  return {
    content: artworks.map((a) => ({
      artworkId: a.id,
      title: a.title || a.design.title,
      imageUrl: a.imageUrl,
      author: {
        id: a.user.id,
        nickname: a.user.nickname,
      },
      likeCount: a.likeCount,
      isLiked: userId ? a.likes?.length > 0 : false,
      createdAt: a.createdAt,
    })),
    page: page - 1, // 0-based page (프론트 무한스크롤 대응)
    size,
    totalElements: totalCount,
    totalPages,
    last: page >= totalPages,
  };
}

// 이번 주 인기 작품 (최근 7일 받은 좋아요 기준 상위)
async function getPopularArtworks({ size, userId }) {
  size = Number(size);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);

  // 이번 주 좋아요를 많이 받은 작품 조회 (캐시)
  const cacheKey = `popular_${size}`;
  let popularArtworkIds = popularCache.get(cacheKey);
  if (!popularArtworkIds) {
    popularArtworkIds = await prisma.communityLike.groupBy({
      by: ['artworkId'],
      where: { createdAt: { gte: weekAgo } },
      _count: { artworkId: true },
      orderBy: { _count: { artworkId: 'desc' } },
      take: size,
    });
    popularCache.set(cacheKey, popularArtworkIds);
  }

  if (popularArtworkIds.length === 0) {
    // 이번 주 좋아요가 없으면 전체 인기순 fallback
    const result = await getCommunityArtworks({ sort: 'popular', page: 1, size, userId });
    return result.content;
  }

  const ids = popularArtworkIds.map((g) => g.artworkId);

  const artworks = await prisma.artwork.findMany({
    where: { id: { in: ids }, status: 'COMPLETED', isPublic: true },
    select: {
      id: true,
      title: true,
      imageUrl: true,
      likeCount: true,
      createdAt: true,
      design: { select: { title: true } },
      user: { select: { id: true, nickname: true } },
      ...(userId && {
        likes: {
          where: { userId },
          select: { id: true },
        },
      }),
    },
  });

  // 이번 주 좋아요 수 순서 유지
  const orderMap = new Map(ids.map((id, i) => [id, i]));
  artworks.sort((a, b) => orderMap.get(a.id) - orderMap.get(b.id));

  return artworks.map((a) => ({
    artworkId: a.id,
    title: a.title || a.design.title,
    imageUrl: a.imageUrl,
    author: {
      id: a.user.id,
      nickname: a.user.nickname,
    },
    likeCount: a.likeCount,
    isLiked: userId ? a.likes?.length > 0 : false,
    createdAt: a.createdAt,
  }));
}

// 작품 상세 조회
async function getCommunityArtworkDetail({ artworkId, userId }) {
  const [artwork, lastLikeRecord] = await Promise.all([
    prisma.artwork.findUnique({
      where: { id: artworkId },
      select: {
        id: true,
        title: true,
        imageUrl: true,
        likeCount: true,
        createdAt: true,
        status: true,
        isPublic: true,
        design: { select: { id: true, title: true, imageUrl: true } },
        user: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
            ...(userId && {
              followers: {
                where: { followerId: userId },
                select: { id: true },
              },
            }),
          },
        },
        ...(userId && {
          likes: {
            where: { userId },
            select: { id: true },
          },
        }),
      },
    }),
    // 마지막 좋아요 유저 조회
    prisma.communityLike.findFirst({
      where: { artworkId },
      orderBy: { createdAt: 'desc' },
      select: {
        user: { select: { id: true, nickname: true, avatarUrl: true } },
      },
    }),
  ]);

  if (!artwork || artwork.status !== 'COMPLETED' || !artwork.isPublic) {
    const error = new Error('작품을 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }

  const isOwnArtwork = userId ? artwork.user.id === userId : false;

  return {
    artworkId: artwork.id,
    title: artwork.title || artwork.design.title,
    imageUrl: artwork.imageUrl,
    author: {
      id: artwork.user.id,
      nickname: artwork.user.nickname,
      avatarUrl: artwork.user.avatarUrl || null,
    },
    likeCount: artwork.likeCount,
    isLiked: userId ? artwork.likes?.length > 0 : false,
    isFollowing: userId && !isOwnArtwork ? artwork.user.followers?.length > 0 : false,
    createdAt: artwork.createdAt,
    isOwnArtwork,
    lastLiker: lastLikeRecord
      ? {
          id: lastLikeRecord.user.id,
          nickname: lastLikeRecord.user.nickname,
          avatarUrl: lastLikeRecord.user.avatarUrl || null,
        }
      : null,
    design: {
      id: artwork.design.id,
      title: artwork.design.title,
      imageUrl: artwork.design.imageUrl,
    },
  };
}

// 좋아요 토글
async function toggleLike({ artworkId, userId }) {
  // 작품 존재 + COMPLETED + 공개 확인 + 좋아요 여부를 한 번에 조회
  const artwork = await prisma.artwork.findUnique({
    where: { id: artworkId },
    select: {
      id: true,
      userId: true,
      title: true,
      status: true,
      isPublic: true,
      design: { select: { title: true } },
      likes: {
        where: { userId },
        select: { id: true },
      },
    },
  });

  if (!artwork || artwork.status !== 'COMPLETED' || !artwork.isPublic) {
    const error = new Error('작품을 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }

  const existingLike = artwork.likes[0];

  if (existingLike) {
    // 좋아요 취소 — update에서 반환값으로 likeCount 획득
    const [, updated] = await prisma.$transaction([
      prisma.communityLike.delete({ where: { id: existingLike.id } }),
      prisma.artwork.update({
        where: { id: artworkId },
        data: { likeCount: { decrement: 1 } },
        select: { likeCount: true },
      }),
    ]);

    countCache.invalidate('community');
    statsCache.invalidate(`stats_${artwork.userId}`);
    return { isLiked: false, likeCount: updated.likeCount };
  }

  // 좋아요 추가
  const [, updated] = await prisma.$transaction([
    prisma.communityLike.create({
      data: { userId, artworkId },
    }),
    prisma.artwork.update({
      where: { id: artworkId },
      data: { likeCount: { increment: 1 } },
      select: { likeCount: true },
    }),
  ]);

  // 본인 작품이 아닌 경우에만 알림 생성
  if (artwork.userId !== userId) {
    const liker = await prisma.user.findUnique({ where: { id: userId }, select: { nickname: true } });
    const artworkTitle = artwork.title || artwork.design.title;
    const nickname = liker?.nickname || '알 수 없는 사용자';
    createNotification({
      userId: artwork.userId,
      targetUserId: userId,
      type: 'like',
      title: '좋아요',
      message: `${nickname}님이 내 작품 '${artworkTitle}'을 좋아해요`,
      artworkId: artwork.id,
    });
  }

  countCache.invalidate('community');
  statsCache.invalidate(`stats_${artwork.userId}`);
  return { isLiked: true, likeCount: updated.likeCount };
}

// 작품 신고
async function reportArtwork({ artworkId, userId, reason }) {
  // 작품 존재 + 공개 확인
  const artwork = await prisma.artwork.findUnique({
    where: { id: artworkId },
    select: { id: true, userId: true, status: true, isPublic: true },
  });

  if (!artwork || artwork.status !== 'COMPLETED' || !artwork.isPublic) {
    const error = new Error('작품을 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }

  // 자기 작품 신고 방지
  if (artwork.userId === userId) {
    const error = new Error('본인 작품은 신고할 수 없습니다.');
    error.status = 400;
    throw error;
  }

  // 중복 신고 방지
  try {
    await prisma.artworkReport.create({
      data: { artworkId, reporterId: userId, reason },
    });
  } catch (err) {
    if (err.code === 'P2002') {
      const error = new Error('이미 신고한 작품입니다.');
      error.status = 409;
      throw error;
    }
    throw err;
  }
}

module.exports = {
  getCommunityArtworks,
  getPopularArtworks,
  getCommunityArtworkDetail,
  toggleLike,
  reportArtwork,
  popularCache,
  countCache,
};
