const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const passport = require('./config/passport');
const authRouter = require('./routes/auth');
const userRouter = require('./routes/user');
const designRouter = require('./routes/design');
const artworkRouter = require('./routes/artwork');
const themeRouter = require('./routes/theme');
const { errorHandler } = require('./middlewares/errorHandler');

const app = express();

// 보안 미들웨어
app.use(helmet());
app.use(cors());

// 요청 파싱
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 로깅
app.use(morgan('dev'));

// Passport 초기화
app.use(passport.initialize());

// 헬스체크
app.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

// 라우터
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/designs', designRouter);
app.use('/api/artworks', artworkRouter);
app.use('/api/themes', themeRouter);

// 에러 핸들링
app.use(errorHandler);

module.exports = app;
