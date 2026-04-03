import { Server, Socket } from 'socket.io';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';
import { setupAviatorNamespace } from './namespaces/aviator';

export let io: Server;

export const initSocket = (server: any) => {
  io = new Server(server, {
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
  const socketAuthMiddleware = async (socket: Socket, next: any) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error: Missing token'));
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return next(new Error('Authentication error: Invalid or expired token'));
    }

    socket.data.user = { id: user.id, email: user.email };
    next();
  };

  // Apply middleware to the main namespace
  io.use(socketAuthMiddleware);

  // Apply middleware and setup to the Aviator namespace specifically
  io.of('/aviator').use(socketAuthMiddleware);
  setupAviatorNamespace(io);

  io.on('connection', (socket: Socket) => {
    logger.info({ socketId: socket.id, userId: socket.data.user.id }, 'Socket connected');
    
    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id, userId: socket.data.user.id }, 'Socket disconnected');
    });
  });
};
