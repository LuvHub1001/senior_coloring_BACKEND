const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const themes = [
  {
    name: '화이트 홀',
    requiredArtworks: 0,
    imageUrl: null,
    buttonColor: '#333D48',
    buttonTextColor: '#FFFFFF',
    sortOrder: 1,
  },
  {
    name: '오페라 홀',
    requiredArtworks: 1,
    imageUrl: null,
    buttonColor: '#FFFFFF',
    buttonTextColor: '#191F28',
    sortOrder: 2,
  },
  {
    name: '에메랄드 홀',
    requiredArtworks: 10,
    imageUrl: null,
    buttonColor: '#FFFFFF',
    buttonTextColor: '#191F28',
    sortOrder: 3,
  },
  {
    name: '골드 홀',
    requiredArtworks: 20,
    imageUrl: null,
    buttonColor: '#FFFFFF',
    buttonTextColor: '#191F28',
    sortOrder: 4,
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
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
