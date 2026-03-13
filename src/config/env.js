const { z } = require('zod');

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Supabase
  SUPABASE_URL: z.string().url('SUPABASE_URL이 필요합니다.'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY가 필요합니다.'),
  DATABASE_URL: z.string()
    .min(1, 'DATABASE_URL이 필요합니다.')
    .refine((url) => url.startsWith('postgresql://') || url.startsWith('postgres://'), {
      message: 'DATABASE_URL은 postgresql:// 또는 postgres:// 형식이어야 합니다.',
    }),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET은 최소 32자 이상이어야 합니다.'),

  // OAuth (선택: 설정되지 않으면 해당 provider 비활성화)
  KAKAO_CLIENT_ID: z.string().optional(),
  KAKAO_CLIENT_SECRET: z.string().optional(),
  KAKAO_CALLBACK_URL: z.string().url().optional(),
  NAVER_CLIENT_ID: z.string().optional(),
  NAVER_CLIENT_SECRET: z.string().optional(),
  NAVER_CALLBACK_URL: z.string().url().optional(),

  // Client (CORS origin, 쉼표 구분으로 여러 도메인 허용 — 프로덕션에서는 필수)
  CLIENT_URL: z.string().min(1).default('http://localhost:5173'),
}).refine((data) => {
  if (data.NODE_ENV === 'production' && data.CLIENT_URL === 'http://localhost:5173') {
    return false;
  }
  return true;
}, {
  message: 'CLIENT_URL은 프로덕션 환경에서 반드시 설정해야 합니다.',
  path: ['CLIENT_URL'],
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    console.error(`환경변수 검증 실패:\n${errors}`);
    process.exit(1);
  }

  return result.data;
}

module.exports = { validateEnv };
