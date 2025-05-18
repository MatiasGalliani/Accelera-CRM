import { Lead, Agent, AgentLeadSource } from './models/leads-index.js';
import sequelize from './config/database.js';

/**
 * Función para depurar la obtención de fuentes permitidas
 * @param {string} firebaseUid - UID de Firebase del agente
 */
async function debugAllowedSources(firebaseUid) {
  try {
    console.log(`\n=== Depurando getAgentAllowedSources para UID: ${firebaseUid} ===`);
    
    // Obtener el agente
    console.log('Buscando agente...');
    const agent = await Agent.findOne({
      where: { firebaseUid },
      include: [{ model: AgentLeadSource }]
    });
    
    if (!agent) {
      console.log(`❌ No se encontró ningún agente con firebaseUid: ${firebaseUid}`);
      return;
    }
    
    console.log(`✅ Agente encontrado: ${agent.firstName} ${agent.lastName} (${agent.email})`);
    
    // Verificar si es admin
    console.log(`Rol del agente: ${agent.role}`);
    if (agent.role === 'admin') {
      console.log('El agente es admin, debería tener acceso a todas las fuentes: aiquinto, aimedici, aifidi');
    }
    
    // Verificar fuentes asignadas
    if (agent.AgentLeadSources && agent.AgentLeadSources.length > 0) {
      console.log('Fuentes de leads asignadas:');
      agent.AgentLeadSources.forEach(source => {
        console.log(`- ${source.source}`);
      });
    } else {
      console.log('❌ El agente no tiene fuentes de leads asignadas');
    }
  } catch (error) {
    console.error('Error al depurar fuentes permitidas:', error);
  }
}

/**
 * Función para depurar la obtención de leads del agente
 * @param {string} firebaseUid - UID de Firebase del agente
 * @param {string} source - Fuente de leads a consultar
 */
async function debugAgentLeads(firebaseUid, source) {
  try {
    console.log(`\n=== Depurando getAgentLeads para UID: ${firebaseUid}, Fuente: ${source} ===`);
    
    // Obtener el agente
    console.log('Buscando agente...');
    const agent = await Agent.findOne({
      where: { firebaseUid }
    });
    
    if (!agent) {
      console.log(`❌ No se encontró ningún agente con firebaseUid: ${firebaseUid}`);
      return;
    }
    
    console.log(`✅ Agente encontrado: ${agent.firstName} ${agent.lastName} (${agent.email}), ID: ${agent.id}`);
    
    // Verificar si el agente tiene permiso para ver leads de esta fuente
    if (source && source !== 'all') {
      console.log(`Verificando permisos para fuente: ${source}`);
      const hasPermission = await AgentLeadSource.findOne({
        where: {
          agentId: agent.id,
          source
        }
      });
      
      if (!hasPermission) {
        console.log(`❌ El agente no tiene permiso para ver leads de ${source}`);
        return;
      }
      
      console.log(`✅ El agente tiene permiso para ver leads de ${source}`);
    }
    
    // Construir el filtro según los parámetros
    const filter = {
      assignedAgentId: agent.id
    };
    
    if (source && source !== 'all') {
      filter.source = source;
    }
    
    console.log('Filtro de búsqueda:', filter);
    
    // Contar cuántos leads hay asignados a este agente
    const leadCount = await Lead.count({
      where: filter
    });
    
    console.log(`Se encontraron ${leadCount} leads asignados al agente`);
    
    // Si hay leads, mostrar información básica
    if (leadCount > 0) {
      const leads = await Lead.findAll({
        where: filter,
        limit: 5,
        order: [['createdAt', 'DESC']]
      });
      
      console.log('Últimos leads asignados:');
      leads.forEach(lead => {
        console.log(`- ID: ${lead.id}, Fuente: ${lead.source}, Nombre: ${lead.firstName} ${lead.lastName}, Email: ${lead.email}`);
      });
    }
  } catch (error) {
    console.error('Error al depurar leads del agente:', error);
  }
}

/**
 * Función principal para ejecutar todas las depuraciones
 */
async function runDebug() {
  try {
    const firebaseUid = 'EcQ4EBGqBEfRk3kF9dILFq6D4dv2'; // UID del agente a depurar
    
    // Depurar obtención de fuentes permitidas
    await debugAllowedSources(firebaseUid);
    
    // Depurar obtención de leads para cada fuente
    await debugAgentLeads(firebaseUid, 'aiquinto');
    await debugAgentLeads(firebaseUid, 'aimedici');
    await debugAgentLeads(firebaseUid, 'aifidi');
    
    console.log('\n=== Depuración completada ===');
  } catch (error) {
    console.error('Error general durante la depuración:', error);
  } finally {
    // Cerrar la conexión a la base de datos
    await sequelize.close();
  }
}

// Ejecutar la depuración
runDebug().catch(console.error); 