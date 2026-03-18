const { z } = require('zod');

const listNotifications = z.object({
  query: z.object({
    type: z.enum(['like', 'artwork', 'follow']).optional(),
  }),
});

const notificationParams = z.object({
  params: z.object({
    notificationId: z.string().uuid('유효한 알림 ID가 아닙니다.'),
  }),
});

module.exports = { listNotifications, notificationParams };
