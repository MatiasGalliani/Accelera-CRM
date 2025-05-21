import express from 'express';
import leadService from '../services/leadService.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { Agent, AgentLeadSource, Lead, LeadDetail, LeadNote, LeadStatusHistory } from '../models/leads-index.js';

const router = express.Router();

/**
 * @route   POST /api/leads/webhook
 * @desc    Recibir lead desde una fuente externa
 * @access  Public (con clave API)
 */
router.post('/webhook', async (req, res) => {
  try {
    // Verificar la autenticación del webhook (token secreto, IP, etc.)
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.WEBHOOK_API_KEY) {
      return res.status(401).json({ error: 'Invalid API key' });
    }
    
    const leadData = req.body;
    
    // Crear el lead
    const lead = await leadService.createLead(leadData);
    
    res.status(201).json({
      success: true,
      leadId: lead.id,
      source: lead.source,
      assignedAgentId: lead.assignedAgentId
    });
  } catch (error) {
    console.error('Error en webhook de leads:', error);
    res.status(500).json({ error: error.message || 'Error del servidor' });
  }
});

/**
 * @route   GET /api/leads/my-leads
 * @desc    Obtener leads asignados al agente actual
 * @access  Private
 */
router.get('/my-leads', authenticate, async (req, res) => {
  try {
    const source = req.query.source || 'all';
    const leads = await leadService.getAgentLeads(req.user.uid, source);
    
    res.json(leads);
  } catch (error) {
    console.error('Error al obtener mis leads:', error);
    
    // Si es un error de permisos, devolver 403
    if (error.message && error.message.includes('No tienes permiso')) {
      return res.status(403).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message || 'Error del servidor' });
  }
});

/**
 * @route   GET /api/leads/allowed-sources
 * @desc    Obtener fuentes de leads permitidas para el agente actual
 * @access  Private
 */
router.get('/allowed-sources', authenticate, async (req, res) => {
  try {
    const sources = await leadService.getAgentAllowedSources(req.user.uid);
    res.json(sources);
  } catch (error) {
    console.error('Error al obtener fuentes permitidas:', error);
    res.status(500).json({ error: error.message || 'Error del servidor' });
  }
});

/**
 * @route   PUT /api/leads/:id/status
 * @desc    Actualizar el estado de un lead
 * @access  Private
 */
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: 'Estado requerido' });
    }
    
    const result = await leadService.updateLeadStatus(id, status, req.user.uid);
    res.json(result);
  } catch (error) {
    console.error('Error al actualizar estado del lead:', error);
    
    // Si es un error de permisos, devolver 403
    if (error.message && error.message.includes('No tienes permiso')) {
      return res.status(403).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message || 'Error del servidor' });
  }
});

/**
 * @route   POST /api/leads/:id/comments
 * @desc    Agregar un comentario a un lead
 * @access  Private
 */
router.post('/:id/comments', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    
    if (!comment) {
      return res.status(400).json({ error: 'Comentario requerido' });
    }
    
    const newComment = await leadService.addLeadComment(id, comment, req.user.uid);
    res.status(201).json(newComment);
  } catch (error) {
    console.error('Error al agregar comentario:', error);
    
    // Si es un error de permisos, devolver 403
    if (error.message && error.message.includes('No tienes permiso')) {
      return res.status(403).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message || 'Error del servidor' });
  }
});

/**
 * @route   GET /api/leads/admin/all
 * @desc    Obtener todos los leads (solo admin)
 * @access  Admin
 */
router.get('/admin/all', authenticate, requireAdmin, async (req, res) => {
  try {
    const source = req.query.source || 'all';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    // Construir filtro según los parámetros
    const filter = {};
    if (source && source !== 'all') {
      filter.source = source;
    }
    
    // Calcular offset para paginación
    const offset = (page - 1) * limit;
    
    // Consultar los leads con paginación
    const { rows: leads, count } = await Lead.findAndCountAll({
      where: filter,
      include: [
        { model: LeadDetail, as: 'details' },
        { model: Agent, as: 'assignedAgent' }
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });
    
    res.json({
      leads,
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Error al obtener todos los leads:', error);
    res.status(500).json({ error: error.message || 'Error del servidor' });
  }
});

/**
 * @route   GET /api/leads/allowed-agents
 * @desc    Obtener agentes autorizados para una fuente específica
 * @access  Public (secured by API key)
 */
router.get('/allowed-agents', async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.WEBHOOK_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { source } = req.query;
    
    if (!source) {
      return res.status(400).json({ error: 'Source parameter is required' });
    }
    
    // Get agents that have access to this lead source
    const agentSources = await AgentLeadSource.findAll({
      where: { source },
      include: [{ model: Agent, required: true }]
    });
    
    // Format the response to include just what's needed
    const agents = agentSources.map(agentSource => ({
      id: agentSource.Agent.id,
      email: agentSource.Agent.email,
      name: `${agentSource.Agent.firstName} ${agentSource.Agent.lastName}`,
      phone: agentSource.Agent.phone || '',
      calendly: agentSource.Agent.calendlyUrl || ''
    }));
    
    res.json(agents);
  } catch (error) {
    console.error('Error al obtener agentes permitidos:', error);
    res.status(500).json({ error: error.message || 'Error del servidor' });
  }
});

/**
 * @route   GET /api/leads/admin/agents-by-source
 * @desc    Obtener agentes por fuente de leads (solo admin)
 * @access  Admin
 */
router.get('/admin/agents-by-source', authenticate, requireAdmin, async (req, res) => {
  try {
    const { source } = req.query;
    
    if (!source) {
      return res.status(400).json({ error: 'Parámetro source requerido' });
    }
    
    // Obtener agentes que tienen acceso a esta fuente de leads
    const agentSources = await AgentLeadSource.findAll({
      where: { source },
      include: [
        { 
          model: Agent, 
          required: true,
          where: { isActive: true }  // Solo agentes activos
        }
      ]
    });
    
    // Formatear la respuesta para incluir solo lo necesario
    const agents = agentSources.map(agentSource => ({
      id: agentSource.Agent.id,
      email: agentSource.Agent.email,
      name: `${agentSource.Agent.firstName} ${agentSource.Agent.lastName}`,
      phone: agentSource.Agent.phone || ''
    }));
    
    res.json(agents);
  } catch (error) {
    console.error('Error al obtener agentes por fuente:', error);
    res.status(500).json({ error: error.message || 'Error del servidor' });
  }
});

/**
 * @route   POST /api/leads/:id/assign
 * @desc    Asignar un lead a un agente específico (solo admin)
 * @access  Admin
 */
router.post('/:id/assign', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { agentId } = req.body;
    
    if (!agentId) {
      return res.status(400).json({ error: 'ID del agente requerido' });
    }
    
    const result = await leadService.assignLeadToSpecificAgent(id, agentId, req.user.uid);
    res.json(result);
  } catch (error) {
    console.error('Error al asignar lead a agente específico:', error);
    
    // Si el error es por permisos o validación, devolver 400
    if (error.message && 
        (error.message.includes('permiso') || 
         error.message.includes('no encontrado') ||
         error.message.includes('no tiene permisos'))) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: error.message || 'Error del servidor' });
  }
});

/**
 * @route   POST /api/leads/test-roundrobin
 * @desc    Crear un lead de prueba y asignarlo automáticamente mediante round robin
 * @access  Admin
 */
router.post('/test-roundrobin', authenticate, requireAdmin, async (req, res) => {
  try {
    const { source, firstName, lastName, email, phone } = req.body;
    
    if (!source || !email) {
      return res.status(400).json({ error: 'Source y email son campos requeridos' });
    }
    
    // Crear datos del lead
    const leadData = {
      source,
      firstName: firstName || 'Test',
      lastName: lastName || 'User',
      email,
      phone: phone || '123456789',
      message: 'Lead de prueba para el sistema round robin'
    };
    
    // Crear el lead (se asignará automáticamente usando round robin)
    const lead = await leadService.createLead(leadData);
    
    // Obtener información del agente asignado
    const agent = lead.assignedAgent ? {
      id: lead.assignedAgent.id,
      name: `${lead.assignedAgent.firstName} ${lead.assignedAgent.lastName}`,
      email: lead.assignedAgent.email
    } : null;
    
    res.status(201).json({
      success: true,
      message: 'Lead creado y asignado exitosamente mediante round robin',
      lead: {
        id: lead.id,
        source: lead.source,
        name: `${lead.firstName} ${lead.lastName}`,
        email: lead.email
      },
      assignedTo: agent
    });
  } catch (error) {
    console.error('Error al crear lead de prueba:', error);
    res.status(500).json({ error: error.message || 'Error del servidor' });
  }
});

/**
 * @route   DELETE /api/leads/:id
 * @desc    Delete a lead
 * @access  Private
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the lead to verify ownership
    const lead = await Lead.findByPk(id);
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead non trovato' });
    }
    
    // Get the agent from database
    const agent = await Agent.findOne({
      where: { firebaseUid: req.user.uid }
    });
    
    if (!agent) {
      return res.status(404).json({ error: 'Agente non trovato' });
    }
    
    // Check if the agent is the owner of the lead or an admin
    if (lead.assignedAgentId !== agent.id && agent.role !== 'admin') {
      return res.status(403).json({ error: 'Non sei autorizzato a eliminare questo lead' });
    }
    
    // Delete any related data first (cascade delete is not always reliable)
    await LeadDetail.destroy({ where: { leadId: id } });
    await LeadNote.destroy({ where: { leadId: id } });
    await LeadStatusHistory.destroy({ where: { leadId: id } });
    
    // Delete the lead
    await lead.destroy();
    
    res.json({ 
      success: true, 
      message: 'Lead eliminato con successo',
      id
    });
  } catch (error) {
    console.error('Error deleting lead:', error);
    res.status(500).json({ error: error.message || 'Errore del server' });
  }
});

/**
 * @route   GET /api/leads/admin-leads
 * @desc    Get all leads with agent information for admin monitoring
 * @access  Admin only
 */
router.get('/admin-leads', authenticate, requireAdmin, async (req, res) => {
  try {
    console.log('Admin leads request received for source:', req.query.source);
    const source = req.query.source || 'all';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    
    // Build filter based on parameters
    const filter = {};
    if (source && source !== 'all') {
      filter.source = source;
    }
    
    console.log('Using filter:', JSON.stringify(filter));
    
    // Calculate offset for pagination
    const offset = (page - 1) * limit;
    
    try {
      // Query leads with pagination and include agent information
      console.log('Executing findAndCountAll query...');
      const { rows: leads, count } = await Lead.findAndCountAll({
        where: filter,
        include: [
          { 
            model: LeadDetail, 
            as: 'details',
            required: false // Make this a LEFT JOIN
          },
          { 
            model: Agent, 
            as: 'assignedAgent',
            attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
            required: false // Make this a LEFT JOIN
          },
          {
            model: LeadNote,
            as: 'notes',
            limit: 100,
            order: [['created_at', 'DESC']],
            required: false // Make this a LEFT JOIN
          },
          {
            model: LeadStatusHistory,
            as: 'statusHistory',
            limit: 20,
            order: [['created_at', 'DESC']],
            required: false // Make this a LEFT JOIN
          }
        ],
        order: [['created_at', 'DESC']],
        limit,
        offset
      });
      
      console.log(`Query successful. Found ${leads.length} leads.`);
      
      // Process leads to include agent name and comments
      const processedLeads = leads.map(lead => {
        try {
          // Get a plain JSON object of the lead (if it's a Sequelize model)
          const plainLead = lead.get ? lead.get({ plain: true }) : lead;
          
          // Add agent name for display
          if (plainLead.assignedAgent) {
            plainLead.agentName = `${plainLead.assignedAgent.firstName || ''} ${plainLead.assignedAgent.lastName || ''}`.trim();
          }
          
          // Merge the latest note/comment into the lead object for display
          if (plainLead.notes && plainLead.notes.length > 0) {
            plainLead.commenti = plainLead.notes[0].note;
            // Also set content field for backward compatibility
            plainLead.notes.forEach(note => {
              note.content = note.note;
            });
          } else {
            plainLead.commenti = '';
          }
          
          // Map lead details fields to frontend format
          if (plainLead.details) {
            // Common mapping for all lead types
            plainLead.details.residenceCity && (plainLead.cittaResidenza = plainLead.details.residenceCity);
            plainLead.details.residenceProvince && (plainLead.provinciaResidenza = plainLead.details.residenceProvince);
            plainLead.details.requestedAmount && (plainLead.importoRichiesto = plainLead.details.requestedAmount);
            plainLead.details.financingPurpose && (plainLead.scopoRichiesta = plainLead.details.financingPurpose);
            
            // Source-specific mappings
            if (plainLead.source === 'aiquinto') {
              plainLead.details.netSalary && (plainLead.stipendioNetto = plainLead.details.netSalary);
              plainLead.details.employeeType && (plainLead.tipologiaDipendente = plainLead.details.employeeType);
              plainLead.details.employmentSubtype && (plainLead.sottotipo = plainLead.details.employmentSubtype);
              plainLead.details.contractType && (plainLead.tipoContratto = plainLead.details.contractType);
            } else if (plainLead.source === 'aifidi') {
              plainLead.details.companyName && (plainLead.nomeAzienda = plainLead.details.companyName);
              plainLead.details.legalCity && (plainLead.cittaSedeLegale = plainLead.details.legalCity);
              plainLead.details.operationalCity && (plainLead.cittaSedeOperativa = plainLead.details.operationalCity);
            }
          }
          
          return plainLead;
        } catch (err) {
          console.error('Error processing lead:', err);
          // Return a minimal lead object if processing fails
          return {
            id: lead.id,
            source: lead.source,
            firstName: lead.firstName || 'Error',
            lastName: lead.lastName || 'Processing',
            email: lead.email || '-',
            status: lead.status || 'unknown',
            createdAt: lead.created_at || lead.createdAt,
            commenti: 'Error processing lead data'
          };
        }
      });
      
      res.json({
        leads: processedLeads,
        total: count,
        page,
        totalPages: Math.ceil(count / limit)
      });
    } catch (dbError) {
      console.error('Database error in admin-leads:', dbError);
      
      // Check for specific database errors
      if (dbError.name === 'SequelizeConnectionError') {
        return res.status(503).json({ 
          error: 'Database connection error', 
          message: 'Unable to connect to the database'
        });
      }
      
      if (dbError.name === 'SequelizeDatabaseError') {
        // Try a simpler query as fallback
        console.log('Attempting simplified fallback query...');
        const simpleLeads = await Lead.findAll({
          where: filter,
          limit,
          offset,
          order: [['createdAt', 'DESC']]
        });
        
        return res.json({
          leads: simpleLeads,
          total: simpleLeads.length,
          page,
          totalPages: 1,
          simplified: true
        });
      }
      
      throw dbError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error('Error retrieving admin leads:', error);
    res.status(500).json({ 
      error: error.message || 'Server error',
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    });
  }
});

/**
 * @route   GET /api/leads/debug-leads
 * @desc    Debug endpoint to get lead data without joins for testing
 * @access  Admin only
 */
router.get('/debug-leads', authenticate, requireAdmin, async (req, res) => {
  try {
    console.log('Debug leads request received');
    
    // Get just the leads table data with no joins
    const leads = await Lead.findAll({
      limit: 10,
      order: [['created_at', 'DESC']]
    });
    
    console.log(`Debug query found ${leads.length} leads`);
    res.json({
      leads,
      debug: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in debug leads endpoint:', error);
    res.status(500).json({ 
      error: error.message || 'Server error',
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    });
  }
});

export default router; 