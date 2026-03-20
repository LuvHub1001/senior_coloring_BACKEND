const { z } = require('zod');

const listCommunityArtworks = z.object({
  query: z.object({
    sort: z.enum(['popular', 'recent']).default('recent'),
    page: z.coerce.number().int().min(1).max(100, '페이지는 최대 100까지 조회 가능합니다.').default(1),
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

const reportArtwork = z.object({
  params: z.object({
    artworkId: z.string().uuid('유효한 작품 ID가 아닙니다.'),
  }),
  body: z.object({
    reason: z.string().trim().min(1, '신고 사유는 필수입니다.').max(500, '신고 사유는 500자 이하여야 합니다.'),
  }),
});

module.exports = { listCommunityArtworks, popularCommunityArtworks, communityArtworkParams, reportArtwork };
