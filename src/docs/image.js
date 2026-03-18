/**
 * @swagger
 * tags:
 *   name: Images
 *   description: 이미지 프록시 (Supabase Storage CORS 우회 + 리사이징)
 */

/**
 * @swagger
 * /api/images/proxy:
 *   get:
 *     tags: [Images]
 *     summary: 이미지 프록시
 *     description: Supabase Storage 이미지를 프록시하여 CORS 우회 및 리사이즈/포맷 변환 지원. Supabase URL만 허용 (SSRF 방어)
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *           format: uri
 *         description: "Supabase Storage 이미지 URL (HTTPS만 허용)"
 *       - in: query
 *         name: w
 *         schema:
 *           type: integer
 *           minimum: 10
 *           maximum: 1920
 *         description: "리사이즈 너비 (px). 원본보다 크면 확대하지 않음"
 *       - in: query
 *         name: q
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 80
 *         description: "이미지 품질 (1~100, 기본 80)"
 *       - in: query
 *         name: f
 *         schema:
 *           type: string
 *           enum: [webp, jpeg, png]
 *         description: 출력 포맷 변환
 *     responses:
 *       200:
 *         description: 이미지 바이너리 응답
 *         content:
 *           image/webp:
 *             schema:
 *               type: string
 *               format: binary
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *           image/svg+xml:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: "잘못된 URL 또는 허용되지 않는 파일 형식"
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: 내부 네트워크 접근 차단 (SSRF 방어)
 *       413:
 *         description: 이미지 크기 초과 (10MB)
 *       504:
 *         description: 이미지 요청 시간 초과 (10초)
 */
