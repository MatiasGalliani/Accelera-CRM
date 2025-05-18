import sequelize from './config/database.js';

/**
 * Añadir aimedici a agentedos@creditplan.it e investigar la sincronización
 */
async function fixAgenteDos() {
  try {
    console.log('Añadiendo fuente aimedici al agente agentedos@creditplan.it...');
    
    // 1. Buscar el agente por email
    const [agentInfo] = await sequelize.query(
      `SELECT id, first_name, last_name, email, role, firebase_uid 
       FROM agents 
       WHERE email = :email`,
      {
        replacements: { email: 'agentedos@creditplan.it' }
      }
    );
    
    if (!agentInfo || agentInfo.length === 0) {
      console.log('❌ ERROR: Agente agentedos@creditplan.it no encontrado en la base de datos');
      return;
    }
    
    const agent = agentInfo[0];
    console.log(`\nAgente encontrado: ${agent.first_name} ${agent.last_name} (ID: ${agent.id})`);
    console.log(`Firebase UID: ${agent.firebase_uid}`);
    
    // 2. Verificar fuentes actuales
    const [currentSources] = await sequelize.query(
      `SELECT id, source, created_at
       FROM agent_lead_sources 
       WHERE agent_id = :agentId`,
      {
        replacements: { agentId: agent.id }
      }
    );
    
    console.log('\nFuentes actuales:');
    currentSources.forEach((src, idx) => {
      console.log(`${idx + 1}. ${src.source} (ID: ${src.id}, Creado: ${src.created_at})`);
    });
    
    // 3. Verificar si ya tiene aimedici
    const hasAimedici = currentSources.some(src => src.source === 'aimedici');
    
    if (hasAimedici) {
      console.log('\n⚠️ Este agente YA tiene la fuente aimedici asignada en la base de datos.');
      console.log('   Posible error de sincronización entre la interfaz y la base de datos.');
    } else {
      // 4. Añadir aimedici
      console.log('\nAñadiendo fuente aimedici...');
      const [result] = await sequelize.query(
        `INSERT INTO agent_lead_sources (agent_id, source, created_at)
         VALUES (:agentId, 'aimedici', NOW())
         RETURNING id`,
        {
          replacements: { agentId: agent.id }
        }
      );
      
      if (result && result.length > 0) {
        console.log(`✅ Fuente aimedici añadida correctamente con ID: ${result[0].id}`);
      } else {
        console.log('❌ Error al añadir la fuente aimedici');
      }
    }
    
    // 5. Verificar el registro en Firestore (si es posible)
    console.log('\n⚠️ NOTA IMPORTANTE SOBRE SINCRONIZACIÓN:');
    console.log('Si añadiste el agente a aimedici desde el panel de administración,');
    console.log('es posible que el cambio solo se haya guardado en Firestore y no en PostgreSQL.');
    console.log('El sistema debería tener un listener que sincronice cambios de Firestore a PostgreSQL.');
    console.log('Revisa los archivos de configuración, especialmente:');
    console.log('- server.js: busca listeners/cambios de Firestore');
    console.log('- services/syncService.js: verifica la sincronización de fuentes de leads');
    
    // 6. Vuelve a verificar las fuentes después de la adición
    const [updatedSources] = await sequelize.query(
      `SELECT id, source, created_at
       FROM agent_lead_sources 
       WHERE agent_id = :agentId
       ORDER BY source`,
      {
        replacements: { agentId: agent.id }
      }
    );
    
    console.log('\nFuentes actualizadas:');
    updatedSources.forEach((src, idx) => {
      console.log(`${idx + 1}. ${src.source} (ID: ${src.id}, Creado: ${src.created_at})`);
    });
    
    // 7. Verificar el round robin después del cambio
    console.log('\n=== ROUND ROBIN ACTUALIZADO ===');
    
    // Contar agentes en aimedici
    const [aimediciAgents] = await sequelize.query(
      `SELECT a.id, a.first_name, a.last_name, a.email
       FROM agents a
       JOIN agent_lead_sources als ON a.id = als.agent_id
       WHERE als.source = 'aimedici'
       AND a.is_active = true
       AND a.role = 'agent'
       ORDER BY a.id`
    );
    
    console.log(`\nAIMEDICI: ${aimediciAgents.length} agentes en round robin`);
    aimediciAgents.forEach((agent, idx) => {
      console.log(`${idx + 1}. ${agent.first_name} ${agent.last_name} (${agent.email})`);
    });
    
  } catch (error) {
    console.error('Error al arreglar agente:', error);
  } finally {
    // Cerrar la conexión a la base de datos
    await sequelize.close();
  }
}

// Ejecutar la función
fixAgenteDos().catch(console.error); 