const { z } = require('zod');

const updateNickname = z.object({
  body: z.object({
    nickname: z
      .string()
      .min(1, '닉네임은 1자 이상이어야 합니다.')
      .max(20, '닉네임은 20자 이하여야 합니다.')
      .trim()
      .regex(/^[a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ\s._-]+$/, '닉네임에 허용되지 않는 문자가 포함되어 있습니다.'),
  }),
});

module.exports = { updateNickname };
