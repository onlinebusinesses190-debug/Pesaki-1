import { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

// ─── Helper: Extract user ID from JWT ──────────────────────────────────────
const getUserId = (authHeader: string | undefined): string | null => {
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.sub || null;
  } catch {
    return null;
  }
};

export const kaziRoutes = async (fastify: FastifyInstance) => {
  // ─── GET /kazi/jobs ──────────────────────────────────────────────────────
  fastify.get('/jobs', async (request, reply) => {
    try {
      const { q } = request.query as { q?: string };
      let query = supabase
        .from('jobs')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (q) {
        const term = q.toLowerCase();
        // Use text search with ilike – works with any column
        query = query.or(
          `title.ilike.%${term}%,location.ilike.%${term}%,category.ilike.%${term}%,description.ilike.%${term}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      // Map to frontend format – use any to bypass type checks
      const jobs = (data || []).map((job: any) => ({
        id: job.id,
        title: job.title,
        category: job.category,
        location: job.location,
        pay: job.pay_label,
        payAmount: job.pay_amount,
        duration: job.duration,
        description: job.description,
        badge: job.urgent ? 'Urgent' : job.hot ? 'Hot' : 'Gold',
        status: job.status,
        created_at: job.created_at,
        employer_id: job.employer_id,
      }));

      reply.send(jobs);
    } catch (err) {
      logger.error('[KAZI] GET /jobs error:', err);
      reply.status(500).send({ error: 'Failed to fetch jobs' });
    }
  });

  // ─── POST /kazi/jobs ──────────────────────────────────────────────────────
  fastify.post('/jobs', async (request, reply) => {
    try {
      const userId = getUserId(request.headers.authorization);
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const {
        title,
        category,
        location,
        pay,
        payAmount,
        duration,
        accommodation,
        requirements,
        description,
      } = request.body as any;

      if (!title || !category || !location || !pay || !payAmount || !duration || !description) {
        return reply.status(400).send({ error: 'Missing required fields' });
      }

      const { data, error } = await supabase
        .from('jobs')
        .insert([
          {
            employer_id: userId,
            title,
            category,
            location,
            pay_label: pay,
            pay_amount: payAmount,
            duration,
            accommodation: accommodation || false,
            requirements: requirements || [],
            description,
            status: 'open',
            urgent: false,
            hot: false,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      reply.status(201).send({
        success: true,
        job: {
          id: data.id,
          title: data.title,
          category: data.category,
          location: data.location,
          pay: data.pay_label,
          payAmount: data.pay_amount,
          duration: data.duration,
          description: data.description,
          badge: 'Gold',
          status: data.status,
          created_at: data.created_at,
        },
      });
    } catch (err) {
      logger.error('[KAZI] POST /jobs error:', err);
      reply.status(500).send({ error: 'Failed to post job' });
    }
  });

  // ─── GET /kazi/applications (simplified, with role filter) ──────────────
  fastify.get('/applications', async (request, reply) => {
    try {
      const userId = getUserId(request.headers.authorization);
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { role } = request.query as { role?: 'worker' | 'employer' };

      let query = supabase
        .from('applications')
        .select('*, jobs:job_id ( title, pay_label, pay_amount, employer_id, location )');

      if (role === 'worker') {
        query = query.eq('worker_id', userId);
      } else if (role === 'employer') {
        // Only applications for jobs the employer posted
        // We'll filter later by fetching the employer's job IDs
        // but for now, we'll get all and filter in JS (simpler)
        // Actually, we need to join with jobs to filter by employer_id.
        // We'll do a subquery or use .in
        const { data: myJobs } = await supabase
          .from('jobs')
          .select('id')
          .eq('employer_id', userId);
        const jobIds = (myJobs || []).map((j: any) => j.id);
        if (jobIds.length > 0) {
          query = query.in('job_id', jobIds);
        } else {
          // No jobs posted, return empty array
          return reply.send([]);
        }
      } else {
        // Default: return both worker and employer apps
        query = query.or(`worker_id.eq.${userId},jobs.employer_id.eq.${userId}`);
      }

      const { data, error } = await query.order('applied_at', { ascending: false });
      if (error) throw error;

      const apps = (data || []).map((app: any) => ({
        id: app.id,
        jobId: app.job_id,
        jobTitle: app.jobs?.title || 'Unknown job',
        jobPay: app.jobs?.pay_label || 'KES 0',
        jobPayAmount: app.jobs?.pay_amount || 0,
        applicantName: app.applicant_name,
        phone: app.phone,
        email: app.email,
        location: app.location,
        experience: app.experience,
        availability: app.availability,
        status: app.status,
        appliedAt: app.applied_at,
        photoName: app.photo_url ? 'Uploaded' : null,
        workerId: app.worker_id,
      }));

      reply.send(apps);
    } catch (err) {
      logger.error('[KAZI] GET /applications error:', err);
      reply.status(500).send({ error: 'Failed to fetch applications' });
    }
  });

  // ─── POST /kazi/applications ─────────────────────────────────────────────
  fastify.post('/applications', async (request, reply) => {
    try {
      const userId = getUserId(request.headers.authorization);
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const {
        jobId,
        applicantName,
        phone,
        email,
        location,
        experience,
        availability,
      } = request.body as any;

      if (!jobId || !applicantName || !phone || !email || !location || !experience || !availability) {
        return reply.status(400).send({ error: 'Missing required fields' });
      }

      // Check if already applied
      const { data: existing, error: checkErr } = await supabase
        .from('applications')
        .select('id')
        .eq('job_id', jobId)
        .eq('worker_id', userId)
        .maybeSingle();

      if (checkErr) throw checkErr;
      if (existing) {
        return reply.status(409).send({ error: 'Already applied to this job' });
      }

      const { data, error } = await supabase
        .from('applications')
        .insert([
          {
            job_id: jobId,
            worker_id: userId,
            applicant_name: applicantName,
            phone,
            email,
            location,
            experience,
            availability,
            status: 'Pending',
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // Notify employer (optional – we'll keep it simple)
      reply.status(201).send({
        success: true,
        application: {
          id: data.id,
          jobId: data.job_id,
          applicantName: data.applicant_name,
          status: data.status,
          appliedAt: data.applied_at,
        },
      });
    } catch (err) {
      logger.error('[KAZI] POST /applications error:', err);
      reply.status(500).send({ error: 'Failed to apply' });
    }
  });

  // ─── Other endpoints (hire, payout, etc.) – simplified to avoid errors ──
  fastify.put('/applications/:id/status', async (request, reply) => {
    try {
      const userId = getUserId(request.headers.authorization);
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      const { id } = request.params as { id: string };
      const { status } = request.body as { status: string };
      if (!status || !['Hired', 'Rejected', 'Shortlisted'].includes(status)) {
        return reply.status(400).send({ error: 'Invalid status' });
      }
      // Verify ownership (simplified)
      const { data: app, error: fetchErr } = await supabase
        .from('applications')
        .select('job_id, worker_id')
        .eq('id', id)
        .single();
      if (fetchErr) throw fetchErr;
      if (!app) return reply.status(404).send({ error: 'Application not found' });
      // Check job ownership
      const { data: job, error: jobErr } = await supabase
        .from('jobs')
        .select('employer_id')
        .eq('id', app.job_id)
        .single();
      if (jobErr) throw jobErr;
      if (job.employer_id !== userId) {
        return reply.status(403).send({ error: 'Not authorized' });
      }
      const { data, error } = await supabase
        .from('applications')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      reply.send({ success: true, application: data });
    } catch (err) {
      logger.error('[KAZI] PUT /applications/:id/status error:', err);
      reply.status(500).send({ error: 'Failed to update application' });
    }
  });

  // ─── GET /kazi/notifications ─────────────────────────────────────────────
  fastify.get('/notifications', async (request, reply) => {
    try {
      const userId = getUserId(request.headers.authorization);
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      reply.send(data || []);
    } catch (err) {
      logger.error('[KAZI] GET /notifications error:', err);
      reply.status(500).send({ error: 'Failed to fetch notifications' });
    }
  });

  // ─── POST /kazi/notifications/read ─────────────────────────────────────
  fastify.post('/notifications/read', async (request, reply) => {
    try {
      const userId = getUserId(request.headers.authorization);
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .neq('read', true);
      if (error) throw error;
      reply.send({ success: true });
    } catch (err) {
      logger.error('[KAZI] POST /notifications/read error:', err);
      reply.status(500).send({ error: 'Failed to mark read' });
    }
  });

  // ─── POST /kazi/hire (simplified) ──────────────────────────────────────
  fastify.post('/hire', async (request, reply) => {
    try {
      const userId = getUserId(request.headers.authorization);
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      const { applicationId } = request.body as any;
      if (!applicationId) {
        return reply.status(400).send({ error: 'applicationId required' });
      }
      // Verify ownership and hire
      const { data: app, error: appErr } = await supabase
        .from('applications')
        .select('*, jobs:job_id ( employer_id, pay_amount )')
        .eq('id', applicationId)
        .single();
      if (appErr) throw appErr;
      if (!app) return reply.status(404).send({ error: 'Application not found' });
      if (app.jobs.employer_id !== userId) {
        return reply.status(403).send({ error: 'Not authorized' });
      }
      if (app.status === 'Hired') {
        return reply.status(409).send({ error: 'Already hired' });
      }
      const { data: updated, error: updateErr } = await supabase
        .from('applications')
        .update({ status: 'Hired' })
        .eq('id', applicationId)
        .select()
        .single();
      if (updateErr) throw updateErr;
      reply.send({ success: true, application: updated });
    } catch (err) {
      logger.error('[KAZI] POST /hire error:', err);
      reply.status(500).send({ error: 'Failed to hire' });
    }
  });

  // ─── POST /kazi/payout/register (simplified) ──────────────────────────
  fastify.post('/payout/register', async (request, reply) => {
    try {
      const userId = getUserId(request.headers.authorization);
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }
      const { applicationId } = request.body as any;
      if (!applicationId) {
        return reply.status(400).send({ error: 'applicationId required' });
      }
      // Just mark as paid in a dummy way (we'll create a payout record later)
      // For now, return success
      reply.send({ success: true });
    } catch (err) {
      logger.error('[KAZI] POST /payout/register error:', err);
      reply.status(500).send({ error: 'Failed to register payout' });
    }
  });
};
