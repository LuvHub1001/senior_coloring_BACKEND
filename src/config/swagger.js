const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Senior Coloring Book API',
      version: '1.0.0',
      description: '시니어 컬러링 북 백엔드 API 문서',
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000',
        description: process.env.NODE_ENV === 'production' ? '운영 서버' : '개발 서버',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Access Token을 입력하세요',
        },
      },
      schemas: {
        // 공통 응답
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string' },
          },
        },
        ValidationErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: '입력값이 올바르지 않습니다.' },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string', example: 'body.title' },
                  message: { type: 'string', example: 'title은 필수입니다.' },
                },
              },
            },
          },
        },

        // 모델
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', nullable: true },
            nickname: { type: 'string' },
            avatarUrl: { type: 'string', nullable: true },
            provider: { type: 'string', enum: ['kakao', 'naver'] },
            selectedThemeId: { type: 'integer', nullable: true },
            featuredArtworkId: { type: 'string', nullable: true },
            totalCompletedCount: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Design: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            title: { type: 'string' },
            category: { type: 'string' },
            description: { type: 'string', nullable: true },
            imageUrl: { type: 'string' },
            originalImageUrl: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Artwork: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            designId: { type: 'integer' },
            imageUrl: { type: 'string', nullable: true },
            progress: { type: 'integer', minimum: 0, maximum: 100 },
            status: { type: 'string', enum: ['IN_PROGRESS', 'COMPLETED'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Theme: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            requiredArtworks: { type: 'integer' },
            imageUrl: { type: 'string', nullable: true },
            buttonColor: { type: 'string', nullable: true },
            buttonTextColor: { type: 'string', nullable: true },
            textColor: { type: 'string', nullable: true },
            toggleType: { type: 'string', enum: ['LIGHT', 'DARK'] },
            sortOrder: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  },
  apis: ['./src/docs/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
