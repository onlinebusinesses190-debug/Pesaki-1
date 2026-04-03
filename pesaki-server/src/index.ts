import 'dotenv/config';
import fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './config/env';
import { logger } from './utils/logger';
import { initSocket } from './socket';
import { startNewRound } from './games/aviator/engine';
import { initCronJobs } from './cron';
import { registerRoutes } from './api';
import { setupRateLimit } from './middleware/rateLimit';

const startServer = async () => {
  try {
    const server = fastify({ logger: true }); 
    
    // Fastify CORS
    await server.register(cors, {
      origin: [
        'http://localhost:3000',
        'https://pesaki.vercel.app',
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    });
    
    await setupRateLimit(server);

    // Register REST API Routes
    registerRoutes(server);

    // Start Socket.io Engine
    initSocket(server.server);
    
    // Initialize Game loops
    startNewRound();
    
    // Initialize Schedule Jobs
    initCronJobs();

    // Boot Fastify
    await server.listen({ port: env.PORT, host: '0.0.0.0' });
    logger.info(`✨ Pesaki Server listening at http://localhost:${env.PORT}`);
    
  } catch (err) {
    logger.fatal(err, 'Failed to start server');
    process.exit(1);
  }
};

startServer();
