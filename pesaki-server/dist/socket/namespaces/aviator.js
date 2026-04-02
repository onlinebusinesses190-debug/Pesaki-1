"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupAviatorNamespace = void 0;
const logger_1 = require("../../utils/logger");
const engine_1 = require("../../games/aviator/engine");
const setupAviatorNamespace = (io) => {
    const nsp = io.of('/aviator');
    nsp.on('connection', (socket) => {
        logger_1.logger.info({
            socketId: socket.id,
            userId: socket.data?.user?.id
        }, 'User connected to /aviator');
        // Send the current game state when user first joins
        socket.emit('SYNC_STATE', (0, engine_1.getAviatorState)());
        // NOTE: PLACE_BET is handled via REST API to ensure atomic wallet transactions via HTTP correctly.
        // However, if we need it here, we just listen to it. The user requested API for bet and cashout, 
        // but the engine mentions "Accept CASHOUT events from clients" ... 
        // We'll implement CASHOUT here so it has zero latency.
        socket.on('CASHOUT', async () => {
            try {
                const userId = socket.data.user.id;
                const result = await (0, engine_1.cashOut)(userId);
                socket.emit('CASHOUT_SUCCESS', result);
            }
            catch (error) {
                socket.emit('CASHOUT_FAILED', { error: error.message });
            }
        });
        socket.on('disconnect', () => {
            // cleanup maybe
        });
    });
};
exports.setupAviatorNamespace = setupAviatorNamespace;
