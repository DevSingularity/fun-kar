import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { requestIdMiddleware } from './middlewares/requestId.middleware.js';
import { notFoundHandler } from './middlewares/notFound.middleware.js';
import { errorHandler } from './middlewares/errorHandler.middleware.js';
import routes from './routes/index.js';

const app = express();

app.use(helmet());
app.use(requestIdMiddleware);
app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Support both /api and /api/v1 prefixes gracefully
app.use('/api', routes);
app.use('/api/v1', routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
