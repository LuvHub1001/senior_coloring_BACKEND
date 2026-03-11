/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: 인증 (OAuth 소셜 로그인, 토큰 관리)
 */

/**
 * @swagger
 * /api/auth/kakao:
 *   get:
 *     tags: [Auth]
 *     summary: 카카오 로그인
 *     description: 카카오 OAuth 로그인 페이지로 리다이렉트
 *     responses:
 *       302:
 *         description: 카카오 로그인 페이지로 리다이렉트
 */

/**
 * @swagger
 * /api/auth/kakao/callback:
 *   get:
 *     tags: [Auth]
 *     summary: 카카오 로그인 콜백
 *     description: 카카오 인증 완료 후 콜백. 성공 시 CLIENT_URL로 토큰과 함께 리다이렉트
 *     responses:
 *       302:
 *         description: "CLIENT_URL/auth/callback?accessToken=...&refreshToken=... 으로 리다이렉트"
 */

/**
 * @swagger
 * /api/auth/naver:
 *   get:
 *     tags: [Auth]
 *     summary: 네이버 로그인
 *     description: 네이버 OAuth 로그인 페이지로 리다이렉트
 *     responses:
 *       302:
 *         description: 네이버 로그인 페이지로 리다이렉트
 */

/**
 * @swagger
 * /api/auth/naver/callback:
 *   get:
 *     tags: [Auth]
 *     summary: 네이버 로그인 콜백
 *     description: 네이버 인증 완료 후 콜백. 성공 시 CLIENT_URL로 토큰과 함께 리다이렉트
 *     responses:
 *       302:
 *         description: "CLIENT_URL/auth/callback?accessToken=...&refreshToken=... 으로 리다이렉트"
 */

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: 토큰 갱신
 *     description: Refresh Token으로 새 Access Token과 Refresh Token 발급 (Rotation 방식)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: 기존 Refresh Token
 *     responses:
 *       200:
 *         description: 토큰 갱신 성공
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
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       401:
 *         description: 유효하지 않거나 만료된 Refresh Token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: 로그아웃
 *     description: 해당 유저의 모든 Refresh Token 삭제
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 로그아웃 성공
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
 *                       example: 로그아웃 성공
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
