const { z } = require('zod');

const createTheme = z.object({
  body: z.object({
    name: z.string().min(1, '테마 이름은 필수입니다.').max(50),
    requiredArtworks: z.coerce.number().int().min(0).default(0),
    textColor: z.string().max(20).optional(),
    toggleType: z.enum(['LIGHT', 'DARK']).default('LIGHT'),
    sortOrder: z.coerce.number().int().min(0).default(0),
  }),
});

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

module.exports = { createTheme, selectTheme, themeParams };
