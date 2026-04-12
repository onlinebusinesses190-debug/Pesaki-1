import { Server, Socket } from 'socket.io';
import { logger } from '../../utils/logger';
import { placeBet, getUpDownState } from '../../games/updown/engine';

export const setupUpDownNamespace = (io: Server) => {
  const nsp = io.of('/updown');

  nsp.on('connection', (socket: Socket) => {
    const userId = socket.data?.user?.id;
    logger.info({ socketId: socket.id, userId }, 'User connected to /updown');

    // Sync current state immediately for mid-round joiners
    const state = getUpDownState();
    if (state.round) {
      // Calculate secondsLeft from current time vs locksAt
      const secondsLeft = Math.max(
        0,
        Math.ceil((new Date(state.round.locksAt).getTime() - Date.now()) / 1000)
      );
      socket.emit('SYNC_STATE', {
        round: state.round,
        secondsLeft,
        history: state.history,
      });
    } else {
      socket.emit('SYNC_STATE', { round: null, secondsLeft: 0, history: state.history });
    }

    // Handle bet placement
    socket.on('PLACE_BET', async (payload: {
      roundId: string;
      direction: 'up' | 'down';
      amount: number;
      mode: 'real' | 'demo';
    }) => {
      try {
        const { roundId, direction, amount, mode } = payload;

        if (!userId) {
          socket.emit('BET_REJECTED', { error: 'Not authenticated' });
        } else if (!['up', 'down'].includes(direction)) {
          socket.emit('BET_REJECTED', { error: 'Invalid direction' });
        } else if (!amount || amount <= 0) {
          socket.emit('BET_REJECTED', { error: 'Invalid amount' });
        } else {
          const result = await placeBet(userId, roundId, direction, amount, mode);

          if (result.success) {
            socket.emit('BET_CONFIRMED', {
              roundId,
              direction,
              amount,
              newBalance: result.newBalance,
            });
            logger.info({ userId, roundId, direction, amount }, 'Bet confirmed via socket');
          } else {
            socket.emit('BET_REJECTED', { error: result.error });
            logger.warn({ userId, roundId, error: result.error }, 'Bet rejected');
          }
        }
      } catch (err: any) {
        logger.error(err, 'PLACE_BET socket handler error');
        socket.emit('BET_REJECTED', { error: 'Internal error' });
      }
    });

    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id, userId }, 'User disconnected from /updown');
    });
  });
};
