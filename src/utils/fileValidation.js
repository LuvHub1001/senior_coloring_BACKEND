const FileType = require('file-type');

// 허용되는 이미지 MIME 타입과 매직 바이트 매핑
const ALLOWED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
]);

// SVG에서 위험한 태그/속성 패턴 (XSS 방지)
const SVG_DANGEROUS_PATTERNS = [
  /<script[\s>]/i,
  /on\w+\s*=/i,                   // onclick, onerror 등 이벤트 핸들러
  /javascript\s*:/i,
  /<iframe[\s>]/i,
  /<embed[\s>]/i,
  /<object[\s>]/i,
  /<foreignObject[\s>]/i,
  /xlink:href\s*=\s*["'](?!#|data:image\/)/i,  // 외부 참조 차단 (내부 #ref, data:image/* Base64 임베딩은 허용)
  /href\s*=\s*["']javascript:/i,
  /<use[^>]+href\s*=\s*["'](?!#)/i,
  /<!\[CDATA\[/i,                  // CDATA 블록 (스크립트 우회 방지)
  /<!--.*?<script/is,              // HTML 주석 내 스크립트 삽입 방지
  /@import\b/i,                    // CSS @import를 통한 외부 리소스 로드 차단
  /<!ENTITY/i,                     // XML External Entity (XXE) 차단
  /<!DOCTYPE[^>]+SYSTEM/i,         // 외부 DTD 참조 차단
];

/**
 * 파일 버퍼의 실제 타입을 매직 바이트로 검증
 * @param {Buffer} buffer - 파일 버퍼
 * @param {string} declaredMime - 클라이언트가 선언한 MIME 타입
 * @returns {{ valid: boolean, error?: string }}
 */
async function validateImageBuffer(buffer, declaredMime) {
  // SVG는 텍스트 기반이므로 별도 처리
  if (declaredMime === 'image/svg+xml') {
    return validateSvg(buffer);
  }

  // 매직 바이트 검증
  const detected = await FileType.fromBuffer(buffer);
  if (!detected) {
    return { valid: false, error: '파일 형식을 인식할 수 없습니다.' };
  }

  // 허용 목록 확인
  if (!ALLOWED_IMAGE_TYPES.has(detected.mime)) {
    return { valid: false, error: `허용되지 않는 파일 형식입니다: ${detected.mime}` };
  }

  // 선언된 MIME과 실제 MIME 일치 확인
  if (detected.mime !== declaredMime) {
    return { valid: false, error: '파일 내용이 선언된 형식과 일치하지 않습니다.' };
  }

  return { valid: true };
}

/**
 * SVG 파일의 위험 요소 검증
 * @param {Buffer} buffer
 * @returns {{ valid: boolean, error?: string }}
 */
function validateSvg(buffer) {
  const content = buffer.toString('utf-8');

  // SVG 태그 존재 확인
  if (!/<svg[\s>]/i.test(content)) {
    return { valid: false, error: '유효한 SVG 파일이 아닙니다.' };
  }

  // 위험한 패턴 검사
  for (const pattern of SVG_DANGEROUS_PATTERNS) {
    if (pattern.test(content)) {
      return { valid: false, error: '보안상 허용되지 않는 SVG 콘텐츠가 포함되어 있습니다.' };
    }
  }

  return { valid: true };
}

module.exports = { validateImageBuffer, validateSvg };
