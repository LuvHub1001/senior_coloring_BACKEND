const { z } = require('zod');

const listNotifications = z.object({
  query: z.object({
    type: z.enum(['like', 'artwork', 'follow']).optional(),
  }),
});

module.exports = { listNotifications };
