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
        query = query.or(
          `title.ilike.%${term}%,location.ilike.%${term}%,category.ilike.%${term}%,description.ilike.%${term}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      const jobs = data.map((job: any) => ({
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

  // ─── GET /kazi/applications ──────────────────────────────────────────────
  fastify.get('/applications', async (request, reply) => {
    try {
      const userId = getUserId(request.headers.authorization);
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          jobs:job_id ( title, pay_label, pay_amount, employer_id, location )
        `)
        .or(`worker_id.eq.${userId},jobs.employer_id.eq.${userId}`)
        .order('applied_at', { ascending: false });

      if (error) throw error;

      const apps = data.map((app: any) => ({
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

  // ─── PUT /kazi/applications/:id/status ──────────────────────────────────
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

      // Verify ownership
      const { data: app, error: fetchErr } = await supabase
        .from('applications')
        .select('job_id, worker_id')
        .eq('id', id)
        .single();

      if (fetchErr) throw fetchErr;
      if (!app) return reply.status(404).send({ error: 'Application not found' });

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

  // ─── GET /kazi/messages ──────────────────────────────────────────────────
  fastify.get('/messages', async (request, reply) => {
    try {
      const userId = getUserId(request.headers.authorization);
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { threadId } = request.query as { threadId?: string };
      if (!threadId) {
        return reply.status(400).send({ error: 'threadId required' });
      }

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('sent_at', { ascending: true });

      if (error) throw error;

      reply.send(data);
    } catch (err) {
      logger.error('[KAZI] GET /messages error:', err);
      reply.status(500).send({ error: 'Failed to fetch messages' });
    }
  });

  // ─── POST /kazi/messages ──────────────────────────────────────────────────
  fastify.post('/messages', async (request, reply) => {
    try {
      const userId = getUserId(request.headers.authorization);
      if (!userId) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { threadId, text, fromRole } = request.body as any;
      if (!threadId || !text) {
        return reply.status(400).send({ error: 'threadId and text required' });
      }

      const senderRole = fromRole || 'worker';

      const { data, error } = await supabase
        .from('messages')
        .insert([
          {
            thread_id: threadId,
            sender_id: userId,
            sender_role: senderRole,
            text,
            sent_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      reply.status(201).send(data);
    } catch (err) {
      logger.error('[KAZI] POST /messages error:', err);
      reply.status(500).send({ error: 'Failed to send message' });
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

      reply.send(data);
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

  // ─── POST /kazi/hire ──────────────────────────────────────────────────────
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

      // Fetch application and job details
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

      // Deduct from wallet (call debit function here if needed)

      const { data: updated, error: updateErr } = await supabase
        .from('applications')
        .update({ status: 'Hired' })
        .eq('id', applicationId)
        .select()
        .single();

      if (updateErr) throw updateErr;

      // Create payout record
      await supabase.from('payouts').insert([
        {
          application_id: applicationId,
          worker_id: app.worker_id,
          amount: app.jobs.pay_amount,
          status: 'pending',
        },
      ]);

      // Notify worker
      await supabase.from('notifications').insert([
        {
          user_id: app.worker_id,
          title: 'You have been hired!',
          body: `Congratulations! You've been hired for ${app.jobs.title}`,
          read: false,
        },
      ]);

      reply.send({ success: true, application: updated });
    } catch (err) {
      logger.error('[KAZI] POST /hire error:', err);
      reply.status(500).send({ error: 'Failed to hire' });
    }
  });

  // ─── POST /kazi/payout/register ─────────────────────────────────────────
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

      // Check if payout already exists
      const { data: existing, error: checkErr } = await supabase
        .from('payouts')
        .select('*')
        .eq('application_id', applicationId)
        .eq('worker_id', userId)
        .maybeSingle();

      if (checkErr) throw checkErr;

      if (existing) {
        const { data, error } = await supabase
          .from('payouts')
          .update({ service_fee_paid: true, paid_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return reply.send({ success: true, payout: data });
      }

      // Create new payout
      const { data: app, error: appErr } = await supabase
        .from('applications')
        .select('job_id, jobs:job_id ( pay_amount )')
        .eq('id', applicationId)
        .single();

      if (appErr) throw appErr;

      const { data: newPayout, error: insertErr } = await supabase
        .from('payouts')
        .insert([
          {
            application_id: applicationId,
            worker_id: userId,
            amount: app.jobs.pay_amount,
            service_fee_paid: true,
            paid_at: new Date().toISOString(),
            status: 'paid',
          },
        ])
        .select()
        .single();

      if (insertErr) throw insertErr;

      reply.send({ success: true, payout: newPayout });
    } catch (err) {
      logger.error('[KAZI] POST /payout/register error:', err);
      reply.status(500).send({ error: 'Failed to register payout' });
    }
  });
};
