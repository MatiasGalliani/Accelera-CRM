import { Agent, AgentLeadSource } from './models/leads-index.js';
import sequelize from './config/database.js';

/**
 * Función para verificar la información de un agente específico
 * @param {string} email - Email del agente a buscar
 */
async function checkAgent(email) {
  try {
    console.log(`Buscando agente con email: ${email}`);
    
    // Buscar al agente por email
    const agent = await Agent.findOne({
      where: { email },
      include: [{ model: AgentLeadSource }]
    });
    
    if (!agent) {
      console.log(`\n❌ No se encontró ningún agente con el email: ${email}`);
      return;
    }
    
    console.log('\n✅ Agente encontrado:');
    console.log(`ID: ${agent.id}`);
    console.log(`Firebase UID: ${agent.firebaseUid}`);
    console.log(`Nombre: ${agent.firstName} ${agent.lastName}`);
    console.log(`Email: ${agent.email}`);
    console.log(`Rol: ${agent.role}`);
    console.log(`Activo: ${agent.isActive ? 'Sí' : 'No'}`);
    
    if (agent.AgentLeadSources && agent.AgentLeadSources.length > 0) {
      console.log('\nFuentes de leads asignadas:');
      agent.AgentLeadSources.forEach(source => {
        console.log(`- ${source.source}`);
      });
    } else {
      console.log('\n❌ El agente no tiene fuentes de leads asignadas');
    }
  } catch (error) {
    console.error('Error al verificar agente:', error);
  } finally {
    // Cerrar la conexión a la base de datos
    await sequelize.close();
  }
}

// Email del agente a verificar
const agentEmail = 'matiasgalliani00@gmail.com';

// Ejecutar la verificación
checkAgent(agentEmail).catch(console.error); 