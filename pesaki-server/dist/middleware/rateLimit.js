"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupRateLimit = void 0;
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const setupRateLimit = async (fastify) => {
    await fastify.register(rate_limit_1.default, {
        max: 100,
        timeWindow: '1 minute',
        errorResponseBuilder: (request, context) => ({
            success: false,
            error: 'Too many requests, please try again later.',
            code: 'RATE_LIMIT_EXCEEDED'
        })
    });
};
exports.setupRateLimit = setupRateLimit;
