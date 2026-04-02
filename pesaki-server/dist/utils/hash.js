"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeCrashPoint = exports.generateServerSeed = exports.sha256 = void 0;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Generates a SHA-256 hash
 */
const sha256 = (data) => {
    return crypto_1.default.createHash('sha256').update(data).digest('hex');
};
exports.sha256 = sha256;
/**
 * Generates a secure random server seed
 */
const generateServerSeed = () => {
    return crypto_1.default.randomBytes(32).toString('hex');
};
exports.generateServerSeed = generateServerSeed;
/**
 * Computes crash point for Aviator using a Provably Fair algorithm
 */
const computeCrashPoint = (serverSeed, clientSeed) => {
    const hash = crypto_1.default.createHmac('sha256', serverSeed).update(clientSeed).digest('hex');
    const h = parseInt(hash.slice(0, 13), 16);
    const e = Math.pow(2, 52);
    const result = Math.floor((100 * e - h) / (e - h));
    return Math.max(100, result) / 100; // Return multiplier like 1.05, 2.45
};
exports.computeCrashPoint = computeCrashPoint;
