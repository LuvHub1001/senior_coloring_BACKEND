const { z } = require('zod');

const paginationQuery = {
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
};

const listDesigns = z.object({
  query: z.object(paginationQuery),
});

const createDesign = z.object({
  body: z.object({
    title: z.string().min(1, 'title은 필수입니다.').max(100, 'title은 100자 이하여야 합니다.'),
    category: z.string().min(1, 'category는 필수입니다.').max(50, 'category는 50자 이하여야 합니다.'),
    description: z.string().max(500, 'description은 500자 이하여야 합니다.').optional(),
  }),
});

const updateDesign = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    title: z.string().min(1, 'title은 1자 이상이어야 합니다.').max(100, 'title은 100자 이하여야 합니다.').optional(),
    category: z.string().min(1, 'category는 1자 이상이어야 합니다.').max(50, 'category는 50자 이하여야 합니다.').optional(),
    description: z.string().max(500, 'description은 500자 이하여야 합니다.').optional(),
  }),
});

const deleteDesign = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});

const listThemes = z.object({
  query: z.object(paginationQuery),
});

const createTheme = z.object({
  body: z.object({
    name: z.string().min(1, 'name은 필수입니다.').max(50, 'name은 50자 이하여야 합니다.'),
    requiredArtworks: z.coerce.number().int().min(0).default(0),
    textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, '올바른 HEX 색상 코드를 입력해 주세요.').optional(),
    toggleType: z.enum(['LIGHT', 'DARK']).default('LIGHT'),
  }),
});

const updateTheme = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    name: z.string().min(1, 'name은 1자 이상이어야 합니다.').max(50, 'name은 50자 이하여야 합니다.').optional(),
    requiredArtworks: z.coerce.number().int().min(0).optional(),
    textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, '올바른 HEX 색상 코드를 입력해 주세요.').optional(),
    toggleType: z.enum(['LIGHT', 'DARK']).optional(),
  }),
});

const deleteTheme = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});

const listUsers = z.object({
  query: z.object(paginationQuery),
});

const listArtworks = z.object({
  query: z.object(paginationQuery),
});

const deleteArtwork = z.object({
  params: z.object({
    id: z.string().uuid('올바른 작품 ID 형식이 아닙니다.'),
  }),
});

const createRecommendation = z.object({
  body: z.object({
    designId: z.coerce.number().int().positive('designId는 필수입니다.'),
  }),
});

const deleteRecommendation = z.object({
  params: z.object({
    id: z.string().uuid('올바른 추천 배너 ID 형식이 아닙니다.'),
  }),
});

const createNotice = z.object({
  body: z.object({
    title: z.string().min(1, 'title은 필수입니다.').max(100, 'title은 100자 이하여야 합니다.'),
    content: z.string().min(1, 'content는 필수입니다.').max(2000, 'content는 2000자 이하여야 합니다.'),
  }),
});

const deleteNotice = z.object({
  params: z.object({
    id: z.string().uuid('올바른 공지 ID 형식이 아닙니다.'),
  }),
});

module.exports = {
  listDesigns,
  createDesign,
  updateDesign,
  deleteDesign,
  listThemes,
  createTheme,
  updateTheme,
  deleteTheme,
  listUsers,
  listArtworks,
  deleteArtwork,
  createRecommendation,
  deleteRecommendation,
  createNotice,
  deleteNotice,
};
