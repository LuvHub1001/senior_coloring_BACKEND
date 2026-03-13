const { z } = require('zod');

const createArtwork = z.object({
  body: z.object({
    designId: z.coerce.number().int().positive('designId는 양의 정수여야 합니다.'),
    rootArtworkId: z.string().uuid().optional(),
  }),
});

const saveArtwork = z.object({
  params: z.object({
    id: z.string().uuid('유효한 작품 ID가 아닙니다.'),
  }),
  body: z.object({
    progress: z.coerce.number().min(0).max(100).optional(),
  }),
});

const artworkParams = z.object({
  params: z.object({
    id: z.string().uuid('유효한 작품 ID가 아닙니다.'),
  }),
});

const listArtworks = z.object({
  query: z.object({
    status: z.enum(['IN_PROGRESS', 'COMPLETED']).optional(),
  }),
});

const publishArtwork = z.object({
  params: z.object({
    id: z.string().uuid('유효한 작품 ID가 아닙니다.'),
  }),
  body: z.object({
    isPublic: z.boolean(),
  }),
});

module.exports = { createArtwork, saveArtwork, artworkParams, listArtworks, publishArtwork };
