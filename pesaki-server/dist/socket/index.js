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
            origin: [
                'http://localhost:3000',
                'https://pesaki.vercel.app',
            ],
            methods: ['GET', 'POST'],
            credentials: true
        },
        transports: ['websocket']
    });
    // Extract Middleware for Auth
    const socketAuthMiddleware = async (socket, next) => {
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
    };
    // Apply middleware to the main namespace
    exports.io.use(socketAuthMiddleware);
    // Apply middleware and setup to the Aviator namespace specifically
    exports.io.of('/aviator').use(socketAuthMiddleware);
    (0, aviator_1.setupAviatorNamespace)(exports.io);
    exports.io.on('connection', (socket) => {
        logger_1.logger.info({ socketId: socket.id, userId: socket.data.user.id }, 'Socket connected');
        socket.on('disconnect', () => {
            logger_1.logger.info({ socketId: socket.id, userId: socket.data.user.id }, 'Socket disconnected');
        });
    });
};
exports.initSocket = initSocket;
