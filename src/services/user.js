const prisma = require('../config/prisma');

// getUserProfile의 select 정의 (공유)
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

  // 닉네임 변경 시 중복 검사
  if (nickname !== undefined) {
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
  }

  if (statusMessage !== undefined) {
    data.statusMessage = statusMessage === '' ? null : statusMessage;
  }

  if (avatarUrl !== undefined) {
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

module.exports = { getUserProfile, updateNickname, updateProfile };
