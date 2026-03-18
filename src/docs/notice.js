/**
 * @swagger
 * tags:
 *   name: Notices
 *   description: 공지사항 (사용자용)
 */

/**
 * @swagger
 * /api/notices:
 *   get:
 *     tags: [Notices]
 *     summary: 공지사항 목록 조회
 *     description: 전체 공지사항 목록 (최신순)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 공지사항 목록
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
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       title:
 *                         type: string
 *                         example: 서비스 업데이트 안내
 *                       content:
 *                         type: string
 *                         example: 새로운 기능이 추가되었습니다.
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: 인증 실패
 */
