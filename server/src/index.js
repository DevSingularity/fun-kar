import 'dotenv/config';
import { createServer } from 'node:http';
import app from './app.js';
import { connectDatabase } from './config/database.js';
import { logger } from './utils/logger.js';

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  await connectDatabase();

  const server = createServer(app);

  // TODO: Add socket.io here if your PS needs real-time features
  // import { Server } from 'socket.io';
  // const io = new Server(server, { cors: { origin: process.env.CLIENT_URL, credentials: true } });

  // TODO: Add node-cron scheduled jobs here if needed
  // import cron from 'node-cron';
  // cron.schedule('0 */6 * * *', async () => { /* your job */ });

  server.listen(PORT, () => {
    logger.info(`Server running on http://localhost:${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
