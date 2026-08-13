import { FastifyInstance } from 'fastify';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

// Helper: extract user ID from JWT
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
  // ── GET /kazi/jobs ──────────────────────────────
  fastify.get('/jobs', async (request, reply) => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const jobs = (data || []).map((job: any) => ({
        id: job.id,
        title: job.title,
        category: job.category,
        location: job.location,
        pay: job.pay_label || 'KES 0',
        payAmount: job.pay_amount || 0,
        duration: job.duration || '',
        description: job.description || '',
        badge: job.urgent ? 'Urgent' : job.hot ? 'Hot' : 'Gold',
        status: job.status,
        createdAt: job.created_at,
        employerId: job.employer_id,
      }));

      reply.send(jobs);
    } catch (err) {
      logger.error('[KAZI] GET /jobs error:', err);
      reply.status(500).send({ error: 'Failed to fetch jobs' });
    }
  });

  // ── POST /kazi/jobs ──────────────────────────────
  fastify.post('/jobs', async (request, reply) => {
    try {
      const userId = getUserId(request.headers.authorization);
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const {
        title, category, location, pay, payAmount,
        duration, accommodation, requirements, description,
      } = request.body as any;

      if (!title || !category || !location || !pay || !payAmount || !duration || !description) {
        return reply.status(400).send({ error: 'Missing required fields' });
      }

      const { data, error } = await supabase
        .from('jobs')
        .insert([{
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
        }])
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
          pay: data.pay_label || pay,
          payAmount: data.pay_amount || payAmount,
          duration: data.duration,
          description: data.description,
          badge: 'Gold',
          status: data.status,
          createdAt: data.created_at,
        },
      });
    } catch (err) {
      logger.error('[KAZI] POST /jobs error:', err);
      reply.status(500).send({ error: 'Failed to post job' });
    }
  });

  // ── GET /kazi/applications ──────────────────────
  fastify.get('/applications', async (request, reply) => {
    try {
      const userId = getUserId(request.headers.authorization);
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { data, error } = await supabase
        .from('applications')
        .select('*, jobs:job_id ( title, pay_label, pay_amount, employer_id, location )')
        .eq('worker_id', userId)
        .order('applied_at', { ascending: false });

      if (error) throw error;

      const apps = (data || []).map((app: any) => ({
        id: app.id,
        jobId: app.job_id,
        jobTitle: app.jobs?.title || 'Unknown job',
        jobPay: app.jobs?.pay_label || 'KES 0',
        jobPayAmount: app.jobs?.pay_amount || 0,
        applicantName: app.applicant_name || '',
        phone: app.phone || '',
        email: app.email || '',
        location: app.location || '',
        experience: app.experience || '',
        availability: app.availability || '',
        status: app.status || 'Pending',
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

  // ── POST /kazi/applications ─────────────────────
  fastify.post('/applications', async (request, reply) => {
    try {
      const userId = getUserId(request.headers.authorization);
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { jobId, applicantName, phone, email, location, experience, availability } = request.body as any;

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
        .insert([{
          job_id: jobId,
          worker_id: userId,
          applicant_name: applicantName,
          phone,
          email,
          location,
          experience,
          availability,
          status: 'Pending',
        }])
        .select()
        .single();

      if (error) throw error;

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
};
