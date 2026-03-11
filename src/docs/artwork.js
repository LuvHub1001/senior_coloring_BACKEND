/**
 * @swagger
 * tags:
 *   name: Artworks
 *   description: 사용자 작품 (색칠 결과물) 관리
 */

/**
 * @swagger
 * /api/artworks:
 *   post:
 *     tags: [Artworks]
 *     summary: 색칠 시작 (작품 생성)
 *     description: 도안을 선택하여 색칠 시작. 이미 해당 도안으로 진행 중인 작품이 있으면 기존 작품 반환
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - designId
 *             properties:
 *               designId:
 *                 type: integer
 *                 minimum: 1
 *                 description: 도안 ID
 *                 example: 1
 *     responses:
 *       201:
 *         description: 작품 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Artwork'
 *       400:
 *         description: 입력값 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       401:
 *         description: 인증 실패
 *
 *   get:
 *     tags: [Artworks]
 *     summary: 내 작품 목록 조회
 *     description: 로그인한 사용자의 작품 목록. status로 필터링 가능
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [IN_PROGRESS, COMPLETED]
 *         description: "작품 상태 필터 (미입력 시 전체)"
 *     responses:
 *       200:
 *         description: 작품 목록
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
 *                       - $ref: '#/components/schemas/Artwork'
 *                       - type: object
 *                         properties:
 *                           design:
 *                             $ref: '#/components/schemas/Design'
 *       401:
 *         description: 인증 실패
 */

/**
 * @swagger
 * /api/artworks/{id}:
 *   get:
 *     tags: [Artworks]
 *     summary: 작품 상세 조회
 *     description: 본인의 작품 상세 정보 조회 (도안 정보 포함)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 작품 ID
 *     responses:
 *       200:
 *         description: 작품 상세 정보
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Artwork'
 *                     - type: object
 *                       properties:
 *                         design:
 *                           $ref: '#/components/schemas/Design'
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 본인의 작품이 아님
 *       404:
 *         description: 작품을 찾을 수 없음
 *
 *   delete:
 *     tags: [Artworks]
 *     summary: 작품 삭제
 *     description: 본인의 작품 삭제 (Storage 이미지도 함께 삭제)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 작품 ID
 *     responses:
 *       200:
 *         description: 작품 삭제 성공
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
 *                       example: 작품이 삭제되었습니다.
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 본인의 작품이 아님
 *       404:
 *         description: 작품을 찾을 수 없음
 */

/**
 * @swagger
 * /api/artworks/{id}/save:
 *   put:
 *     tags: [Artworks]
 *     summary: 작품 임시 저장
 *     description: 색칠 진행 중인 이미지 업로드 및 진행률 업데이트
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 작품 ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: "색칠 진행 이미지 (PNG, JPEG, WEBP / 최대 10MB)"
 *               progress:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *                 description: 진행률 (0~100)
 *                 example: 45
 *     responses:
 *       200:
 *         description: 임시 저장 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Artwork'
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 본인의 작품이 아님
 *       413:
 *         description: 파일 크기 초과 (10MB)
 */

/**
 * @swagger
 * /api/artworks/{id}/complete:
 *   patch:
 *     tags: [Artworks]
 *     summary: 작품 완성
 *     description: "작품 상태를 COMPLETED로 변경. 최초 완성 시 totalCompletedCount 증가, 첫 완성작은 자동 대표 작품 설정, 새로 해금된 테마 반환"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 작품 ID
 *     responses:
 *       200:
 *         description: 작품 완성 성공
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
 *                     artwork:
 *                       $ref: '#/components/schemas/Artwork'
 *                     newlyUnlockedThemes:
 *                       type: array
 *                       description: 이번 완성으로 새로 해금된 테마 목록
 *                       items:
 *                         $ref: '#/components/schemas/Theme'
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 본인의 작품이 아님
 *       404:
 *         description: 작품을 찾을 수 없음
 */

/**
 * @swagger
 * /api/artworks/{id}/feature:
 *   patch:
 *     tags: [Artworks]
 *     summary: 대표 작품 선택
 *     description: 완성된 작품을 대표 작품으로 설정 (COMPLETED 상태만 가능)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 작품 ID
 *     responses:
 *       200:
 *         description: 대표 작품 설정 성공
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
 *                       example: 대표 작품이 설정되었습니다.
 *       400:
 *         description: 완성된 작품만 대표 작품으로 설정 가능
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 본인의 작품이 아님
 */
