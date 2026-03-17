const { z } = require('zod');

const listCommunityArtworks = z.object({
  query: z.object({
    sort: z.enum(['popular', 'recent']).default('recent'),
    page: z.coerce.number().int().min(1).default(1),
    size: z.coerce.number().int().min(1).max(50).default(20),
  }),
});

const popularCommunityArtworks = z.object({
  query: z.object({
    size: z.coerce.number().int().min(1).max(30).default(10),
  }),
});

const communityArtworkParams = z.object({
  params: z.object({
    artworkId: z.string().uuid('유효한 작품 ID가 아닙니다.'),
  }),
});

module.exports = { listCommunityArtworks, popularCommunityArtworks, communityArtworkParams };
