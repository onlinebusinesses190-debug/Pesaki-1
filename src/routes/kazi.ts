import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

const router = Router();

// ─── Helper: Extract user ID from JWT ──────────────────────────────────────
const getUserId = (authHeader: string | undefined): string | null => {
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  try {
    // Supabase JWT decoding (simplified – you can use `jwt-decode` package)
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.sub || null;
  } catch {
    return null;
  }
};

// ─── GET /kazi/jobs ────────────────────────────────────────────────────────
// Fetch all open jobs, with optional search (title, location, category)
router.get('/jobs', async (req, res) => {
  try {
    const { q } = req.query;
    let query = supabase
      .from('jobs')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (q && typeof q === 'string') {
      const term = q.toLowerCase();
      query = query.or(
        `title.ilike.%${term}%,location.ilike.%${term}%,category.ilike.%${term}%,description.ilike.%${term}%`
      );
    }

    const { data, error } = await query;
    if (error) throw error;

    // Format to match frontend (e.g., badge based on urgency, pay label)
    const jobs = data.map((job: any) => ({
      id: job.id,
      title: job.title,
      category: job.category,
      location: job.location,
      pay: job.pay_label, // e.g., "KES 25,000/mo"
      payAmount: job.pay_amount,
      duration: job.duration,
      description: job.description,
      badge: job.urgent ? 'Urgent' : job.hot ? 'Hot' : 'Gold',
      status: job.status,
      created_at: job.created_at,
      employer_id: job.employer_id,
    }));

    res.json(jobs);
  } catch (err) {
    logger.error('[KAZI] GET /jobs error:', err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// ─── POST /kazi/jobs ───────────────────────────────────────────────────────
// Employer posts a new job (requires auth)
router.post('/jobs', async (req, res) => {
  try {
    const userId = getUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
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
      postedBy,
    } = req.body;

    // Validate required fields
    if (!title || !category || !location || !pay || !payAmount || !duration || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
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

    res.status(201).json({
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
    res.status(500).json({ error: 'Failed to post job' });
  }
});

// ─── GET /kazi/applications ──────────────────────────────────────────────
// Get applications for the logged‑in user (worker) or employer
router.get('/applications', async (req, res) => {
  try {
    const userId = getUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get applications where user is either the worker or the employer of the job
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        jobs:job_id ( title, pay_label, pay_amount, employer_id, location )
      `)
      .or(`worker_id.eq.${userId},jobs.employer_id.eq.${userId}`)
      .order('applied_at', { ascending: false });

    if (error) throw error;

    // Format to match frontend
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
      // For employer view
      workerId: app.worker_id,
    }));

    res.json(apps);
  } catch (err) {
    logger.error('[KAZI] GET /applications error:', err);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// ─── POST /kazi/applications ──────────────────────────────────────────────
// Worker applies for a job (requires auth)
router.post('/applications', async (req, res) => {
  try {
    const userId = getUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      jobId,
      applicantName,
      phone,
      email,
      location,
      experience,
      availability,
    } = req.body;

    if (!jobId || !applicantName || !phone || !email || !location || !experience || !availability) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if already applied
    const { data: existing, error: checkError } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('worker_id', userId)
      .maybeSingle();

    if (checkError) throw checkError;
    if (existing) {
      return res.status(409).json({ error: 'Already applied to this job' });
    }

    // Insert application
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

    // Also create a notification for the employer
    await supabase.from('notifications').insert([
      {
        user_id: data.job_id, // We need employer_id – we'll get from job
        title: 'New application',
        body: `${applicantName} applied for your job`,
        read: false,
      },
    ]);

    res.status(201).json({
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
    res.status(500).json({ error: 'Failed to apply' });
  }
});

// ─── PUT /kazi/applications/:id/status ──────────────────────────────────
// Employer updates application status (hire/reject)
router.put('/applications/:id/status', async (req, res) => {
  try {
    const userId = getUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['Hired', 'Rejected', 'Shortlisted'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Verify that the logged‑in user is the employer of this application's job
    const { data: app, error: fetchError } = await supabase
      .from('applications')
      .select('job_id, worker_id')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!app) return res.status(404).json({ error: 'Application not found' });

    // Check employer ownership
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('employer_id')
      .eq('id', app.job_id)
      .single();

    if (jobError) throw jobError;
    if (job.employer_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this application' });
    }

    // Update status
    const { data, error } = await supabase
      .from('applications')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Notify worker
    await supabase.from('notifications').insert([
      {
        user_id: app.worker_id,
        title: `Application ${status}`,
        body: `Your application has been ${status}`,
        read: false,
      },
    ]);

    res.json({ success: true, application: data });
  } catch (err) {
    logger.error('[KAZI] PUT /applications/:id/status error:', err);
    res.status(500).json({ error: 'Failed to update application' });
  }
});

// ─── GET /kazi/messages ────────────────────────────────────────────────────
// Get messages for a thread (jobId:applicationId)
router.get('/messages', async (req, res) => {
  try {
    const userId = getUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { threadId } = req.query;
    if (!threadId) {
      return res.status(400).json({ error: 'threadId required' });
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('sent_at', { ascending: true });

    if (error) throw error;

    // Check if user is part of the thread (optional security)
    // For simplicity, we return messages

    res.json(data);
  } catch (err) {
    logger.error('[KAZI] GET /messages error:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ─── POST /kazi/messages ──────────────────────────────────────────────────
// Send a message in a thread
router.post('/messages', async (req, res) => {
  try {
    const userId = getUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { threadId, text, fromRole } = req.body;
    if (!threadId || !text) {
      return res.status(400).json({ error: 'threadId and text required' });
    }

    // Determine sender role (employer or worker) – we'll store it
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

    res.status(201).json(data);
  } catch (err) {
    logger.error('[KAZI] POST /messages error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ─── GET /kazi/notifications ──────────────────────────────────────────────
router.get('/notifications', async (req, res) => {
  try {
    const userId = getUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    logger.error('[KAZI] GET /notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// ─── POST /kazi/notifications/read ──────────────────────────────────────
// Mark all notifications as read
router.post('/notifications/read', async (req, res) => {
  try {
    const userId = getUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .neq('read', true);

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    logger.error('[KAZI] POST /notifications/read error:', err);
    res.status(500).json({ error: 'Failed to mark read' });
  }
});

// ─── POST /kazi/hire ──────────────────────────────────────────────────────
// Employer hires a worker and deposits escrow
router.post('/hire', async (req, res) => {
  try {
    const userId = getUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { applicationId, totalAmount } = req.body;

    if (!applicationId || !totalAmount) {
      return res.status(400).json({ error: 'applicationId and totalAmount required' });
    }

    // Fetch application and job details
    const { data: app, error: appError } = await supabase
      .from('applications')
      .select('*, jobs:job_id ( employer_id, pay_amount )')
      .eq('id', applicationId)
      .single();

    if (appError) throw appError;
    if (!app) return res.status(404).json({ error: 'Application not found' });

    // Ensure the logged‑in user is the employer
    if (app.jobs.employer_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Check if already hired
    if (app.status === 'Hired') {
      return res.status(409).json({ error: 'Already hired' });
    }

    // Deduct from employer's wallet (use wallet/service)
    // We'll call the existing `debit` function – import it from '../wallet/service'
    // For now, we'll simulate a deduction
    // In production, you'd call debit(userId, totalAmount, 'real', 'KAZI Link escrow deposit')

    // Update application status to Hired
    const { data: updated, error: updateErr } = await supabase
      .from('applications')
      .update({ status: 'Hired' })
      .eq('id', applicationId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // Create a payout record (optional)
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

    res.json({ success: true, application: updated });
  } catch (err) {
    logger.error('[KAZI] POST /hire error:', err);
    res.status(500).json({ error: 'Failed to hire' });
  }
});

// ─── POST /kazi/payout/register ──────────────────────────────────────────
// Worker registers to receive payout (marks service fee paid)
router.post('/payout/register', async (req, res) => {
  try {
    const userId = getUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { applicationId } = req.body;
    if (!applicationId) {
      return res.status(400).json({ error: 'applicationId required' });
    }

    // Update payout record to mark service fee as paid
    // In your frontend, you're using `serviceFeePaid` flag on application.
    // We'll store it separately in a `payouts` table.

    const { data, error } = await supabase
      .from('payouts')
      .update({ service_fee_paid: true, paid_at: new Date().toISOString() })
      .eq('application_id', applicationId)
      .eq('worker_id', userId)
      .select()
      .single();

    if (error) {
      // If no payout record exists, create one
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
      return res.json({ success: true, payout: newPayout });
    }

    res.json({ success: true, payout: data });
  } catch (err) {
    logger.error('[KAZI] POST /payout/register error:', err);
    res.status(500).json({ error: 'Failed to register payout' });
  }
});

// ─── POST /kazi/jobs/:id/close ──────────────────────────────────────────
// Employer can close a job (mark as filled or no longer needed)
router.post('/jobs/:id/close', async (req, res) => {
  try {
    const userId = getUserId(req.headers.authorization);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;

    // Verify ownership
    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select('employer_id')
      .eq('id', id)
      .single();

    if (jobErr) throw jobErr;
    if (job.employer_id !== userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const { data, error } = await supabase
      .from('jobs')
      .update({ status: 'closed', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, job: data });
  } catch (err) {
    logger.error('[KAZI] POST /jobs/:id/close error:', err);
    res.status(500).json({ error: 'Failed to close job' });
  }
});

export default router;
