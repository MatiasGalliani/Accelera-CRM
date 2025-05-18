import { getAgentByRoundRobin } from './services/roundRobinService.js';
import { Lead, LeadDetail, LeadStatusHistory } from './models/leads-index.js';
import sequelize from './config/database.js';

/**
 * Función para probar la asignación de leads mediante round robin
 */
async function testRoundRobin() {
  try {
    console.log('Iniciando prueba de asignación de leads por round robin...');
    
    // Probar la asignación para diferentes fuentes
    const sources = ['aiquinto', 'aimedici', 'aifidi'];
    
    for (const source of sources) {
      console.log(`\n=== Probando asignación para fuente: ${source} ===`);
      
      try {
        // Obtener agente usando round robin
        const agent = await getAgentByRoundRobin(source);
        console.log(`Agente seleccionado: ID=${agent.id}, Nombre=${agent.firstName} ${agent.lastName}, Email=${agent.email}`);
        
        // Crear lead de prueba
        const transaction = await sequelize.transaction();
        
        try {
          // Crear el lead básico con el agente asignado
          const lead = await Lead.create({
            source,
            firstName: 'Test',
            lastName: 'User',
            email: `test-${Date.now()}@example.com`,
            phone: '123456789',
            message: `Lead de prueba para ${source}`,
            status: 'new',
            assignedAgentId: agent.id
          }, { transaction });
          
          console.log(`Lead creado: ID=${lead.id}, Email=${lead.email}, Asignado a agente ID=${agent.id}`);
          
          // Registrar en el historial de estados
          await LeadStatusHistory.create(
            {
              leadId: lead.id,
              agentId: agent.id,
              oldStatus: null,
              newStatus: 'new',
              notes: 'Lead de prueba creado por script round robin'
            },
            { transaction }
          );
          
          // Confirmar la transacción
          await transaction.commit();
          console.log('Lead guardado correctamente en la base de datos');
          
          // Obtener otro agente para verificar que el índice avanza
          const nextAgent = await getAgentByRoundRobin(source);
          console.log(`Próximo agente que recibirá un lead: ID=${nextAgent.id}, Nombre=${nextAgent.firstName} ${nextAgent.lastName}, Email=${nextAgent.email}`);
          
          if (nextAgent.id !== agent.id) {
            console.log('✅ El índice de round robin avanzó correctamente al siguiente agente');
          } else {
            console.log('⚠️ El mismo agente fue seleccionado de nuevo (probablemente solo hay un agente para esta fuente)');
          }
        } catch (error) {
          // Revertir la transacción en caso de error
          await transaction.rollback();
          console.error(`Error en la transacción para ${source}:`, error);
        }
      } catch (error) {
        console.error(`Error al probar round robin para ${source}:`, error.message);
      }
    }
    
    console.log('\n=== Prueba de round robin completada ===');
    
  } catch (error) {
    console.error('Error general en la prueba:', error);
  } finally {
    // Cerrar la conexión a la base de datos
    await sequelize.close();
  }
}

// Ejecutar la prueba
testRoundRobin().catch(console.error); 