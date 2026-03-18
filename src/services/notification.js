const prisma = require('../config/prisma');
const logger = require('../config/logger');

// 알림 목록 조회 (최근 30일)
async function getNotifications({ userId, type }) {
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
      },
      orderBy: { createdAt: 'desc' },
    }),
    // unreadCount는 type 필터와 무관하게 전체 읽지 않은 수
    prisma.notification.count({
      where: { userId, isRead: false, createdAt: { gte: thirtyDaysAgo } },
    }),
  ]);

  return { content: notifications, unreadCount };
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
async function createNotification({ userId, targetUserId, type, title, message }) {
  try {
    await prisma.notification.create({
      data: { userId, targetUserId, type, title, message },
    });
  } catch (err) {
    logger.error('알림 생성 실패', { userId, type, error: err.message });
  }
}

module.exports = { getNotifications, readNotification, readAllNotifications, createNotification };
