const { PrismaClient } = require('@prisma/client');

// PrismaClient 싱글톤: 커넥션 풀 고갈 방지
const prisma = global.__prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

module.exports = prisma;
