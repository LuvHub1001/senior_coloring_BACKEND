const { z } = require('zod');

const createDesign = z.object({
  body: z.object({
    title: z.string().min(1, 'title은 필수입니다.').max(100, 'title은 100자 이하여야 합니다.'),
    category: z.string().min(1, 'category는 필수입니다.').max(50, 'category는 50자 이하여야 합니다.'),
    description: z.string().max(500, 'description은 500자 이하여야 합니다.').optional(),
  }),
});

const listDesigns = z.object({
  query: z.object({
    category: z.string().max(50).optional(),
  }),
});

const designParams = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});

module.exports = { createDesign, listDesigns, designParams };
