const path = require('path');
const crypto = require('crypto');
const supabase = require('../config/supabase');
const logger = require('../config/logger');

/**
 * Supabase Storage에 파일 업로드 후 공개 URL 반환
 * @param {string} bucketName - 스토리지 버킷 이름
 * @param {string} fileName - 저장할 파일명 (경로 포함 가능)
 * @param {Buffer} buffer - 파일 버퍼
 * @param {string} contentType - MIME 타입
 * @param {Object} [options] - 추가 옵션 (upsert 등)
 * @returns {Promise<string>} 공개 URL
 */
async function uploadFile(bucketName, fileName, buffer, contentType, options = {}) {
  const { error: uploadError } = await supabase.storage
    .from(bucketName)
    .upload(fileName, buffer, { contentType, ...options });

  if (uploadError) {
    logger.error('Supabase upload error', { bucket: bucketName, error: uploadError.message });
    const error = new Error('이미지 업로드에 실패했습니다.');
    error.status = 500;
    throw error;
  }

  const { data: urlData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

/**
 * 랜덤 파일명 생성 (UUID + 원본 확장자)
 * @param {string} originalname - 원본 파일명
 * @param {string} [prefix] - 파일명 앞에 붙일 접두어
 * @returns {string}
 */
function generateFileName(originalname, prefix) {
  const ext = path.extname(originalname);
  const uuid = crypto.randomUUID();
  return prefix ? `${prefix}_${uuid}${ext}` : `${uuid}${ext}`;
}

/**
 * Supabase Storage URL에서 버킷 내 경로 추출
 * @param {string} bucketName - 스토리지 버킷 이름
 * @param {string} publicUrl - 공개 URL
 * @returns {string|null} 버킷 내 경로
 */
function extractStoragePath(bucketName, publicUrl) {
  const marker = `/storage/v1/object/public/${bucketName}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}

/**
 * Supabase Storage에서 파일 삭제
 * @param {string} bucketName - 스토리지 버킷 이름
 * @param {string} publicUrl - 삭제할 파일의 공개 URL
 */
async function removeFile(bucketName, publicUrl) {
  const storagePath = extractStoragePath(bucketName, publicUrl);
  if (storagePath) {
    await supabase.storage.from(bucketName).remove([storagePath]);
  }
}

module.exports = { uploadFile, generateFileName, extractStoragePath, removeFile };
