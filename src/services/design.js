const prisma = require('../config/prisma');
const supabase = require('../config/supabase');
const path = require('path');
const crypto = require('crypto');
const logger = require('../config/logger');
const BUCKET_NAME = 'designs';

// Supabase Storage에 파일 업로드 후 공개 URL 반환
async function uploadToStorage(file) {
  const ext = path.extname(file.originalname);
  const fileName = `${crypto.randomUUID()}${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file.buffer, {
      contentType: file.mimetype,
    });

  if (uploadError) {
    logger.error('Supabase upload error', { error: uploadError.message });
    const error = new Error('이미지 업로드에 실패했습니다.');
    error.status = 500;
    throw error;
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName);

  return urlData.publicUrl;
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

  return design;
}

// 도안 목록 조회
async function getDesigns({ category } = {}) {
  const where = category ? { category } : {};

  return prisma.design.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
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
  const results = await prisma.design.findMany({
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  });

  return results.map((r) => r.category);
}

module.exports = { createDesign, getDesigns, getDesignById, getCategories };
