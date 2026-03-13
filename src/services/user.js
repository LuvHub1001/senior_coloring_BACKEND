const prisma = require('../config/prisma');

async function getUserProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nickname: true,
      avatarUrl: true,
      email: true,
      selectedThemeId: true,
      selectedTheme: true,
      featuredArtworkId: true,
      createdAt: true,
    },
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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    const error = new Error('사용자를 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { nickname },
    select: { id: true, nickname: true },
  });

  return updated;
}

module.exports = { getUserProfile, updateNickname };
