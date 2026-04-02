"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initCronJobs = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const fetchMarketData_1 = require("./fetchMarketData");
const settlePredictions_1 = require("./settlePredictions");
const logger_1 = require("../utils/logger");
const initCronJobs = () => {
    logger_1.logger.info('Initializing Node-Cron schedules...');
    // Every minute
    node_cron_1.default.schedule('* * * * *', () => {
        (0, settlePredictions_1.runSettlePredictions)();
    });
    // Every 5 minutes
    node_cron_1.default.schedule('*/5 * * * *', () => {
        (0, fetchMarketData_1.fetchMarketData)();
    });
    // Fire once on startup to warm up cache
    (0, fetchMarketData_1.fetchMarketData)();
};
exports.initCronJobs = initCronJobs;
