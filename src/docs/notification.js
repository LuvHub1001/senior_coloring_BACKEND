/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: 알림 (좋아요, 팔로우, 새 작품)
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: 알림 목록 조회
 *     description: "최근 30일 알림 목록 조회. type 필터 가능. unreadCount는 필터와 무관하게 전체 읽지 않은 수 반환"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [like, artwork, follow]
 *         description: "알림 타입 필터 (미전달 시 전체)"
 *     responses:
 *       200:
 *         description: 알림 목록
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
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           type:
 *                             type: string
 *                             enum: [like, artwork, follow]
 *                           title:
 *                             type: string
 *                             example: 좋아요
 *                           message:
 *                             type: string
 *                             example: "꼬마화가님이 '등산' 작품을 좋아했어요"
 *                           isRead:
 *                             type: boolean
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           targetUserId:
 *                             type: string
 *                             format: uuid
 *                             description: 알림 관련 대상 사용자 ID
 *                     unreadCount:
 *                       type: integer
 *                       description: "전체 읽지 않은 알림 수 (type 필터와 무관)"
 *       400:
 *         description: 잘못된 type 값
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       401:
 *         description: 인증 실패
 */

/**
 * @swagger
 * /api/notifications/read-all:
 *   put:
 *     tags: [Notifications]
 *     summary: 알림 모두 읽기
 *     description: 읽지 않은 모든 알림을 읽음 처리
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 모두 읽기 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       401:
 *         description: 인증 실패
 */
