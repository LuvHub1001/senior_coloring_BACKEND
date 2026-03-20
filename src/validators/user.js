const { z } = require('zod');

// 닉네임 검증 스키마 (공유)
const nicknameSchema = z
  .string()
  .min(1, '닉네임은 1자 이상이어야 합니다.')
  .max(16, '닉네임은 16자 이하여야 합니다.')
  .trim()
  .regex(/^[a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ\s._-]+$/, '닉네임에 허용되지 않는 문자가 포함되어 있습니다.');

const updateNickname = z.object({
  body: z.object({
    nickname: nicknameSchema,
  }),
});

const updateProfile = z.object({
  body: z.object({
    nickname: nicknameSchema.optional(),
    statusMessage: z.string().trim().min(1, '상태 메시지는 1자 이상이어야 합니다.').max(30, '상태 메시지는 30자 이내로 입력해주세요.').optional(),
    avatarUrl: z.string().trim().max(255, 'avatarUrl은 255자 이하여야 합니다.').nullable().optional(),
  }),
});

const userIdParams = z.object({
  params: z.object({
    userId: z.string().uuid('유효한 사용자 ID가 아닙니다.'),
  }),
});

const listUserPublishedArtworks = z.object({
  params: z.object({
    userId: z.string().uuid('유효한 사용자 ID가 아닙니다.'),
  }),
  query: z.object({
    sort: z.enum(['recent', 'likes', 'oldest']).default('recent'),
    page: z.coerce.number().int().min(1).max(100, '페이지는 최대 100까지 조회 가능합니다.').default(1),
    size: z.coerce.number().int().min(1).max(50).default(20),
  }),
});

module.exports = { updateNickname, updateProfile, userIdParams, listUserPublishedArtworks };
