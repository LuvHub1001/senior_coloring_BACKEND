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
 *     description: 도안을 선택하여 색칠 시작. 호출할 때마다 항상 새 작품 생성. 수정하기인 경우 parentArtworkId 전달
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
 *               rootArtworkId:
 *                 type: string
 *                 format: uuid
 *                 description: "수정하기인 경우 원본(또는 부모) 작품 ID (선택). 서버에서 자동으로 최초 원본을 추적"
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
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
 *     description: "작품 상태를 COMPLETED로 변경. 최초 완성 시 totalCompletedCount 증가, 첫 완성작은 자동 대표 작품 설정, 새로 해금된 테마 반환. parentArtworkId가 있는 경우 부모 작품 자동 삭제 및 대표작품 교체 처리"
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
 *                     unlockedTheme:
 *                       nullable: true
 *                       description: 이번 완성으로 새로 해금된 테마 (없으면 null)
 *                       allOf:
 *                         - $ref: '#/components/schemas/Theme'
 *                     replacedRoot:
 *                       type: boolean
 *                       description: 원본 작품 교체(삭제) 여부
 *                       example: false
 *                     updatedFeatured:
 *                       type: boolean
 *                       description: 대표 작품 교체 여부
 *                       example: false
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

/**
 * @swagger
 * /api/artworks/{id}/publish:
 *   patch:
 *     tags: [Artworks]
 *     summary: 작품 공개/비공개 전환
 *     description: "완성된 작품을 커뮤니티에 공개하거나 비공개로 전환. 공개 시 팔로워에게 알림 발송"
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
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isPublic
 *             properties:
 *               isPublic:
 *                 type: boolean
 *                 description: "true: 공개, false: 비공개"
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *                 description: "작품 제목 (공개 시 선택)"
 *     responses:
 *       200:
 *         description: 전환 성공
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
 *                     isPublic:
 *                       type: boolean
 *                     title:
 *                       type: string
 *                       nullable: true
 *                     publishedAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *       400:
 *         description: 완성된 작품만 공개 가능
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 본인의 작품이 아님
 *       404:
 *         description: 작품을 찾을 수 없음
 */

/**
 * @swagger
 * /api/artworks/published:
 *   get:
 *     tags: [Artworks]
 *     summary: 내가 자랑한 작품 목록
 *     description: 로그인한 사용자가 공개한 작품 목록 (페이지네이션)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [recent, popular]
 *           default: recent
 *         description: 정렬 기준
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
 *         description: 자랑한 작품 목록
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
 *       401:
 *         description: 인증 실패
 */

/**
 * @swagger
 * /api/artworks/published/stats:
 *   get:
 *     tags: [Artworks]
 *     summary: 자랑한 작품 통계
 *     description: 공개한 작품 수, 받은 총 좋아요 수 등 통계
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 통계 데이터
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
 *                     publishedCount:
 *                       type: integer
 *                       description: 공개한 작품 수
 *                     totalLikesReceived:
 *                       type: integer
 *                       description: 받은 총 좋아요 수
 *                     followerCount:
 *                       type: integer
 *                       description: 나를 관심 작가로 등록한 사용자 수
 *       401:
 *         description: 인증 실패
 */
