const { z } = require('zod');

const imageProxy = z.object({
  query: z.object({
    url: z
      .string()
      .min(1, 'url은 필수입니다.')
      .url('올바른 URL 형식이어야 합니다.')
      .refine((url) => {
        try {
          const allowedHost = new URL(process.env.SUPABASE_URL).hostname;
          const requestHost = new URL(url).hostname;
          return requestHost === allowedHost;
        } catch {
          return false;
        }
      }, 'Supabase Storage URL만 허용됩니다.')
      .refine((url) => {
        try {
          return new URL(url).protocol === 'https:';
        } catch {
          return false;
        }
      }, 'HTTPS URL만 허용됩니다.'),
  }),
});

module.exports = { imageProxy };
