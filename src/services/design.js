const prisma = require('../config/prisma');
const { uploadFile, generateFileName } = require('../utils/storage');
const { MemoryCache } = require('../utils/cache');
const BUCKET_NAME = 'designs';

// 도안 목록 캐시 (TTL 30분 — 도안은 자주 변경되지 않음)
const designCache = new MemoryCache(30 * 60 * 1000);
// 카테고리 목록 캐시 (TTL 30분)
const categoryCache = new MemoryCache(30 * 60 * 1000);

// Supabase Storage에 파일 업로드 후 공개 URL 반환
async function uploadToStorage(file) {
  const fileName = generateFileName(file.originalname);
  return uploadFile(BUCKET_NAME, fileName, file.buffer, file.mimetype);
}

// 도안 이미지 업로드 + DB 저장
async function createDesign({ title, category, description, file, originalFile }) {
  // 도안 이미지 (흑백 윤곽선) 업로드
  const imageUrl = await uploadToStorage(file);

  // 원본 컬러 이미지 업로드 (선택)
  let originalImageUrl = null;
  if (originalFile) {
    originalImageUrl = await uploadToStorage(originalFile);
  }

  // DB에 도안 정보 저장
  const design = await prisma.design.create({
    data: {
      title,
      category,
      description: description || null,
      imageUrl,
      originalImageUrl,
    },
  });

  // 도안 생성 시 캐시 무효화
  designCache.clear();
  categoryCache.clear();

  return design;
}

// 도안 목록 조회
async function getDesigns({ category } = {}) {
  const cacheKey = `designs_${category || 'all'}`;
  const cached = designCache.get(cacheKey);
  if (cached) return cached;

  const where = category ? { category } : {};

  const designs = await prisma.design.findMany({
    where,
    select: {
      id: true,
      title: true,
      category: true,
      description: true,
      imageUrl: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  designCache.set(cacheKey, designs);
  return designs;
}

// 도안 상세 조회
async function getDesignById(id) {
  const design = await prisma.design.findUnique({ where: { id } });

  if (!design) {
    const error = new Error('도안을 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }

  return design;
}

// 카테고리 목록 조회
async function getCategories() {
  const cached = categoryCache.get('categories');
  if (cached) return cached;

  const results = await prisma.design.findMany({
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  });

  const categories = results.map((r) => r.category);
  categoryCache.set('categories', categories);
  return categories;
}

module.exports = { createDesign, getDesigns, getDesignById, getCategories, designCache, categoryCache };
