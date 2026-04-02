"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRoundOutcome = void 0;
const hash_1 = require("../../utils/hash");
/**
 * Aviator Provably Fair RNG
 *
 * Uses SHA-256 HMAC of a server seed and client seed to generate a deterministic
 * outcome that can be verified once the server seed is revealed.
 */
const generateRoundOutcome = (clientSeed) => {
    const serverSeed = (0, hash_1.generateServerSeed)();
    // Using a default client seed if not provided, or it can be a hardcoded 
    // platform seed combined with the last BTC block hash.
    const cSeed = clientSeed || '0000000000000000000000000000000000000000000000000000000000000000';
    const crashPoint = (0, hash_1.computeCrashPoint)(serverSeed, cSeed);
    return {
        serverSeed,
        clientSeed: cSeed,
        crashPoint
    };
};
exports.generateRoundOutcome = generateRoundOutcome;
