const prisma = require('../config/prisma');

async function getUserProfile(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nickname: true,
      avatarUrl: true,
      email: true,
      role: true,
      selectedThemeId: true,
      selectedTheme: { select: { id: true, name: true, toggleType: true } },
      featuredArtworkId: true,
      featuredArtwork: { select: { id: true, imageUrl: true } },
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
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { nickname },
      select: { id: true },
    });
    return getUserProfile(userId);
  } catch (err) {
    if (err.code === 'P2025') {
      const error = new Error('사용자를 찾을 수 없습니다.');
      error.status = 404;
      throw error;
    }
    throw err;
  }
}

module.exports = { getUserProfile, updateNickname };
