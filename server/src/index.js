import 'dotenv/config';
import { createServer } from 'node:http';
import app from './app.js';
import { connectDatabase } from './config/database.js';
import { logger } from './utils/logger.js';

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  await connectDatabase();

  const server = createServer(app);

  server.listen(PORT, () => {
    logger.info(`DealFlow360 API Server running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
