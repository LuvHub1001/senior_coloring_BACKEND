const { PrismaClient } = require('@prisma/client');

// PrismaClient 싱글톤: 커넥션 풀 고갈 방지
const prisma = global.__prisma || new PrismaClient({
  // 개별 쿼리 타임아웃 10초, 전체 트랜잭션 타임아웃 30초
  transactionOptions: {
    maxWait: 5000,
    timeout: 30000,
  },
});

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

module.exports = prisma;
