/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: 관리자 API (ADMIN 권한 필요)
 */

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     tags: [Admin]
 *     summary: 대시보드 통계
 *     description: 전체 사용자 수, 작품 수, 도안 수 등 통계 데이터
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
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 관리자 권한 필요
 */

/**
 * @swagger
 * /api/admin/designs:
 *   get:
 *     tags: [Admin]
 *     summary: 도안 목록 조회 (관리자)
 *     description: 페이지네이션 + 검색 지원
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 100
 *     responses:
 *       200:
 *         description: 도안 목록
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 관리자 권한 필요
 *
 *   post:
 *     tags: [Admin]
 *     summary: 도안 등록
 *     description: 새 컬러링 도안 업로드 (흑백 이미지 필수, 원본 컬러 이미지 선택)
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
 *                 description: "원본 컬러 이미지 (선택)"
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               category:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *               description:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       201:
 *         description: 도안 등록 성공
 *       400:
 *         description: 입력값 오류
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 관리자 권한 필요
 */

/**
 * @swagger
 * /api/admin/designs/{id}:
 *   patch:
 *     tags: [Admin]
 *     summary: 도안 수정
 *     description: 도안 정보 및 이미지 수정
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               originalImage:
 *                 type: string
 *                 format: binary
 *               title:
 *                 type: string
 *                 maxLength: 100
 *               category:
 *                 type: string
 *                 maxLength: 50
 *               description:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: 도안 수정 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 관리자 권한 필요
 *       404:
 *         description: 도안을 찾을 수 없음
 *
 *   delete:
 *     tags: [Admin]
 *     summary: 도안 삭제
 *     description: 도안 및 관련 Storage 이미지 삭제
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 삭제 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 관리자 권한 필요
 *       404:
 *         description: 도안을 찾을 수 없음
 */

/**
 * @swagger
 * /api/admin/themes:
 *   get:
 *     tags: [Admin]
 *     summary: 테마 목록 조회 (관리자)
 *     description: 페이지네이션 + 검색 지원
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 100
 *     responses:
 *       200:
 *         description: 테마 목록
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 관리자 권한 필요
 *
 *   post:
 *     tags: [Admin]
 *     summary: 테마 등록
 *     description: 새 전시관 테마 생성
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
 *                 description: "배경 이미지 (PNG, JPEG, WEBP, SVG / 최대 5MB)"
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *               requiredArtworks:
 *                 type: integer
 *                 minimum: 0
 *                 default: 0
 *               textColor:
 *                 type: string
 *                 description: "HEX 색상 코드 (예: #333333)"
 *               toggleType:
 *                 type: string
 *                 enum: [LIGHT, DARK]
 *                 default: LIGHT
 *     responses:
 *       201:
 *         description: 테마 등록 성공
 *       400:
 *         description: 입력값 오류
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 관리자 권한 필요
 */

/**
 * @swagger
 * /api/admin/themes/{id}:
 *   patch:
 *     tags: [Admin]
 *     summary: 테마 수정
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               name:
 *                 type: string
 *                 maxLength: 50
 *               requiredArtworks:
 *                 type: integer
 *                 minimum: 0
 *               textColor:
 *                 type: string
 *               toggleType:
 *                 type: string
 *                 enum: [LIGHT, DARK]
 *     responses:
 *       200:
 *         description: 테마 수정 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 관리자 권한 필요
 *       404:
 *         description: 테마를 찾을 수 없음
 *
 *   delete:
 *     tags: [Admin]
 *     summary: 테마 삭제
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 삭제 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 관리자 권한 필요
 *       404:
 *         description: 테마를 찾을 수 없음
 */

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     tags: [Admin]
 *     summary: 회원 목록 조회
 *     description: 페이지네이션 + 검색 지원
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 100
 *     responses:
 *       200:
 *         description: 회원 목록
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 관리자 권한 필요
 */

/**
 * @swagger
 * /api/admin/artworks:
 *   get:
 *     tags: [Admin]
 *     summary: 작품 목록 조회 (관리자)
 *     description: 페이지네이션 + 검색 지원
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 100
 *     responses:
 *       200:
 *         description: 작품 목록
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 관리자 권한 필요
 */

/**
 * @swagger
 * /api/admin/artworks/{id}/publish:
 *   patch:
 *     tags: [Admin]
 *     summary: 작품 공개/비공개 전환 (관리자)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
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
 *     responses:
 *       200:
 *         description: 전환 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 관리자 권한 필요
 */

/**
 * @swagger
 * /api/admin/artworks/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: 작품 삭제 (관리자)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: 삭제 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 관리자 권한 필요
 *       404:
 *         description: 작품을 찾을 수 없음
 */

/**
 * @swagger
 * /api/admin/recommendations:
 *   get:
 *     tags: [Admin]
 *     summary: 추천 배너 목록 조회
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 추천 배너 목록
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 관리자 권한 필요
 *
 *   post:
 *     tags: [Admin]
 *     summary: 추천 배너 등록
 *     description: 도안 ID와 배너 이미지로 추천 배너 생성
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
 *               - designId
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: "배너 이미지 (PNG, JPEG, WEBP, SVG / 최대 5MB)"
 *               designId:
 *                 type: integer
 *                 description: 연결할 도안 ID
 *     responses:
 *       201:
 *         description: 추천 배너 등록 성공
 *       400:
 *         description: 입력값 오류
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 관리자 권한 필요
 */

/**
 * @swagger
 * /api/admin/recommendations/{id}:
 *   delete:
 *     tags: [Admin]
 *     summary: 추천 배너 삭제
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: 삭제 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 관리자 권한 필요
 *       404:
 *         description: 추천 배너를 찾을 수 없음
 */

/**
 * @swagger
 * /api/admin/notices:
 *   get:
 *     tags: [Admin]
 *     summary: 공지사항 목록 조회 (관리자)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 공지사항 목록
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 관리자 권한 필요
 *
 *   post:
 *     tags: [Admin]
 *     summary: 공지사항 등록
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 2000
 *     responses:
 *       201:
 *         description: 공지사항 등록 성공
 *       400:
 *         description: 입력값 오류
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 관리자 권한 필요
 */

/**
 * @swagger
 * /api/admin/notices/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: 공지사항 수정
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 100
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 2000
 *     responses:
 *       200:
 *         description: 수정 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 관리자 권한 필요
 *       404:
 *         description: 공지사항을 찾을 수 없음
 *
 *   delete:
 *     tags: [Admin]
 *     summary: 공지사항 삭제
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: 삭제 성공
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 관리자 권한 필요
 *       404:
 *         description: 공지사항을 찾을 수 없음
 */

/**
 * @swagger
 * /api/admin/reports:
 *   get:
 *     tags: [Admin]
 *     summary: 신고 목록 조회
 *     description: 작품 신고 목록 조회 (페이지네이션 + status 필터)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, RESOLVED, DISMISSED]
 *         description: 신고 처리 상태 필터
 *     responses:
 *       200:
 *         description: 신고 목록
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
 *                       artworkId:
 *                         type: string
 *                         format: uuid
 *                       artworkTitle:
 *                         type: string
 *                       artworkImageUrl:
 *                         type: string
 *                         nullable: true
 *                       reporterNickname:
 *                         type: string
 *                       authorNickname:
 *                         type: string
 *                       reason:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [PENDING, RESOLVED, DISMISSED]
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 totalCount:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 pageSize:
 *                   type: integer
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 관리자 권한 필요
 */

/**
 * @swagger
 * /api/admin/reports/{reportId}:
 *   put:
 *     tags: [Admin]
 *     summary: 신고 상태 변경 (처리/기각)
 *     description: |
 *       RESOLVED: 신고 처리 완료 + 해당 작품 자동 비공개 (isPublic = false)
 *       DISMISSED: 신고 기각, 작품에 영향 없음
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: 신고 건 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [RESOLVED, DISMISSED]
 *                 description: "RESOLVED(처리+작품 비공개) 또는 DISMISSED(기각)"
 *     responses:
 *       200:
 *         description: 처리 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: 잘못된 status 값
 *       401:
 *         description: 인증 실패
 *       403:
 *         description: 관리자 권한 필요
 *       404:
 *         description: 신고 건을 찾을 수 없음
 *       409:
 *         description: 이미 처리된 신고 건
 */
