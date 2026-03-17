/**
 * @swagger
 * tags:
 *   name: Themes
 *   description: 전시관 테마 관리
 */

/**
 * @swagger
 * /api/themes:
 *   post:
 *     tags: [Themes]
 *     summary: 테마 생성
 *     description: 새 전시관 테마 생성 (이름 중복 불가, 배경 이미지 선택)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: "배경 이미지 (PNG, JPEG, WEBP, SVG / 최대 10MB)"
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 example: 봄 정원
 *               requiredArtworks:
 *                 type: integer
 *                 description: "해금에 필요한 완성 작품 수 (기본값: 0)"
 *                 example: 3
 *               textColor:
 *                 type: string
 *                 maxLength: 20
 *                 example: "#333333"
 *               toggleType:
 *                 type: string
 *                 enum: [LIGHT, DARK]
 *                 description: "기본값: LIGHT"
 *               sortOrder:
 *                 type: integer
 *                 description: "정렬 순서 (기본값: 0)"
 *     responses:
 *       201:
 *         description: 테마 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Theme'
 *       400:
 *         description: 입력값 오류
 *       401:
 *         description: 인증 실패
 *       409:
 *         description: 이미 존재하는 테마 이름
 *
 *   get:
 *     tags: [Themes]
 *     summary: 테마 목록 조회
 *     description: 전체 테마 목록 (해금 여부, 현재 선택 여부 포함)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 테마 목록
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
 *                     allOf:
 *                       - $ref: '#/components/schemas/Theme'
 *                       - type: object
 *                         properties:
 *                           unlocked:
 *                             type: boolean
 *                             description: 해금 여부
 *                           selected:
 *                             type: boolean
 *                             description: 현재 선택 여부
 *       401:
 *         description: 인증 실패
 */

/**
 * @swagger
 * /api/themes/select:
 *   patch:
 *     tags: [Themes]
 *     summary: 테마 선택
 *     description: 해금된 테마를 현재 테마로 선택
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - themeId
 *             properties:
 *               themeId:
 *                 type: integer
 *                 minimum: 1
 *                 description: 테마 ID
 *                 example: 1
 *     responses:
 *       200:
 *         description: 테마 선택 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: 테마가 선택되었습니다.
 *       400:
 *         description: 해금되지 않은 테마
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 테마를 찾을 수 없음
 */

/**
 * @swagger
 * /api/themes/{id}/image:
 *   put:
 *     tags: [Themes]
 *     summary: 테마 이미지 업로드
 *     description: 테마 배경 이미지 업로드/교체 (기존 이미지 자동 삭제)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 테마 ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: "배경 이미지 (PNG, JPEG, WEBP, SVG / 최대 10MB)"
 *     responses:
 *       200:
 *         description: 이미지 업로드 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Theme'
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 테마를 찾을 수 없음
 *       413:
 *         description: 파일 크기 초과 (10MB)
 */
