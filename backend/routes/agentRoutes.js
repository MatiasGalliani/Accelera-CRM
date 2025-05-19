import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { Agent, AgentLeadSource } from '../models/leads-index.js';

const router = express.Router();

// GET /api/agents - Get all agents (admin only)
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const agents = await Agent.findAll({
      include: [{ model: AgentLeadSource }]
    });
    res.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// GET /api/agents/:id - Get a specific agent
router.get('/:id', authenticate, async (req, res) => {
  try {
    const agent = await Agent.findByPk(req.params.id, {
      include: [{ model: AgentLeadSource }]
    });
    
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    res.json(agent);
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

// PUT /api/agents/:id/lead-sources - Update an agent's lead sources
router.put('/:id/lead-sources', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { leadSources } = req.body;
    
    if (!Array.isArray(leadSources)) {
      return res.status(400).json({ error: 'leadSources must be an array' });
    }
    
    const agent = await Agent.findByPk(id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    
    // Update lead sources
    await AgentLeadSource.destroy({ where: { agentId: id } });
    await Promise.all(
      leadSources.map(source => 
        AgentLeadSource.create({ agentId: id, source })
      )
    );
    
    res.json({ message: 'Lead sources updated successfully' });
  } catch (error) {
    console.error('Error updating lead sources:', error);
    res.status(500).json({ error: error.message || 'Server error' });
  }
});

export default router; 