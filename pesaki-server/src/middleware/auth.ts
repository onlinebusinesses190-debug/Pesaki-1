import { FastifyReply, FastifyRequest } from 'fastify';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

declare module 'fastify' {
  interface FastifyRequest {
    user?: { id: string; email?: string };
  }
}

export const verifyAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ success: false, error: 'Missing or invalid Authorization header', code: 'UNAUTHORIZED' });
    }

    const token = authHeader.split(' ')[1];
    
    // Auth validation using Supabase service role client to verify actual token payload
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.warn({ err: error?.message }, 'Authentication failed');
      return reply.code(401).send({ success: false, error: 'Invalid or expired token', code: 'UNAUTHORIZED' });
    }

    // Attach user to request context
    request.user = { id: user.id, email: user.email };
  } catch (error) {
    logger.error(error, 'Auth middleware error');
    return reply.code(500).send({ success: false, error: 'Internal server error during authentication', code: 'INTERNAL_ERROR' });
  }
};
