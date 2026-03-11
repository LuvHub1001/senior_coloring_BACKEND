const { z } = require('zod');

const imageProxy = z.object({
  query: z.object({
    url: z
      .string()
      .min(1, 'url은 필수입니다.')
      .url('올바른 URL 형식이어야 합니다.')
      .refine(
        (url) => url.startsWith(process.env.SUPABASE_URL),
        'Supabase Storage URL만 허용됩니다.',
      ),
  }),
});

module.exports = { imageProxy };
