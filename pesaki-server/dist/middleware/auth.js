"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAuth = void 0;
const supabase_1 = require("../lib/supabase");
const logger_1 = require("../utils/logger");
const verifyAuth = async (request, reply) => {
    try {
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            logger_1.logger.warn('No Authorization header provided');
            return reply.code(401).send({ success: false, error: 'Missing Authorization header', code: 'MISSING_HEADER' });
        }
        if (!authHeader.startsWith('Bearer ')) {
            logger_1.logger.warn('Invalid Authorization format');
            return reply.code(401).send({ success: false, error: 'Invalid Authorization format (expected Bearer token)', code: 'INVALID_FORMAT' });
        }
        const token = authHeader.slice(7); // Remove 'Bearer ' prefix
        // Verify token using Supabase
        const { data: { user }, error } = await supabase_1.supabase.auth.getUser(token);
        if (error || !user) {
            logger_1.logger.warn({ message: error?.message }, 'Token verification failed');
            return reply.code(401).send({ success: false, error: 'Invalid or expired token', code: 'UNAUTHORIZED' });
        }
        // Attach user to request context
        request.user = { id: user.id, email: user.email };
    }
    catch (error) {
        logger_1.logger.error(error, 'Auth middleware error');
        return reply.code(500).send({ success: false, error: 'Internal server error during authentication', code: 'INTERNAL_ERROR' });
    }
};
exports.verifyAuth = verifyAuth;
