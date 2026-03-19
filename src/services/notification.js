const prisma = require('../config/prisma');
const logger = require('../config/logger');

// 알림 목록 조회 (최근 30일, 페이지네이션)
async function getNotifications({ userId, type, page = 1, size = 20 }) {
  page = Number(page) || 1;
  size = Number(size) || 20;
  const skip = (page - 1) * size;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const where = { userId, createdAt: { gte: thirtyDaysAgo } };
  if (type) {
    where.type = type;
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        isRead: true,
        createdAt: true,
        targetUserId: true,
        targetUser: { select: { nickname: true, avatarUrl: true } },
        artwork: { select: { imageUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: size,
    }),
    // unreadCount는 type 필터와 무관하게 전체 읽지 않은 수
    prisma.notification.count({
      where: { userId, isRead: false, createdAt: { gte: thirtyDaysAgo } },
    }),
  ]);

  // artworkImageUrl 평탄화
  const content = notifications.map(({ artwork, ...rest }) => ({
    ...rest,
    artworkImageUrl: artwork?.imageUrl || null,
  }));

  return { content, unreadCount };
}

// 개별 읽기
async function readNotification({ notificationId, userId }) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { userId: true, isRead: true },
  });

  if (!notification || notification.userId !== userId) {
    const error = new Error('알림을 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }

  if (!notification.isRead) {
    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }
}

// 모두 읽기
async function readAllNotifications({ userId }) {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

// 알림 생성 (내부 호출용 — 실패해도 비즈니스 로직을 중단하지 않음)
async function createNotification({ userId, targetUserId, type, title, message, artworkId }) {
  try {
    await prisma.notification.create({
      data: { userId, targetUserId, type, title, message, artworkId: artworkId || null },
    });
  } catch (err) {
    logger.error('알림 생성 실패', { userId, type, error: err.message });
  }
}

// 알림 배치 생성 (팔로워 다수에게 동시 발송)
async function createNotificationBatch(notifications) {
  try {
    if (notifications.length === 0) return;
    await prisma.notification.createMany({ data: notifications });
  } catch (err) {
    logger.error('알림 배치 생성 실패', { count: notifications.length, error: err.message });
  }
}

module.exports = { getNotifications, readNotification, readAllNotifications, createNotification, createNotificationBatch };
