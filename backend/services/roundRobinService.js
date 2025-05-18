import { Agent, AgentLeadSource } from '../models/leads-index.js';

// Source-specific round robin indexes
const roundRobinIndexes = {
  'aiquinto': 0,
  'aimedici': 0,
  'aifidi': 0
};

/**
 * Obtiene un agente usando el algoritmo Round Robin para una fuente específica
 * @param {string} source - Fuente del lead
 * @param {Object} transaction - Transacción de la base de datos (opcional)
 * @returns {Promise<Object>} - Agente seleccionado o objeto con valor "unassigned"
 */
export async function getAgentByRoundRobin(source, transaction) {
  try {
    // Obtener agentes disponibles para esta fuente - EXCLUDE ADMINS
    const availableAgents = await AgentLeadSource.findAll({
      where: { source },
      include: [
        { 
          model: Agent, 
          required: true,
          where: { 
            isActive: true, // Solo agentes activos
            role: 'agent' // IMPORTANT: Exclude admins from round-robin
          }
        }
      ],
      transaction
    });
    
    // If no agents available, return special unassigned object
    if (!availableAgents || availableAgents.length === 0) {
      console.log(`No hay agentes disponibles para la fuente ${source} - marcando como no asignado`);
      return { 
        id: null, 
        email: 'unassigned@system.local',
        unassigned: true 
      };
    }
    
    // Obtener el índice actual para esta fuente
    const currentIndex = roundRobinIndexes[source] || 0;
    
    // Ensure index is within bounds (in case agents were removed)
    if (currentIndex >= availableAgents.length) {
      roundRobinIndexes[source] = 0;
    }
    
    // Obtener el agente en el índice actual
    const agentSource = availableAgents[roundRobinIndexes[source]];
    const agent = agentSource.Agent;
    
    // Actualizar índice para la próxima solicitud
    roundRobinIndexes[source] = (roundRobinIndexes[source] + 1) % availableAgents.length;
    console.log(`Agente seleccionado para ${source}: ${agent.email} (ID: ${agent.id})`);
    console.log(`Nuevo índice round-robin para ${source}: ${roundRobinIndexes[source]}`);
    
    return agent;
  } catch (error) {
    console.error(`Error al obtener agente por round robin para fuente ${source}:`, error);
    // Return unassigned in case of error instead of throwing
    return { 
      id: null, 
      email: 'unassigned@system.local',
      unassigned: true 
    };
  }
}

export default {
  getAgentByRoundRobin
}; 