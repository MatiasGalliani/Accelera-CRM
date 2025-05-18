import { Lead, Agent } from './models/leads-index.js';
import sequelize from './config/database.js';

/**
 * Función para verificar los leads creados en la base de datos
 */
async function checkLeads() {
  try {
    console.log('Consultando los leads en la base de datos...');
    
    // Obtener todos los leads con información del agente asignado
    const leads = await Lead.findAll({
      include: [
        { model: Agent, as: 'assignedAgent' }
      ],
      order: [['id', 'ASC']]
    });
    
    console.log(`\nSe encontraron ${leads.length} leads en la base de datos:`);
    
    // Mostrar información detallada de cada lead
    leads.forEach(lead => {
      console.log(`\n--- Lead ID: ${lead.id} ---`);
      console.log(`Fuente: ${lead.source}`);
      console.log(`Nombre: ${lead.firstName} ${lead.lastName}`);
      console.log(`Email: ${lead.email}`);
      console.log(`Estado: ${lead.status}`);
      console.log(`Fecha de creación: ${lead.createdAt}`);
      
      if (lead.assignedAgent) {
        console.log(`Asignado a: ${lead.assignedAgent.firstName} ${lead.assignedAgent.lastName} (ID: ${lead.assignedAgent.id}, Email: ${lead.assignedAgent.email})`);
      } else {
        console.log('No asignado a ningún agente');
      }
    });
    
    console.log('\nConsulta completada.');
  } catch (error) {
    console.error('Error al consultar leads:', error);
  } finally {
    // Cerrar la conexión a la base de datos
    await sequelize.close();
  }
}

// Ejecutar la consulta
checkLeads().catch(console.error); 