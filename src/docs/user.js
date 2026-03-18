/**
 * @swagger
 * tags:
 *   name: Users
 *   description: 사용자 관리
 */

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     tags: [Users]
 *     summary: 내 프로필 조회
 *     description: 로그인한 사용자의 프로필 정보 조회 (선택된 테마 포함)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 프로필 조회 성공
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
 *                     - $ref: '#/components/schemas/User'
 *                     - type: object
 *                       properties:
 *                         selectedTheme:
 *                           $ref: '#/components/schemas/Theme'
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/users/me/profile:
 *   patch:
 *     tags: [Users]
 *     summary: 프로필 수정
 *     description: 닉네임, 상태 메시지, 아바타 URL 수정 (모두 선택)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nickname:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 16
 *                 description: "닉네임 (한글, 영문, 숫자, 공백, ._- 허용)"
 *               statusMessage:
 *                 type: string
 *                 maxLength: 50
 *                 description: 상태 메시지
 *               avatarUrl:
 *                 type: string
 *                 maxLength: 255
 *                 nullable: true
 *                 description: "아바타 이미지 URL (null이면 제거)"
 *     responses:
 *       200:
 *         description: 프로필 수정 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: 입력값 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       401:
 *         description: 인증 실패
 */

/**
 * @swagger
 * /api/users/me/nickname:
 *   patch:
 *     tags: [Users]
 *     summary: 닉네임 변경 (하위호환)
 *     description: 닉네임만 변경. /me/profile 사용을 권장
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nickname
 *             properties:
 *               nickname:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 16
 *     responses:
 *       200:
 *         description: 닉네임 변경 성공
 *       400:
 *         description: 입력값 오류
 *       401:
 *         description: 인증 실패
 */

/**
 * @swagger
 * /api/users/{userId}/profile:
 *   get:
 *     tags: [Users]
 *     summary: 타인 프로필 조회
 *     description: 다른 사용자의 공개 프로필 조회. 비로그인 시에도 조회 가능하나 팔로우 여부(isFollowing) 확인 불가
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 대상 사용자 ID
 *     responses:
 *       200:
 *         description: 프로필 조회 성공
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
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     nickname:
 *                       type: string
 *                     avatarUrl:
 *                       type: string
 *                       nullable: true
 *                     statusMessage:
 *                       type: string
 *                       nullable: true
 *                     followerCount:
 *                       type: integer
 *                     isFollowing:
 *                       type: boolean
 *                       description: "로그인 시 팔로우 여부 (비로그인: false)"
 *                     featuredArtwork:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         imageUrl:
 *                           type: string
 *       404:
 *         description: 사용자를 찾을 수 없음
 */

/**
 * @swagger
 * /api/users/{userId}/artworks/published:
 *   get:
 *     tags: [Users]
 *     summary: 타인의 자랑한 작품 목록
 *     description: 다른 사용자가 공개한 작품 목록 (페이지네이션)
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 대상 사용자 ID
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [recent, popular]
 *           default: recent
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
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
 *                           likeCount:
 *                             type: integer
 *                           isLiked:
 *                             type: boolean
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     page:
 *                       type: integer
 *                     size:
 *                       type: integer
 *                     totalElements:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     last:
 *                       type: boolean
 *       404:
 *         description: 사용자를 찾을 수 없음
 */

/**
 * @swagger
 * /api/users/{userId}/follow:
 *   post:
 *     tags: [Users]
 *     summary: 팔로우
 *     description: 대상 사용자를 관심 작가로 등록. 대상에게 알림 발송
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 팔로우할 사용자 ID
 *     responses:
 *       200:
 *         description: 팔로우 성공
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
 *                     isFollowing:
 *                       type: boolean
 *                       example: true
 *                     followerCount:
 *                       type: integer
 *       400:
 *         description: 자기 자신을 팔로우하거나 이미 팔로우 중
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 사용자를 찾을 수 없음
 *
 *   delete:
 *     tags: [Users]
 *     summary: 언팔로우
 *     description: 대상 사용자의 관심 작가 등록 해제
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 언팔로우할 사용자 ID
 *     responses:
 *       200:
 *         description: 언팔로우 성공
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
 *                     isFollowing:
 *                       type: boolean
 *                       example: false
 *                     followerCount:
 *                       type: integer
 *       400:
 *         description: 팔로우 상태가 아님
 *       401:
 *         description: 인증 실패
 *       404:
 *         description: 사용자를 찾을 수 없음
 */
