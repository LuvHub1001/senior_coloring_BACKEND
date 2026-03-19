const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const themes = [
  {
    name: '화이트 홀',
    requiredArtworks: 0,
    imageUrl: null,
    textColor: '#191F28',
    sortOrder: 1,
  },
  {
    name: '오페라 홀',
    requiredArtworks: 1,
    imageUrl: null,
    textColor: '#FFFFFF',
    sortOrder: 2,
  },
  {
    name: '에메랄드 홀',
    requiredArtworks: 10,
    imageUrl: null,
    textColor: '#FFFFFF',
    sortOrder: 3,
  },
  {
    name: '골드 홀',
    requiredArtworks: 20,
    imageUrl: null,
    textColor: '#FFFFFF',
    sortOrder: 4,
  },
];

// E2E 테스트 전용 계정 (프로덕션 배포 시 test-login 엔드포인트가 비활성화되므로 안전)
const testUsers = [
  {
    email: 'e2e-test@artispace.co.kr',
    nickname: 'E2E테스터',
    avatarUrl: '🧪',
    provider: 'test',
    providerId: 'e2e-test-001',
    role: 'USER',
  },
  {
    email: 'admin@artispace.co.kr',
    nickname: '관리자',
    avatarUrl: '🔧',
    provider: 'test',
    providerId: 'e2e-admin-001',
    role: 'ADMIN',
  },
];

async function main() {
  for (const theme of themes) {
    await prisma.theme.upsert({
      where: { name: theme.name },
      update: theme,
      create: theme,
    });
  }
  console.log('테마 시드 데이터 등록 완료');

  for (const user of testUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { role: user.role },
      create: user,
    });
  }
  console.log('E2E 테스트 계정 등록 완료');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
