const { z } = require('zod');

const ALLOWED_FORMATS = ['webp', 'jpeg', 'png'];
const MAX_WIDTH = 1920;
const MIN_WIDTH = 10;

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
    w: z.coerce
      .number()
      .int('너비는 정수여야 합니다.')
      .min(MIN_WIDTH, `너비는 최소 ${MIN_WIDTH}px입니다.`)
      .max(MAX_WIDTH, `너비는 최대 ${MAX_WIDTH}px입니다.`)
      .optional(),
    q: z.coerce
      .number()
      .int('품질은 정수여야 합니다.')
      .min(1, '품질은 1 이상이어야 합니다.')
      .max(100, '품질은 100 이하여야 합니다.')
      .optional()
      .default(80),
    f: z
      .enum(ALLOWED_FORMATS, {
        errorMap: () => ({ message: `포맷은 ${ALLOWED_FORMATS.join(', ')} 중 하나여야 합니다.` }),
      })
      .optional(),
  }),
});

module.exports = { imageProxy };
