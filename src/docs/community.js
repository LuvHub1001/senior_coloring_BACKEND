/**
 * @swagger
 * tags:
 *   name: Community
 *   description: 커뮤니티 (공개 작품 갤러리, 좋아요)
 */

/**
 * @swagger
 * /api/community/artworks:
 *   get:
 *     tags: [Community]
 *     summary: 커뮤니티 작품 목록 조회
 *     description: 공개된 완성 작품 목록 조회. 비로그인 시에도 조회 가능하나 좋아요 여부(isLiked)는 false
 *     parameters:
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [recent, popular]
 *           default: recent
 *         description: "정렬 기준 (recent: 최신순, popular: 인기순)"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: 페이지 번호 (1-based)
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: 페이지 크기
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
 *                   type: object
 *                   properties:
 *                     content:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           artworkId:
 *                             type: string
 *                             format: uuid
 *                           title:
 *                             type: string
 *                           imageUrl:
 *                             type: string
 *                           author:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               nickname:
 *                                 type: string
 *                           likeCount:
 *                             type: integer
 *                           isLiked:
 *                             type: boolean
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     page:
 *                       type: integer
 *                       description: "현재 페이지 (0-based)"
 *                     size:
 *                       type: integer
 *                     totalElements:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     last:
 *                       type: boolean
 *                       description: 마지막 페이지 여부
 */

/**
 * @swagger
 * /api/community/artworks/popular:
 *   get:
 *     tags: [Community]
 *     summary: 이번 주 인기 작품
 *     description: 최근 7일간 좋아요를 가장 많이 받은 작품. 이번 주 좋아요가 없으면 전체 인기순 fallback
 *     parameters:
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 30
 *           default: 10
 *         description: 조회 개수
 *     responses:
 *       200:
 *         description: 인기 작품 목록
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
 *                     type: object
 *                     properties:
 *                       artworkId:
 *                         type: string
 *                         format: uuid
 *                       title:
 *                         type: string
 *                       imageUrl:
 *                         type: string
 *                       author:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           nickname:
 *                             type: string
 *                       likeCount:
 *                         type: integer
 *                       isLiked:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 */

/**
 * @swagger
 * /api/community/artworks/{artworkId}:
 *   get:
 *     tags: [Community]
 *     summary: 커뮤니티 작품 상세 조회
 *     description: 공개된 완성 작품의 상세 정보 (도안 정보 포함)
 *     parameters:
 *       - in: path
 *         name: artworkId
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
 *                   type: object
 *                   properties:
 *                     artworkId:
 *                       type: string
 *                       format: uuid
 *                     title:
 *                       type: string
 *                     imageUrl:
 *                       type: string
 *                     author:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         nickname:
 *                           type: string
 *                     likeCount:
 *                       type: integer
 *                     isLiked:
 *                       type: boolean
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     design:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         title:
 *                           type: string
 *                         imageUrl:
 *                           type: string
 *       404:
 *         description: 작품을 찾을 수 없음 (비공개이거나 미완성)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/community/artworks/{artworkId}/like:
 *   post:
 *     tags: [Community]
 *     summary: 좋아요 토글
 *     description: 좋아요 추가/취소 토글. 본인 작품이 아닌 경우 좋아요 시 작품 소유자에게 알림 발송
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: artworkId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 작품 ID
 *     responses:
 *       200:
 *         description: 좋아요 토글 성공
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
 *                     isLiked:
 *                       type: boolean
 *                       description: 토글 후 좋아요 상태
 *                     likeCount:
 *                       type: integer
 *                       description: 현재 좋아요 수
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 작품을 찾을 수 없음
 */
