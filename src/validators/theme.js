const { z } = require('zod');

const selectTheme = z.object({
  body: z.object({
    themeId: z.coerce.number().int().positive('themeId는 양의 정수여야 합니다.'),
  }),
});

const themeParams = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});

module.exports = { selectTheme, themeParams };
