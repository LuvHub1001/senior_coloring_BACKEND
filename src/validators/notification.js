const { z } = require('zod');

const listNotifications = z.object({
  query: z.object({
    type: z.enum(['like', 'artwork', 'follow']).optional(),
    page: z.coerce.number().int().min(1).max(100, '페이지는 최대 100까지 조회 가능합니다.').default(1),
    size: z.coerce.number().int().min(1).max(50).default(20),
  }),
});

const notificationParams = z.object({
  params: z.object({
    notificationId: z.string().uuid('유효한 알림 ID가 아닙니다.'),
  }),
});

module.exports = { listNotifications, notificationParams };
