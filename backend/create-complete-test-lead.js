import { Lead, LeadDetail, LeadStatusHistory, Agent } from './models/leads-index.js';
import sequelize from './config/database.js';

/**
 * Función para crear un lead de prueba completo para aiquinto
 */
async function createCompleteLead() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Buscando agente "Matias Nahuel Galliani"...');
    
    // Buscar el ID del agente por email
    const agent = await Agent.findOne({
      where: { 
        email: 'matiasgalliani00@gmail.com' 
      }
    });
    
    if (!agent) {
      throw new Error('Agente no encontrado. Asegúrate de que exista un agente con ese email.');
    }
    
    console.log(`Agente encontrado! ID: ${agent.id}, Nombre: ${agent.firstName} ${agent.lastName}`);
    
    // Fecha actual para datos únicos
    const now = new Date();
    const timestamp = now.getTime();
    const formattedDate = now.toISOString().split('T')[0];
    
    // Crear el lead básico con todos los campos
    const lead = await Lead.create({
      source: 'aiquinto',
      firstName: 'Roberto',
      lastName: 'Bianchi',
      email: `test-${timestamp}@example.com`,
      phone: '389776543',
      message: 'Cerco un prestito per acquistare una macchina nuova',
      status: 'new',
      assignedAgentId: agent.id,
      privacyAccepted: true
    }, { transaction });
    
    console.log(`Lead básico creado con ID: ${lead.id}`);
    
    // Crear detalles específicos para aiquinto con todos los campos completos
    await LeadDetail.create({
      leadId: lead.id,
      requestedAmount: 30000,
      netSalary: 2800,
      employeeType: 'Pubblico',
      contractType: 'Tempo Indeterminato',
      employmentSubtype: 'Dipendente',
      residenceProvince: 'Roma',
      birthDate: '1975-06-15'
    }, { transaction });
    
    console.log('Detalles del lead creados');
    
    // Registrar en el historial de estados
    await LeadStatusHistory.create({
      leadId: lead.id,
      agentId: agent.id,
      oldStatus: null,
      newStatus: 'new',
      notes: 'Lead de prueba completo creado manualmente'
    }, { transaction });
    
    console.log('Historial de estados registrado');
    
    // Confirmar la transacción
    await transaction.commit();
    
    console.log('\n✅ Lead creado exitosamente:');
    console.log(`ID: ${lead.id}`);
    console.log(`Fuente: aiquinto`);
    console.log(`Nombre: Roberto Bianchi`);
    console.log(`Email: test-${timestamp}@example.com`);
    console.log(`Teléfono: 389776543`);
    console.log(`Importe solicitado: 30000€`);
    console.log(`Salario neto: 2800€`);
    console.log(`Tipología: Pubblico`);
    console.log(`Subtipo: Dipendente`);
    console.log(`Tipo de contrato: Tempo Indeterminato`);
    console.log(`Provincia: Roma`);
    console.log(`Asignado a: ${agent.firstName} ${agent.lastName}`);
    console.log(`Privacidad aceptada: Sí`);
    console.log(`Estado: Nuevo`);
    
    return lead;
  } catch (error) {
    // Revertir la transacción en caso de error
    await transaction.rollback();
    console.error('Error al crear lead de prueba:', error);
    throw error;
  }
}

// Ejecutar la creación del lead
createCompleteLead()
  .then(() => {
    console.log('\n✅ Proceso completado. El agente debería poder ver este lead en "my-leads".');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error general:', error);
    process.exit(1);
  }); 