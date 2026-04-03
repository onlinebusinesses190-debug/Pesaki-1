"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const env_1 = require("./config/env");
const logger_1 = require("./utils/logger");
const socket_1 = require("./socket");
const engine_1 = require("./games/aviator/engine");
const cron_1 = require("./cron");
const api_1 = require("./api");
const rateLimit_1 = require("./middleware/rateLimit");
const startServer = async () => {
    try {
        const server = (0, fastify_1.default)({ logger: true });
        // Fastify CORS
        await server.register(cors_1.default, {
            origin: [
                'http://localhost:3000',
                'https://pesaki.vercel.app',
            ],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
        });
        await (0, rateLimit_1.setupRateLimit)(server);
        // Register REST API Routes
        (0, api_1.registerRoutes)(server);
        // Start Socket.io Engine
        (0, socket_1.initSocket)(server.server);
        // Initialize Game loops
        (0, engine_1.startNewRound)();
        // Initialize Schedule Jobs
        (0, cron_1.initCronJobs)();
        // Boot Fastify
        await server.listen({ port: env_1.env.PORT, host: '0.0.0.0' });
        logger_1.logger.info(`✨ Pesaki Server listening at http://localhost:${env_1.env.PORT}`);
    }
    catch (err) {
        logger_1.logger.fatal(err, 'Failed to start server');
        process.exit(1);
    }
};
startServer();
