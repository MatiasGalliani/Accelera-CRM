import { Lead, LeadDetail, LeadStatusHistory } from './models/leads-index.js';
import sequelize from './config/database.js';

/**
 * Función para crear un lead de prueba asignado a un agente específico
 * @param {number} agentId - ID del agente en la base de datos
 */
async function createTestLead(agentId) {
  const transaction = await sequelize.transaction();
  
  try {
    console.log(`Creando lead de prueba para el agente con ID: ${agentId}`);
    
    // Crear el lead básico
    const lead = await Lead.create({
      source: 'aiquinto',
      firstName: 'Cliente',
      lastName: 'Prueba Manual',
      email: `cliente-prueba-${Date.now()}@example.com`,
      phone: '987654321',
      message: 'Lead de prueba creado manualmente',
      status: 'new',
      assignedAgentId: agentId
    }, { transaction });
    
    console.log(`Lead creado con ID: ${lead.id}`);
    
    // Crear detalles específicos para aiquinto
    await LeadDetail.create({
      leadId: lead.id,
      requestedAmount: '25000',
      netSalary: '2000',
      employeeType: 'Privato',
      contractType: 'Tempo indeterminato',
      employmentSubtype: 'Dipendente',
      residenceProvince: 'Milano'
    }, { transaction });
    
    console.log('Detalles del lead creados');
    
    // Registrar en el historial de estados
    await LeadStatusHistory.create({
      leadId: lead.id,
      agentId: agentId,
      oldStatus: null,
      newStatus: 'new',
      notes: 'Lead creado manualmente mediante script de prueba'
    }, { transaction });
    
    console.log('Historial de estados registrado');
    
    // Confirmar la transacción
    await transaction.commit();
    
    console.log('\n✅ Lead creado exitosamente:');
    console.log(`ID: ${lead.id}`);
    console.log(`Fuente: ${lead.source}`);
    console.log(`Nombre: ${lead.firstName} ${lead.lastName}`);
    console.log(`Email: ${lead.email}`);
    console.log(`Asignado a agente ID: ${agentId}`);
    
    return lead;
  } catch (error) {
    // Revertir la transacción en caso de error
    await transaction.rollback();
    console.error('Error al crear lead de prueba:', error);
    throw error;
  } finally {
    // Cerrar la conexión si no se está usando una transacción externa
    if (!transaction) {
      await sequelize.close();
    }
  }
}

// ID del agente al que asignar el lead (Matias Nahuel Galliani)
const agentId = 3;

// Ejecutar la creación del lead
createTestLead(agentId)
  .then(() => {
    console.log('\nProceso completado. Ahora el agente debería poder ver este lead en "my-leads".');
    sequelize.close();
  })
  .catch(error => {
    console.error('Error general:', error);
    sequelize.close();
  }); 