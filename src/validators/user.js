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
    statusMessage: z.string().max(50, '상태 메시지는 50자 이하여야 합니다.').optional(),
    avatarUrl: z.string().url('올바른 URL 형식이 아닙니다.').nullable().optional(),
  }),
});

module.exports = { updateNickname, updateProfile };
