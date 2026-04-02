"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = exports.io = void 0;
const socket_io_1 = require("socket.io");
const supabase_1 = require("../lib/supabase");
const logger_1 = require("../utils/logger");
const aviator_1 = require("./namespaces/aviator");
const initSocket = (server) => {
    exports.io = new socket_io_1.Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN || '*',
            methods: ['GET', 'POST']
        }
    });
    // Global Middleware for Auth
    exports.io.use(async (socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error('Authentication error: Missing token'));
        }
        const { data: { user }, error } = await supabase_1.supabase.auth.getUser(token);
        if (error || !user) {
            return next(new Error('Authentication error: Invalid or expired token'));
        }
        socket.data.user = { id: user.id, email: user.email };
        next();
    });
    exports.io.on('connection', (socket) => {
        logger_1.logger.info({ socketId: socket.id, userId: socket.data.user.id }, 'Socket connected');
        socket.on('disconnect', () => {
            logger_1.logger.info({ socketId: socket.id, userId: socket.data.user.id }, 'Socket disconnected');
        });
    });
    // Initialize namespaces
    (0, aviator_1.setupAviatorNamespace)(exports.io);
};
exports.initSocket = initSocket;
