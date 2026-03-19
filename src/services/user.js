const prisma = require('../config/prisma');
const { createNotification } = require('./notification');

// getUserProfile의 select 정의 (공유)
const NICKNAME_COOLDOWN_DAYS = 7;

const USER_PROFILE_SELECT = {
  id: true,
  nickname: true,
  avatarUrl: true,
  statusMessage: true,
  email: true,
  role: true,
  selectedThemeId: true,
  selectedTheme: { select: { id: true, name: true, toggleType: true } },
  featuredArtworkId: true,
  featuredArtwork: { select: { id: true, imageUrl: true } },
  nicknameChangedAt: true,
  createdAt: true,
};

async function getUserProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_PROFILE_SELECT,
  });

  if (!user) {
    const error = new Error('사용자를 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }

  return user;
}

// 닉네임 변경
async function updateNickname(userId, nickname) {
  try {
    return await prisma.user.update({
      where: { id: userId },
      data: { nickname },
      select: USER_PROFILE_SELECT,
    });
  } catch (err) {
    if (err.code === 'P2025') {
      const error = new Error('사용자를 찾을 수 없습니다.');
      error.status = 404;
      throw error;
    }
    throw err;
  }
}

// 프로필 수정 (닉네임, 상태 메시지, 아바타)
async function updateProfile(userId, { nickname, statusMessage, avatarUrl }) {
  const data = {};

  // 닉네임 변경 시 쿨다운 + 중복 검사
  if (nickname !== undefined) {
    // 현재 유저 조회 (닉네임 동일 여부 + 쿨다운 확인)
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { nickname: true, nicknameChangedAt: true },
    });

    // 닉네임이 실제로 변경되는 경우에만 쿨다운 체크
    if (currentUser && nickname !== currentUser.nickname) {
      // 7일 쿨다운 검사
      if (currentUser.nicknameChangedAt) {
        const cooldownEnd = new Date(currentUser.nicknameChangedAt.getTime() + NICKNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
        if (new Date() < cooldownEnd) {
          const error = new Error('닉네임 변경 후 7일간 재변경이 불가합니다.');
          error.status = 429;
          error.code = 'NICKNAME_CHANGE_COOLDOWN';
          error.availableAt = cooldownEnd;
          throw error;
        }
      }

      // 중복 검사
      const existing = await prisma.user.findFirst({
        where: { nickname, id: { not: userId } },
        select: { id: true },
      });
      if (existing) {
        const error = new Error('이미 사용 중인 닉네임입니다.');
        error.status = 409;
        throw error;
      }

      data.nickname = nickname;
      data.nicknameChangedAt = new Date();
    }
  }

  if (statusMessage !== undefined) {
    data.statusMessage = statusMessage === '' ? null : statusMessage;
  }

  if (avatarUrl !== undefined) {
    if (avatarUrl !== null) {
      const isEmoji = avatarUrl.length <= 12 && /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]+$/u.test(avatarUrl);
      if (!isEmoji) {
        const error = new Error('avatarUrl은 이모지만 허용됩니다.');
        error.status = 400;
        throw error;
      }
    }
    data.avatarUrl = avatarUrl;
  }

  try {
    return await prisma.user.update({
      where: { id: userId },
      data,
      select: USER_PROFILE_SELECT,
    });
  } catch (err) {
    if (err.code === 'P2025') {
      const error = new Error('사용자를 찾을 수 없습니다.');
      error.status = 404;
      throw error;
    }
    throw err;
  }
}

// 타인 프로필 조회 (user + stats 병렬 조회)
async function getPublicProfile({ targetUserId, currentUserId }) {
  const [user, stats] = await Promise.all([
    prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        nickname: true,
        avatarUrl: true,
        statusMessage: true,
        followerCount: true,
        ...(currentUserId && {
          followers: {
            where: { followerId: currentUserId },
            select: { id: true },
          },
        }),
      },
    }),
    prisma.artwork.aggregate({
      where: { userId: targetUserId, status: 'COMPLETED', isPublic: true },
      _count: { id: true },
      _sum: { likeCount: true },
    }),
  ]);

  if (!user) {
    const error = new Error('사용자를 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }

  return {
    id: user.id,
    nickname: user.nickname,
    avatarUrl: user.avatarUrl,
    statusMessage: user.statusMessage,
    publishedCount: stats._count.id,
    totalLikesReceived: stats._sum.likeCount || 0,
    followerCount: user.followerCount,
    isFollowing: currentUserId ? user.followers?.length > 0 : false,
  };
}

// 타인의 자랑한 작품 목록
async function getUserPublishedArtworks({ targetUserId, currentUserId, sort, page, size }) {
  page = Number(page) || 1;
  size = Number(size) || 20;
  const skip = (page - 1) * size;

  // 대상 유저 존재 확인
  const userExists = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true },
  });
  if (!userExists) {
    const error = new Error('사용자를 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }

  const where = { userId: targetUserId, status: 'COMPLETED', isPublic: true };

  const orderByMap = {
    popular: [{ likeCount: 'desc' }, { publishedAt: 'desc' }],
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
        ...(currentUserId && {
          likes: {
            where: { userId: currentUserId },
            select: { id: true },
          },
        }),
      },
      orderBy,
      skip,
      take: size,
    }),
    prisma.artwork.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / size);

  return {
    content: artworks.map((a) => ({
      artworkId: a.id,
      title: a.title || a.design.title,
      imageUrl: a.imageUrl,
      likeCount: a.likeCount,
      isLiked: currentUserId ? a.likes?.length > 0 : false,
      createdAt: a.createdAt,
      publishedAt: a.publishedAt,
    })),
    page,
    size,
    totalElements: totalCount,
    last: page >= totalPages,
  };
}

// 팔로우
async function followUser({ followerId, followingId }) {
  if (followerId === followingId) {
    const error = new Error('자기 자신을 팔로우할 수 없습니다.');
    error.status = 400;
    throw error;
  }

  // 대상 유저 존재 확인 + 팔로워 닉네임 조회 (알림용, 병렬)
  const [targetUser, followerUser] = await Promise.all([
    prisma.user.findUnique({ where: { id: followingId }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: followerId }, select: { nickname: true } }),
  ]);
  if (!targetUser) {
    const error = new Error('사용자를 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }

  // 이미 팔로우 중인지 확인
  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });
  if (existing) {
    const error = new Error('이미 팔로우한 사용자입니다.');
    error.status = 409;
    throw error;
  }

  const [, updated] = await prisma.$transaction([
    prisma.follow.create({ data: { followerId, followingId } }),
    prisma.user.update({
      where: { id: followingId },
      data: { followerCount: { increment: 1 } },
      select: { followerCount: true },
    }),
  ]);

  // 팔로우 알림 생성 (follow 타입은 artworkId 없음)
  const followerNickname = followerUser?.nickname || '알 수 없는 사용자';
  createNotification({
    userId: followingId,
    targetUserId: followerId,
    type: 'follow',
    title: '새 관심 작가',
    message: `${followerNickname}님이 나를 관심 작가로 등록했어요`,
  });

  return { isFollowing: true, followerCount: updated.followerCount };
}

// 언팔로우
async function unfollowUser({ followerId, followingId }) {
  if (followerId === followingId) {
    const error = new Error('자기 자신을 언팔로우할 수 없습니다.');
    error.status = 400;
    throw error;
  }

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });
  if (!existing) {
    const error = new Error('팔로우하지 않은 사용자입니다.');
    error.status = 404;
    throw error;
  }

  const [, updated] = await prisma.$transaction([
    prisma.follow.delete({ where: { id: existing.id } }),
    prisma.user.update({
      where: { id: followingId },
      data: { followerCount: { decrement: 1 } },
      select: { followerCount: true },
    }),
  ]);

  return { isFollowing: false, followerCount: updated.followerCount };
}

module.exports = {
  getUserProfile,
  updateNickname,
  updateProfile,
  getPublicProfile,
  getUserPublishedArtworks,
  followUser,
  unfollowUser,
};
