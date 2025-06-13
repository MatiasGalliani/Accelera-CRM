import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { Lead } from '../models/leads-index.js';
import { Resend } from 'resend';
import sequelize from '../config/database.js';

const router = express.Router();

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);
console.log('Resend API Key:', process.env.RESEND_API_KEY ? 'Present' : 'Missing');

// Valid sources
const VALID_SOURCES = ['aimedici', 'aiquinto', 'aifidi'];

/**
 * @route   POST /api/email/send
 * @desc    Send email to selected leads
 * @access  Private (Admin only)
 */
router.post('/send', authenticate, requireAdmin, async (req, res) => {
  try {
    const { subject, content, sources } = req.body;

    if (!subject || !content || !sources || !Array.isArray(sources)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate sources
    const invalidSources = sources.filter(source => !VALID_SOURCES.includes(source));
    if (invalidSources.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid sources selected',
        invalidSources 
      });
    }

    console.log('Searching for leads with sources:', sources);

    // Get leads from database based on sources
    const leads = await Lead.findAll({
      where: {
        source: sources
      }
    });

    console.log(`Found ${leads.length} leads for the selected sources`);

    if (leads.length === 0) {
      return res.status(404).json({ 
        error: 'No leads found for the selected sources',
        sources: sources
      });
    }

    // Log the distribution of leads by source
    const leadsBySource = leads.reduce((acc, lead) => {
      acc[lead.source] = (acc[lead.source] || 0) + 1;
      return acc;
    }, {});
    console.log('Leads distribution by source:', leadsBySource);

    // Prepare email recipients
    const recipients = leads.map(lead => lead.email);

    // Validate email addresses
    const validRecipients = recipients.filter(email => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    });

    if (validRecipients.length === 0) {
      return res.status(400).json({ 
        error: 'No valid email addresses found',
        totalLeads: leads.length
      });
    }

    console.log(`Sending email to ${validRecipients.length} valid recipients`);

    // Send individual emails to each recipient
    const results = await Promise.all(
      validRecipients.map(async (recipient) => {
        try {
          const { data, error } = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
            to: recipient,
            subject: subject,
            html: content,
            reply_to: process.env.EMAIL_REPLY_TO
          });

          if (error) {
            console.error(`Error sending email to ${recipient}:`, error);
            return { recipient, success: false, error: error.message };
          }

          return { recipient, success: true, messageId: data.id };
        } catch (error) {
          console.error(`Error sending email to ${recipient}:`, error);
          return { recipient, success: false, error: error.message };
        }
      })
    );

    // Count successful and failed sends
    const successfulSends = results.filter(r => r.success).length;
    const failedSends = results.filter(r => !r.success).length;

    // Log results
    console.log(`Email sending complete. Successful: ${successfulSends}, Failed: ${failedSends}`);

    res.json({
      success: true,
      message: 'Email sending complete',
      results: {
        total: validRecipients.length,
        successful: successfulSends,
        failed: failedSends
      },
      leadsBySource
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ 
      error: 'Error sending email',
      details: error.message 
    });
  }
});

/**
 * @route   GET /api/email/sources
 * @desc    Get available sources and their lead counts
 * @access  Private (Admin only)
 */
router.get('/sources', authenticate, requireAdmin, async (req, res) => {
  try {
    const sources = await Lead.findAll({
      attributes: [
        'source',
        [sequelize.fn('COUNT', sequelize.col('id')), 'leadCount']
      ],
      where: {
        source: VALID_SOURCES
      },
      group: ['source']
    });

    res.json({
      sources: sources.map(source => ({
        id: source.source,
        label: source.source,
        leadCount: parseInt(source.getDataValue('leadCount'))
      }))
    });
  } catch (error) {
    console.error('Error getting sources:', error);
    res.status(500).json({ 
      error: 'Error getting sources',
      details: error.message 
    });
  }
});

export default router; 