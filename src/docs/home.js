/**
 * @swagger
 * tags:
 *   name: Home
 *   description: 홈 화면 통합 데이터
 */

/**
 * @swagger
 * /api/home:
 *   get:
 *     tags: [Home]
 *     summary: 홈 통합 데이터 조회
 *     description: 홈 화면에 필요한 사용자 프로필, 완성 작품, 테마 목록을 한 번에 반환
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 홈 데이터
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
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     completedArtworks:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Artwork'
 *                     themes:
 *                       type: array
 *                       items:
 *                         allOf:
 *                           - $ref: '#/components/schemas/Theme'
 *                           - type: object
 *                             properties:
 *                               unlocked:
 *                                 type: boolean
 *                               selected:
 *                                 type: boolean
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
