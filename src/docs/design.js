/**
 * @swagger
 * tags:
 *   name: Designs
 *   description: 컬러링 도안 관리
 */

/**
 * @swagger
 * /api/designs:
 *   post:
 *     tags: [Designs]
 *     summary: 도안 등록
 *     description: 새 컬러링 도안 업로드 (흑백 윤곽선 이미지 필수, 원본 컬러 이미지 선택)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *               - title
 *               - category
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: "도안 이미지 (PNG, JPEG, WEBP, SVG / 최대 5MB)"
 *               originalImage:
 *                 type: string
 *                 format: binary
 *                 description: "원본 컬러 이미지 (PNG, JPEG, WEBP, SVG / 최대 5MB)"
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *                 example: 장미꽃
 *               category:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 example: 꽃
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: 아름다운 장미꽃 도안
 *     responses:
 *       201:
 *         description: 도안 등록 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Design'
 *       400:
 *         description: 입력값 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       401:
 *         description: 인증 실패
 *       413:
 *         description: 파일 크기 초과 (5MB)
 *
 *   get:
 *     tags: [Designs]
 *     summary: 도안 목록 조회
 *     description: 전체 도안 목록 조회. category 파라미터로 필터링 가능
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           maxLength: 50
 *         description: "카테고리 필터 (예: 꽃, 동물)"
 *     responses:
 *       200:
 *         description: 도안 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Design'
 */

/**
 * @swagger
 * /api/designs/categories:
 *   get:
 *     tags: [Designs]
 *     summary: 카테고리 목록 조회
 *     description: 등록된 도안의 카테고리 목록 반환
 *     responses:
 *       200:
 *         description: 카테고리 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: [꽃, 동물, 풍경]
 */

/**
 * @swagger
 * /api/designs/{id}:
 *   get:
 *     tags: [Designs]
 *     summary: 도안 상세 조회
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 도안 ID
 *     responses:
 *       200:
 *         description: 도안 상세 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Design'
 *       404:
 *         description: 도안을 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
