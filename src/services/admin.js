const prisma = require('../config/prisma');
const { uploadFile, generateFileName, removeFile } = require('../utils/storage');
const { themeCache } = require('./theme');

const DESIGN_BUCKET = 'designs';
const THEME_BUCKET = 'themes';
const ARTWORK_BUCKET = 'artworks';

// ── 대시보드 통계 ──

async function getStats() {
  const [totalUsers, totalDesigns, totalThemes, totalArtworks] = await Promise.all([
    prisma.user.count(),
    prisma.design.count(),
    prisma.theme.count(),
    prisma.artwork.count(),
  ]);

  return { totalUsers, totalDesigns, totalThemes, totalArtworks };
}

// ── 도안 관리 ──

async function getDesigns({ page: rawPage, pageSize: rawPageSize, search }) {
  const page = Number(rawPage) || 1;
  const pageSize = Number(rawPageSize) || 20;

  const where = search
    ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  const [data, totalCount] = await Promise.all([
    prisma.design.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        category: true,
        imageUrl: true,
        originalImageUrl: true,
        description: true,
        createdAt: true,
      },
    }),
    prisma.design.count({ where }),
  ]);

  return { data, totalCount, page, pageSize };
}

async function createDesign({ title, category, description, file, originalFile }) {
  const fileName = generateFileName(file.originalname);
  const imageUrl = await uploadFile(DESIGN_BUCKET, fileName, file.buffer, file.mimetype);

  let originalImageUrl = null;
  if (originalFile) {
    const origName = generateFileName(originalFile.originalname);
    originalImageUrl = await uploadFile(DESIGN_BUCKET, origName, originalFile.buffer, originalFile.mimetype);
  }

  return prisma.design.create({
    data: {
      title,
      category,
      description: description || null,
      imageUrl,
      originalImageUrl,
    },
  });
}

async function updateDesign(id, { title, category, description, file, originalFile }) {
  const design = await prisma.design.findUnique({ where: { id } });
  if (!design) {
    const error = new Error('도안을 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }

  const data = {};
  if (title !== undefined) data.title = title;
  if (category !== undefined) data.category = category;
  if (description !== undefined) data.description = description || null;

  // 도안 이미지 교체
  if (file) {
    const fileName = generateFileName(file.originalname);
    data.imageUrl = await uploadFile(DESIGN_BUCKET, fileName, file.buffer, file.mimetype);
    await removeFile(DESIGN_BUCKET, design.imageUrl);
  }

  // 원본 이미지 교체
  if (originalFile) {
    const origName = generateFileName(originalFile.originalname);
    data.originalImageUrl = await uploadFile(DESIGN_BUCKET, origName, originalFile.buffer, originalFile.mimetype);
    if (design.originalImageUrl) {
      await removeFile(DESIGN_BUCKET, design.originalImageUrl);
    }
  }

  return prisma.design.update({
    where: { id },
    data,
    select: {
      id: true,
      title: true,
      category: true,
      imageUrl: true,
      originalImageUrl: true,
      description: true,
      createdAt: true,
    },
  });
}

async function deleteDesign(id) {
  const design = await prisma.design.findUnique({ where: { id } });
  if (!design) {
    const error = new Error('도안을 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }

  // 연결된 작품이 있는지 확인
  const artworkCount = await prisma.artwork.count({ where: { designId: id } });
  if (artworkCount > 0) {
    const error = new Error('해당 도안에 연결된 작품이 존재하여 삭제할 수 없습니다.');
    error.status = 409;
    throw error;
  }

  // 스토리지에서 이미지 삭제
  await removeFile(DESIGN_BUCKET, design.imageUrl);
  if (design.originalImageUrl) {
    await removeFile(DESIGN_BUCKET, design.originalImageUrl);
  }

  await prisma.design.delete({ where: { id } });
}

// ── 테마 관리 ──

async function getThemes({ page: rawPage, pageSize: rawPageSize, search }) {
  const page = Number(rawPage) || 1;
  const pageSize = Number(rawPageSize) || 20;

  const where = search
    ? { name: { contains: search, mode: 'insensitive' } }
    : {};

  const [data, totalCount] = await Promise.all([
    prisma.theme.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.theme.count({ where }),
  ]);

  const items = data.map((theme) => ({
    id: theme.id,
    name: theme.name,
    requiredArtworks: theme.requiredArtworks,
    imageUrl: theme.imageUrl,
    buttonColor: theme.buttonColor,
    buttonTextColor: theme.buttonTextColor,
    textColor: theme.textColor,
    toggleType: theme.toggleType,
  }));

  return { data: items, totalCount, page, pageSize };
}

async function createTheme({ name, requiredArtworks, buttonColor, buttonTextColor, textColor, toggleType, file }) {
  // 중복 이름 검사
  const existing = await prisma.theme.findUnique({ where: { name } });
  if (existing) {
    const error = new Error('이미 존재하는 테마 이름입니다.');
    error.status = 409;
    throw error;
  }

  let imageUrl = null;
  if (file) {
    const fileName = generateFileName(file.originalname);
    imageUrl = await uploadFile(THEME_BUCKET, fileName, file.buffer, file.mimetype);
  }

  const theme = await prisma.theme.create({
    data: {
      name,
      requiredArtworks: requiredArtworks || 0,
      buttonColor: buttonColor || null,
      buttonTextColor: buttonTextColor || null,
      textColor: textColor || null,
      toggleType: toggleType || 'LIGHT',
      imageUrl,
    },
  });

  themeCache.invalidate('all');
  return theme;
}

async function updateTheme(id, { name, requiredArtworks, buttonColor, buttonTextColor, textColor, toggleType, file }) {
  const theme = await prisma.theme.findUnique({ where: { id } });
  if (!theme) {
    const error = new Error('테마를 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }

  // 이름 변경 시 중복 검사 (자기 자신 제외)
  if (name !== undefined && name !== theme.name) {
    const existing = await prisma.theme.findUnique({ where: { name } });
    if (existing) {
      const error = new Error('이미 존재하는 테마 이름입니다.');
      error.status = 409;
      throw error;
    }
  }

  const data = {};
  if (name !== undefined) data.name = name;
  if (requiredArtworks !== undefined) data.requiredArtworks = requiredArtworks;
  if (buttonColor !== undefined) data.buttonColor = buttonColor;
  if (buttonTextColor !== undefined) data.buttonTextColor = buttonTextColor;
  if (textColor !== undefined) data.textColor = textColor;
  if (toggleType !== undefined) data.toggleType = toggleType;

  // 배경 이미지 교체
  if (file) {
    const fileName = generateFileName(file.originalname);
    data.imageUrl = await uploadFile(THEME_BUCKET, fileName, file.buffer, file.mimetype);
    if (theme.imageUrl) {
      await removeFile(THEME_BUCKET, theme.imageUrl);
    }
  }

  const updated = await prisma.theme.update({
    where: { id },
    data,
  });

  themeCache.invalidate('all');

  return {
    id: updated.id,
    name: updated.name,
    requiredArtworks: updated.requiredArtworks,
    imageUrl: updated.imageUrl,
    buttonColor: updated.buttonColor,
    buttonTextColor: updated.buttonTextColor,
    textColor: updated.textColor,
    toggleType: updated.toggleType,
  };
}

async function deleteTheme(id) {
  const theme = await prisma.theme.findUnique({ where: { id } });
  if (!theme) {
    const error = new Error('테마를 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }

  // 해당 테마를 선택 중인 유저가 있으면 선택 해제
  await prisma.user.updateMany({
    where: { selectedThemeId: id },
    data: { selectedThemeId: null },
  });

  // 스토리지에서 이미지 삭제
  if (theme.imageUrl) {
    await removeFile(THEME_BUCKET, theme.imageUrl);
  }

  await prisma.theme.delete({ where: { id } });
  themeCache.invalidate('all');
}

// ── 회원 관리 ──

async function getUsers({ page: rawPage, pageSize: rawPageSize, search }) {
  const page = Number(rawPage) || 1;
  const pageSize = Number(rawPageSize) || 20;

  const where = search
    ? {
        OR: [
          { nickname: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  const [data, totalCount] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        nickname: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
        _count: { select: { artworks: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  const items = data.map((user) => ({
    id: user.id,
    nickname: user.nickname,
    email: user.email,
    avatarUrl: user.avatarUrl,
    artworkCount: user._count.artworks,
    createdAt: user.createdAt,
  }));

  return { data: items, totalCount, page, pageSize };
}

// ── 작품 관리 ──

async function getArtworks({ page: rawPage, pageSize: rawPageSize, search }) {
  const page = Number(rawPage) || 1;
  const pageSize = Number(rawPageSize) || 20;

  const where = search
    ? {
        OR: [
          { user: { nickname: { contains: search, mode: 'insensitive' } } },
          { design: { title: { contains: search, mode: 'insensitive' } } },
        ],
      }
    : {};

  const [data, totalCount] = await Promise.all([
    prisma.artwork.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        userId: true,
        imageUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { nickname: true } },
        design: { select: { title: true } },
      },
    }),
    prisma.artwork.count({ where }),
  ]);

  const items = data.map((artwork) => ({
    id: artwork.id,
    userId: artwork.userId,
    nickname: artwork.user.nickname,
    designTitle: artwork.design.title,
    imageUrl: artwork.imageUrl,
    status: artwork.status,
    createdAt: artwork.createdAt,
    updatedAt: artwork.updatedAt,
  }));

  return { data: items, totalCount, page, pageSize };
}

async function deleteArtwork(artworkId) {
  const artwork = await prisma.artwork.findUnique({ where: { id: artworkId } });
  if (!artwork) {
    const error = new Error('작품을 찾을 수 없습니다.');
    error.status = 404;
    throw error;
  }

  // 스토리지에서 이미지 삭제
  if (artwork.imageUrl) {
    await removeFile(ARTWORK_BUCKET, artwork.imageUrl);
  }

  // 트랜잭션으로 연관 데이터 정리 후 삭제
  await prisma.$transaction(async (tx) => {
    // 대표 작품인 경우 해제
    await tx.user.updateMany({
      where: { featuredArtworkId: artworkId },
      data: { featuredArtworkId: null },
    });

    // 전시 삭제
    await tx.exhibition.deleteMany({ where: { artworkId } });

    // 갤러리 좋아요 삭제
    await tx.galleryLike.deleteMany({ where: { artworkId } });

    // 작품 삭제
    await tx.artwork.delete({ where: { id: artworkId } });
  });
}

module.exports = {
  getStats,
  getDesigns,
  createDesign,
  updateDesign,
  deleteDesign,
  getThemes,
  createTheme,
  updateTheme,
  deleteTheme,
  getUsers,
  getArtworks,
  deleteArtwork,
};
