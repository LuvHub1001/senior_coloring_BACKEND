const { PrismaClient } = require('@prisma/client');
const supabase = require('../config/supabase');
const path = require('path');
const crypto = require('crypto');

const prisma = new PrismaClient();
const BUCKET_NAME = 'designs';

// 도안 이미지 업로드 + DB 저장
async function createDesign({ title, category, description, file }) {
  // 고유 파일명 생성
  const ext = path.extname(file.originalname);
  const fileName = `${crypto.randomUUID()}${ext}`;
  const filePath = fileName;

  // Supabase Storage에 업로드
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file.buffer, {
      contentType: file.mimetype,
    });

  if (uploadError) {
    console.error('Supabase upload error:', uploadError);
    const error = new Error('이미지 업로드에 실패했습니다.');
    error.status = 500;
    throw error;
  }

  // 공개 URL 가져오기
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  // DB에 도안 정보 저장
  const design = await prisma.design.create({
    data: {
      title,
      category,
      description: description || null,
      imageUrl: urlData.publicUrl,
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

module.exports = { createDesign, getDesigns, getDesignById };
