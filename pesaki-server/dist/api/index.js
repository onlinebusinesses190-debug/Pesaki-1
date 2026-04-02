"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = void 0;
const wallet_1 = require("./routes/wallet");
const aviator_1 = require("./routes/aviator");
const mpesa_1 = require("./routes/mpesa");
const spin_1 = require("./routes/spin");
const prediction_1 = require("./routes/prediction");
const health_1 = require("./routes/health");
const market_1 = require("./routes/market");
const nse_1 = require("./routes/nse");
const registerRoutes = (fastify) => {
    fastify.register(health_1.healthRoutes); // /health is global
    fastify.register(market_1.marketRoutes, { prefix: '/market' });
    fastify.register(wallet_1.walletRoutes, { prefix: '/wallet' });
    fastify.register(mpesa_1.mpesaRoutes, { prefix: '/api/mpesa' });
    fastify.register(aviator_1.aviatorRoutes, { prefix: '/games/aviator' });
    fastify.register(spin_1.spinRoutes, { prefix: '/games/spin' });
    fastify.register(prediction_1.predictionRoutes, { prefix: '/games/prediction' });
    fastify.register(nse_1.nseRoutes, { prefix: '/games/nse' });
};
exports.registerRoutes = registerRoutes;
