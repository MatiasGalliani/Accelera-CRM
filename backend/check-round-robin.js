import sequelize from './config/database.js';
import { Agent, AgentLeadSource } from './models/leads-index.js';

/**
 * Verificar la configuración de round robin para todas las fuentes
 */
async function checkRoundRobin() {
  try {
    console.log('Verificando configuración de round robin por fuente...');
    
    // Array de fuentes a verificar
    const sources = ['aiquinto', 'aimedici', 'aifidi'];
    
    // Explicación del sistema round robin
    console.log('\n=== SISTEMA ROUND ROBIN ===');
    console.log('El sistema round robin asigna leads automáticamente a los agentes');
    console.log('Solo agentes activos NO administradores con acceso a la fuente específica');
    console.log('pueden recibir leads a través del round robin.\n');
    
    // Verificar agentes disponibles para cada fuente
    for (const source of sources) {
      console.log(`\n--- ${source.toUpperCase()} ---`);
      
      // Usando ORM para esta consulta específica
      const agentsInRoundRobin = await AgentLeadSource.findAll({
        where: { source },
        include: [{ 
          model: Agent, 
          where: { 
            isActive: true,
            role: 'agent'
          }
        }]
      });
      
      console.log(`Total agentes en round robin: ${agentsInRoundRobin.length}`);
      
      if (agentsInRoundRobin.length > 0) {
        console.log('\nAgentes en el round robin:');
        agentsInRoundRobin.forEach((agentSource, index) => {
          console.log(`${index + 1}. ${agentSource.Agent.firstName} ${agentSource.Agent.lastName} (${agentSource.Agent.email})`);
        });
        
        // Advertencia si solo hay un agente
        if (agentsInRoundRobin.length === 1) {
          console.log('\n⚠️ ADVERTENCIA: Solo hay un agente en este round robin.');
          console.log('   Todos los leads irán a este agente.');
        }
      } else {
        console.log('❌ No hay agentes en el round robin para esta fuente.');
        console.log('   Los leads no podrán ser asignados automáticamente.');
      }
      
      // Verificar si hay administradores con esta fuente (no deberían estar)
      const [adminResults] = await sequelize.query(
        `SELECT a.id, a.first_name, a.last_name, a.email 
         FROM agents a
         JOIN agent_lead_sources als ON a.id = als.agent_id
         WHERE als.source = :source
         AND a.role = 'admin'`,
        {
          replacements: { source }
        }
      );
      
      if (adminResults.length > 0) {
        console.log('\n❌ ERROR: Hay administradores con acceso a esta fuente:');
        adminResults.forEach((admin, index) => {
          console.log(`${index + 1}. ${admin.first_name} ${admin.last_name} (${admin.email})`);
        });
        console.log('   Los administradores no deben estar en el round robin.');
      }
    }
    
    // Verificar agentes inactivos con fuentes asignadas
    const [inactiveWithSources] = await sequelize.query(
      `SELECT a.id, a.first_name, a.last_name, a.email, als.source
       FROM agents a
       JOIN agent_lead_sources als ON a.id = als.agent_id
       WHERE a.is_active = false`
    );
    
    if (inactiveWithSources.length > 0) {
      console.log('\n⚠️ ADVERTENCIA: Hay agentes inactivos con fuentes asignadas:');
      inactiveWithSources.forEach((agent, index) => {
        console.log(`${index + 1}. ${agent.first_name} ${agent.last_name} (${agent.email}) - ${agent.source}`);
      });
      console.log('   Estos agentes no recibirán leads a pesar de tener fuentes asignadas.');
    }
    
    // Resumen final
    console.log('\n=== RESUMEN FINAL ===');
    console.log('Agentes activos en round robin por fuente:');
    
    const counts = {};
    for (const source of sources) {
      const count = await AgentLeadSource.count({
        where: { source },
        include: [{ 
          model: Agent, 
          where: { 
            isActive: true,
            role: 'agent'
          }
        }]
      });
      
      counts[source] = count;
    }
    
    console.log(`AIQUINTO: ${counts.aiquinto} agentes`);
    console.log(`AIMEDICI: ${counts.aimedici} agentes`);
    console.log(`AIFIDI: ${counts.aifidi} agentes`);
    
  } catch (error) {
    console.error('Error verificando round robin:', error);
  } finally {
    // Cerrar la conexión a la base de datos
    await sequelize.close();
  }
}

// Ejecutar la función
checkRoundRobin().catch(console.error); 