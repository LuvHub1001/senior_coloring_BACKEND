const passport = require('passport');
const KakaoStrategy = require('passport-kakao').Strategy;
const { Strategy: NaverStrategy } = require('passport-naver-v2');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// 카카오 로그인
passport.use(
  new KakaoStrategy(
    {
      clientID: process.env.KAKAO_CLIENT_ID,
      clientSecret: process.env.KAKAO_CLIENT_SECRET,
      callbackURL: process.env.KAKAO_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile._json?.kakao_account?.email || null;
        const nickname = profile.displayName || '사용자';
        const avatarUrl = profile._json?.properties?.profile_image || null;

        const user = await findOrCreateUser({
          email,
          nickname,
          avatarUrl,
          provider: 'kakao',
          providerId: String(profile.id),
        });

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    },
  ),
);

// 네이버 로그인 (키가 설정된 경우에만 활성화)
if (process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET) {
  passport.use(
    new NaverStrategy(
      {
        clientID: process.env.NAVER_CLIENT_ID,
        clientSecret: process.env.NAVER_CLIENT_SECRET,
        callbackURL: process.env.NAVER_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.email || null;
          const nickname = profile.nickname || '사용자';
          const avatarUrl = profile.profileImage || null;

          const user = await findOrCreateUser({
            email,
            nickname,
            avatarUrl,
            provider: 'naver',
            providerId: String(profile.id),
          });

          return done(null, user);
        } catch (err) {
          return done(err);
        }
      },
    ),
  );
}

// provider + providerId로 사용자 식별
async function findOrCreateUser({ email, nickname, avatarUrl, provider, providerId }) {
  let user = await prisma.user.findUnique({
    where: {
      provider_providerId: { provider, providerId },
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: { email, nickname, avatarUrl, provider, providerId },
    });
    return { ...user, isNew: true };
  }

  return { ...user, isNew: false };
}

module.exports = passport;
