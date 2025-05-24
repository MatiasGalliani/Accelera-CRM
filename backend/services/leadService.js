import { Lead, LeadDetail, LeadNote, LeadStatusHistory, Agent, AgentLeadSource } from '../models/leads-index.js';
import sequelize from '../config/database.js';
import { Op } from 'sequelize';
import roundRobinService from './roundRobinService.js';

/**
 * Crea un nuevo lead y lo asigna a un agente disponible
 * @param {Object} leadData - Datos del lead
 * @returns {Promise<Object>} - El lead creado
 */
export async function createLead(leadData) {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Creando nuevo lead:', leadData.source);
    
    // Validar datos mínimos
    if (!leadData.source || !leadData.email) {
      throw new Error('Datos de lead incompletos');
    }
    
    // Si se proporcionó un agentId específico, lo usamos
    // Si no, obtenemos uno usando el round robin
    let assignedAgentId = leadData.agentId;
    
    if (!assignedAgentId) {
      // Obtener un agente usando el sistema round robin
      const agent = await roundRobinService.getAgentByRoundRobin(leadData.source, transaction);
      
      // Check if agent is valid or unassigned
      if (agent.unassigned) {
        console.log(`No hay agentes disponibles para la fuente ${leadData.source} - creando lead sin asignar`);
        assignedAgentId = null; // Set to null to indicate unassigned
      } else {
        assignedAgentId = agent.id;
      }
    }
    
    // Crear el lead básico con el agente asignado (o null si no hay agentes)
    const lead = await Lead.create({
      source: leadData.source,
      firstName: leadData.firstName || '',
      lastName: leadData.lastName || '',
      email: leadData.email,
      phone: leadData.phone || '',
      message: leadData.message || '',
      status: 'new',
      assignedAgentId  // Will be null if unassigned
    }, { transaction });
    
    // Crear detalles específicos según la fuente
    if (leadData.source === 'aiquinto') {
      await LeadDetail.create({
        leadId: lead.id,
        requestedAmount: leadData.importoRichiesto || null,
        netSalary: leadData.stipendioNetto || null,  // This will store pensioneNetta for pensioners
        employeeType: leadData.tipologiaDipendente || null,
        contractType: leadData.tipoContratto || null,
        employmentSubtype: leadData.sottotipo || null,
        residenceProvince: leadData.provinciaResidenza || null,
        employmentDate: leadData.employmentDate || null,
        numEmployees: leadData.numEmployees || null,
        birthDate: leadData.birthDate || null,
        entePensionistico: leadData.entePensionistico || null,
        pensionType: leadData.pensionType || null,
        financingPurpose: leadData.scopoRichiesta || null,
        residenceCity: leadData.cittaResidenza || null
      }, { transaction });
    } else if (leadData.source === 'aimedici') {
      await LeadDetail.create({
        leadId: lead.id,
        requestedAmount: leadData.importoRichiesto || null,
        financingPurpose: leadData.scopoRichiesta || null,
        residenceCity: leadData.cittaResidenza || null,
        residenceProvince: leadData.provinciaResidenza || null,
        netSalary: leadData.stipendioNetto || null,
        pensioneNettaMensile: leadData.pensioneNettaMensile || null,
        residenceCity: leadData.cittaResidenza || null,
        residenceProvince: leadData.provinciaResidenza || null
      }, { transaction });
    } else if (leadData.source === 'aifidi') {
      await LeadDetail.create({
        leadId: lead.id,
        companyName: leadData.nomeAzienda || null,
        legalCity: leadData.cittaSedeLegale || null,
        operationalCity: leadData.cittaSedeOperativa || null,
        financingPurpose: leadData.scopoFinanziamento || null,
        requestedAmount: leadData.importoRichiesto || null
      }, { transaction });
    }
    
    // Registrar en el historial de estados
    await LeadStatusHistory.create(
      {
        leadId: lead.id,
        agentId: assignedAgentId,
        oldStatus: null,
        newStatus: 'new',
        notes: assignedAgentId 
          ? 'Lead creado y asignado por sistema round robin' 
          : 'Lead creado sin asignación - no hay agentes disponibles para esta fuente'
      },
      { transaction }
    );
    
    // Confirmar la transacción
    await transaction.commit();
    
    // Cargar el lead completo con sus detalles
    const completeLead = await Lead.findByPk(lead.id, {
      include: [
        { model: LeadDetail, as: 'details' },
        { model: Agent, as: 'assignedAgent' }
      ]
    });
    
    return completeLead;
  } catch (error) {
    // Revertir la transacción en caso de error
    await transaction.rollback();
    console.error('Error al crear lead:', error);
    throw error;
  }
}

/**
 * Asigna un lead a un agente disponible
 * @param {number} leadId - ID del lead
 * @param {string} source - Fuente del lead
 * @param {Transaction} [transaction] - Transacción activa (opcional)
 * @returns {Promise<Object>} - Resultado de la asignación
 */
export async function assignLeadToAgent(leadId, source, transaction) {
  const t = transaction || await sequelize.transaction();
  
  try {
    console.log(`Asignando lead ${leadId} de fuente ${source} a un agente disponible`);
    
    // Obtener agentes disponibles para esta fuente
    const availableAgents = await AgentLeadSource.findAll({
      where: { source },
      include: [
        { 
          model: Agent, 
          required: true,
          where: {
            isActive: true, // Only active agents
            role: 'agent'   // IMPORTANT: Exclude admins from assignment
          } 
        }
      ],
      transaction: t
    });
    
    if (availableAgents.length === 0) {
      console.log(`No hay agentes disponibles para la fuente ${source}`);
      
      // Instead of just returning, update the lead to be unassigned
      await Lead.update(
        { assignedAgentId: null },
        { 
          where: { id: leadId },
          transaction: t
        }
      );
      
      // Add history record indicating lead is unassigned
      await LeadStatusHistory.create(
        {
          leadId,
          agentId: null,
          oldStatus: null,
          newStatus: 'new',
          notes: 'Lead sin asignación - no hay agentes disponibles para esta fuente'
        },
        { transaction: t }
      );
      
      if (!transaction) await t.commit();
      return { 
        success: true, 
        unassigned: true,
        reason: 'NO_AGENTS_AVAILABLE', 
        leadId 
      };
    }
    
    // Contar leads activos para cada agente
    const agentsWithLeadCount = await Promise.all(
      availableAgents.map(async (agentSource) => {
        const count = await Lead.count({
          where: {
            assignedAgentId: agentSource.Agent.id,
            status: 'new'
          },
          transaction: t
        });
        
        return {
          agentId: agentSource.Agent.id,
          activeLeads: count
        };
      })
    );
    
    // Ordenar por cantidad de leads activos (menos a más)
    agentsWithLeadCount.sort((a, b) => a.activeLeads - b.activeLeads);
    
    // Seleccionar al agente con menos leads activos
    const selectedAgent = agentsWithLeadCount[0];
    
    // Asignar el lead al agente seleccionado
    await Lead.update(
      { assignedAgentId: selectedAgent.agentId },
      { 
        where: { id: leadId },
        transaction: t
      }
    );
    
    // Registrar en el historial de estados
    await LeadStatusHistory.create(
      {
        leadId,
        agentId: selectedAgent.agentId,
        oldStatus: null,
        newStatus: 'new'
      },
      { transaction: t }
    );
    
    // Confirmar la transacción si no se proporcionó una externa
    if (!transaction) {
      await t.commit();
    }
    
    return {
      success: true,
      agentId: selectedAgent.agentId,
      leadId
    };
  } catch (error) {
    // Revertir la transacción en caso de error si no se proporcionó una externa
    if (!transaction) {
      await t.rollback();
    }
    console.error('Error al asignar lead:', error);
    throw error;
  }
}

/**
 * Obtiene los leads asignados a un agente
 * @param {string} firebaseUid - UID del agente en Firebase
 * @param {string} [source] - Filtrar por fuente (opcional)
 * @returns {Promise<Array>} - Lista de leads
 */
export async function getAgentLeads(firebaseUid, source) {
  try {
    console.log(`Obteniendo leads para el agente ${firebaseUid}`);
    
    // Obtener el ID del agente en PostgreSQL
    const agent = await Agent.findOne({
      where: { firebaseUid }
    });
    
    if (!agent) {
      throw new Error('Agente no encontrado');
    }
    
    // Verificar si el agente tiene permiso para ver leads de esta fuente
    if (source && source !== 'all') {
      const hasPermission = await AgentLeadSource.findOne({
        where: {
          agentId: agent.id,
          source
        }
      });
      
      if (!hasPermission) {
        throw new Error(`No tienes permiso para ver leads de ${source}`);
      }
    }
    
    // Construir el filtro según los parámetros
    const filter = {
      assignedAgentId: agent.id
    };
    
    if (source && source !== 'all') {
      filter.source = source;
    }
    
    // Consultar los leads con sus detalles
    const leads = await Lead.findAll({
      where: filter,
      include: [
        { model: LeadDetail, as: 'details' },
        { 
          model: LeadNote, 
          as: 'notes',
          include: [{ model: Agent }],
          limit: 5,
          order: [['created_at', 'DESC']]}
      ],
      order: [['created_at', 'DESC']]
    });
    
    // Serializar los leads para que sea más fácil usarlos en el frontend
    return serializeLeads(leads);
  } catch (error) {
    console.error('Error al obtener leads del agente:', error);
    throw error;
  }
}

/**
 * Serializa los leads para el frontend, aplanando los detalles
 * @param {Array} leads - Lista de leads con sus detalles
 * @returns {Array} - Lista de leads serializada
 */
function serializeLeads(leads) {
  return leads.map(lead => {
    // Convertir el lead a un objeto plano
    const plainLead = lead.get({ plain: true });
    
    // Si hay detalles, aplanarlos en el objeto principal
    if (plainLead.details) {
      // Mapeo de campos de detalles a sus nombres en el frontend
      const detailFieldMap = {
        'requestedAmount': 'importoRichiesto',
        'netSalary': 'stipendioNetto',
        'employeeType': 'tipologiaDipendente',
        'employmentSubtype': 'sottotipo',
        'contractType': 'tipoContratto',
        'residenceProvince': 'provinciaResidenza',
        'residenceCity': 'cittaResidenza',
        'financingPurpose': 'scopoRichiesta',
        'companyName': 'nomeAzienda',
        'legalCity': 'cittaSedeLegale',
        'operationalCity': 'cittaSedeOperativa',
        'entePensionistico': 'entePensionistico',
        'pensionType': 'tipologiaPensione',
        'birthDate': 'dataNascita',
        'employmentDate': 'meseAnnoAssunzione',
        'numEmployees': 'numeroDipendenti'
      };
      
      // Transferir campos mapeados de detalles al objeto principal
      Object.entries(detailFieldMap).forEach(([dbField, frontendField]) => {
        if (plainLead.details[dbField] !== undefined && plainLead.details[dbField] !== null) {
          plainLead[frontendField] = plainLead.details[dbField];
        }
      });
    }
    
    // Convertir notas a comentarios (si existen)
    if (plainLead.notes && plainLead.notes.length > 0) {
      plainLead.commenti = plainLead.notes[0].note;
    }
    
    // Asegurar que privacyAccettata esté como booleano
    plainLead.privacyAccettata = !!plainLead.privacyAccettata;
    
    return plainLead;
  });
}

/**
 * Obtiene las fuentes de leads permitidas para un agente
 * @param {string} firebaseUid - UID del agente en Firebase
 * @returns {Promise<Array>} - Lista de fuentes permitidas
 */
export async function getAgentAllowedSources(firebaseUid) {
  try {
    console.log(`Obteniendo fuentes permitidas para el agente ${firebaseUid}`);
    
    // Obtener el agente
    const agent = await Agent.findOne({
      where: { firebaseUid },
      include: [
        { model: AgentLeadSource }
      ]
    });
    
    if (!agent) {
      return [];
    }
    
    // Si es admin, devolver todas las fuentes disponibles
    if (agent.role === 'admin') {
      return ['aiquinto', 'aimedici', 'aifidi'];
    }
    
    // Para agentes normales, devolver sus fuentes permitidas
    return agent.AgentLeadSources.map(source => source.source);
  } catch (error) {
    console.error('Error al obtener fuentes permitidas:', error);
    throw error;
  }
}

/**
 * Actualiza el estado de un lead
 * @param {number} leadId - ID del lead
 * @param {string} newStatus - Nuevo estado
 * @param {string} firebaseUid - UID del agente en Firebase
 * @returns {Promise<Object>} - Resultado de la actualización
 */
export async function updateLeadStatus(leadId, newStatus, firebaseUid) {
  const transaction = await sequelize.transaction();
  
  try {
    console.log(`Actualizando estado del lead ${leadId} a ${newStatus}`);
    
    // Obtener el agente
    const agent = await Agent.findOne({
      where: { firebaseUid }
    });
    
    if (!agent) {
      throw new Error('Agente no encontrado');
    }
    
    // Obtener el lead
    const lead = await Lead.findByPk(leadId);
    
    if (!lead) {
      throw new Error('Lead no encontrado');
    }
    
    // Verificar si el lead está asignado a este agente o si es admin
    if (lead.assignedAgentId !== agent.id && agent.role !== 'admin') {
      throw new Error('No tienes permiso para modificar este lead');
    }
    
    // Guardar el estado anterior
    const oldStatus = lead.status;
    
    // Actualizar el estado
    await lead.update(
      { status: newStatus },
      { transaction }
    );
    
    // Registrar en el historial
    await LeadStatusHistory.create(
      {
        leadId,
        agentId: agent.id,
        oldStatus,
        newStatus
      },
      { transaction }
    );
    
    // Confirmar la transacción
    await transaction.commit();
    
    return {
      success: true,
      leadId,
      oldStatus,
      newStatus
    };
  } catch (error) {
    // Revertir la transacción en caso de error
    await transaction.rollback();
    console.error('Error al actualizar estado del lead:', error);
    throw error;
  }
}

/**
 * Agrega un comentario a un lead
 * @param {number} leadId - ID del lead
 * @param {string} comment - Texto del comentario
 * @param {string} firebaseUid - UID del agente en Firebase
 * @returns {Promise<Object>} - El comentario creado
 */
export async function addLeadComment(leadId, comment, firebaseUid) {
  try {
    console.log(`Agregando comentario al lead ${leadId}`);
    
    // Obtener el agente
    const agent = await Agent.findOne({
      where: { firebaseUid }
    });
    
    if (!agent) {
      throw new Error('Agente no encontrado');
    }
    
    // Obtener el lead
    const lead = await Lead.findByPk(leadId);
    
    if (!lead) {
      throw new Error('Lead no encontrado');
    }
    
    // Verificar si el lead está asignado a este agente o si es admin
    if (lead.assignedAgentId !== agent.id && agent.role !== 'admin') {
      throw new Error('No tienes permiso para comentar en este lead');
    }
    
    // Crear el comentario
    const newComment = await LeadNote.create({
      leadId,
      agentId: agent.id,
      note: comment
    });
    
    // Obtener el comentario con datos del agente
    const commentWithAgent = await LeadNote.findByPk(newComment.id, {
      include: [{ model: Agent }]
    });
    
    return commentWithAgent;
  } catch (error) {
    console.error('Error al agregar comentario:', error);
    throw error;
  }
}

/**
 * Asigna manualmente un lead a un agente específico
 * @param {number} leadId - ID del lead
 * @param {number} agentId - ID del agente al que se asignará
 * @param {string} adminFirebaseUid - UID del administrador que realiza la asignación
 * @returns {Promise<Object>} - Resultado de la asignación
 */
export async function assignLeadToSpecificAgent(leadId, agentId, adminFirebaseUid) {
  const transaction = await sequelize.transaction();
  
  try {
    console.log(`Asignando lead ${leadId} al agente ${agentId} por admin ${adminFirebaseUid}`);
    
    // Verificar que el usuario que hace la asignación sea admin
    const admin = await Agent.findOne({
      where: { firebaseUid: adminFirebaseUid }
    });
    
    if (!admin || admin.role !== 'admin') {
      throw new Error('Solo los administradores pueden asignar leads manualmente');
    }
    
    // Verificar que el lead exista
    const lead = await Lead.findByPk(leadId, { transaction });
    
    if (!lead) {
      throw new Error(`Lead ${leadId} no encontrado`);
    }
    
    // Verificar que el agente exista
    const agent = await Agent.findByPk(agentId, { transaction });
    
    if (!agent) {
      throw new Error(`Agente ${agentId} no encontrado`);
    }
    
    // Verificar que el agente tenga permiso para esta fuente de leads
    const hasSourcePermission = await AgentLeadSource.findOne({
      where: {
        agentId,
        source: lead.source
      },
      transaction
    });
    
    if (!hasSourcePermission) {
      throw new Error(`El agente no tiene permisos para leads de fuente ${lead.source}`);
    }
    
    // Guardar el agente anterior (si había)
    const previousAgentId = lead.assignedAgentId;
    
    // Actualizar la asignación del lead
    await lead.update(
      { assignedAgentId: agentId },
      { transaction }
    );
    
    // Registrar en el historial (usando el status actual, solo cambia el agente)
    await LeadStatusHistory.create(
      {
        leadId,
        agentId: admin.id, // Registramos que el admin hizo el cambio
        oldStatus: lead.status,
        newStatus: lead.status,
        notes: `Reasignado de agente ${previousAgentId || 'ninguno'} a agente ${agentId}`
      },
      { transaction }
    );
    
    // Confirmar la transacción
    await transaction.commit();
    
    return {
      success: true,
      leadId,
      previousAgentId,
      newAgentId: agentId
    };
  } catch (error) {
    // Revertir la transacción en caso de error
    await transaction.rollback();
    console.error('Error al asignar lead a agente específico:', error);
    throw error;
  }
}

/**
 * Get leads for a campaign manager
 * @param {string} firebaseUid - Firebase UID of the campaign manager
 * @param {string} source - Source to filter leads by
 * @returns {Promise<Array>} - Array of leads
 */
export async function getCampaignManagerLeads(firebaseUid, source) {
  try {
    // First get the agent record to verify permissions
    const agent = await Agent.findOne({
      where: { firebaseUid },
      include: [{
        model: AgentLeadSource,
        where: { source },
        required: true
      }]
    });

    if (!agent) {
      throw new Error(`Non hai accesso ai leads della fonte ${source}`);
    }

    // Get all leads for this source
    const leads = await Lead.findAll({
      where: { source },
      include: [
        { 
          model: LeadDetail, 
          as: 'details',
          required: false 
        },
        { 
          model: Agent, 
          as: 'assignedAgent',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false 
        },
        {
          model: LeadNote,
          as: 'notes',
          limit: 50,
          order: [['created_at', 'DESC']],
          required: false
        },
        {
          model: LeadStatusHistory,
          as: 'statusHistory',
          limit: 20,
          order: [['created_at', 'DESC']],
          required: false
        }
      ],
      order: [['created_at', 'DESC']]
    });

    return serializeLeads(leads);
  } catch (error) {
    console.error('Error getting campaign manager leads:', error);
    throw error;
  }
}

export default {
  createLead,
  assignLeadToAgent,
  getAgentLeads,
  getAgentAllowedSources,
  updateLeadStatus,
  addLeadComment,
  assignLeadToSpecificAgent,
  getCampaignManagerLeads
}; 