"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSettlePredictions = void 0;
const engine_1 = require("../games/prediction/engine");
const logger_1 = require("../utils/logger");
const runSettlePredictions = async () => {
    try {
        await (0, engine_1.settlePredictions)();
    }
    catch (err) {
        logger_1.logger.error(err, 'Failed to run prediction settling job');
    }
};
exports.runSettlePredictions = runSettlePredictions;
