import 'dotenv/config';
import fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './config/env';
import { logger } from './utils/logger';
import { initSocket } from './socket';
import { startNewRound } from './games/aviator/engine';
import { startUpDownRounds } from './games/updown/engine';
import { initCronJobs } from './cron';
import { registerRoutes } from './api';
import { setupRateLimit } from './middleware/rateLimit';

// ─── Import new route modules ──────────────────────────────────────────────
import { kaziRoutes } from './routes/kazi';
import { testRoutes } from './routes/test';  // ✅ ADDED TEST ROUTE
// import { businessRoutes } from './routes/business';  // Uncomment when created
// import { bankingRoutes } from './routes/banking';   // Uncomment when created

const startServer = async () => {
  try {
    const server = fastify({ logger: true });

    // CORS
    await server.register(cors, {
      origin: (_origin, cb) => {
        cb(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
    });

    await setupRateLimit(server);

    // ─── Register existing REST API routes ──────────────────────────────
    registerRoutes(server);

    // ─── Register new routes ─────────────────────────────────────────────
    server.register(kaziRoutes, { prefix: '/kazi' });
    server.register(testRoutes, { prefix: '/test' });  // ✅ TEST ROUTE
    // server.register(businessRoutes, { prefix: '/business' });  // Uncomment when ready
    // server.register(bankingRoutes, { prefix: '/banking' });    // Uncomment when ready

    // ─── Start Socket.io ────────────────────────────────────────────────
    initSocket(server.server);

    // ─── Initialize Game loops ──────────────────────────────────────────
    startNewRound();
    startUpDownRounds();

    // ─── Initialize Scheduled Jobs ──────────────────────────────────────
    initCronJobs();

    // ─── Boot Fastify ───────────────────────────────────────────────────
    await server.listen({ port: env.PORT, host: '0.0.0.0' });
    logger.info(`✨ Pesaki Server listening at http://localhost:${env.PORT}`);

  } catch (err) {
    logger.fatal(err, 'Failed to start server');
    process.exit(1);
  }
};

startServer();
