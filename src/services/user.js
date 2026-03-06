const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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

module.exports = { getUserProfile };
