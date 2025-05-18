import sequelize from './config/database.js';

/**
 * Script final para corregir todos los problemas de fuentes de leads
 */
async function finalFixLeads() {
  try {
    console.log('Ejecutando corrección final de fuentes de leads...');
    
    // 1. Eliminar TODAS las fuentes existentes para limpiar todo
    console.log('\n1. Eliminando todas las fuentes existentes para empezar limpio...');
    await sequelize.query('DELETE FROM agent_lead_sources');
    console.log('✅ Todas las fuentes eliminadas correctamente');
    
    // 2. Obtener los IDs de los agentes activos y administradores
    const [agents] = await sequelize.query(
      `SELECT id, first_name, last_name, email, role 
       FROM agents 
       WHERE is_active = true
       ORDER BY role, id`
    );
    
    // Separar agentes regulares y administradores
    const regularAgents = agents.filter(agent => agent.role === 'agent');
    const adminAgents = agents.filter(agent => agent.role === 'admin');
    
    console.log(`\n2. Encontrados ${regularAgents.length} agentes regulares activos y ${adminAgents.length} administradores`);
    
    // 3. Asignar fuentes a todos los agentes regulares activos
    console.log('\n3. Asignando fuentes a agentes regulares:');
    
    for (const agent of regularAgents) {
      console.log(`- ${agent.first_name} ${agent.last_name} (${agent.email}):`);
      
      // Verificar si es tu cuenta
      const isYourAccount = agent.email === 'matiasgalliani00@gmail.com';
      
      // Fuentes a asignar
      const sources = isYourAccount ? 
        ['aiquinto', 'aimedici'] : // Tu cuenta recibe ambas fuentes
        ['aiquinto'];             // Otros agentes solo aiquinto por ahora
      
      // Crear registros para cada fuente
      for (const source of sources) {
        await sequelize.query(
          `INSERT INTO agent_lead_sources (agent_id, source, created_at)
           VALUES (:agentId, :source, NOW())`,
          {
            replacements: { 
              agentId: agent.id,
              source 
            }
          }
        );
        console.log(`  ✅ Asignada fuente ${source}`);
      }
    }
    
    // 4. Verificar que los administradores no tengan fuentes
    console.log('\n4. Verificando que los administradores no tengan fuentes:');
    for (const admin of adminAgents) {
      const [adminSources] = await sequelize.query(
        `SELECT * FROM agent_lead_sources WHERE agent_id = :adminId`,
        {
          replacements: { adminId: admin.id }
        }
      );
      
      if (adminSources.length > 0) {
        console.log(`❌ El administrador ${admin.email} tiene ${adminSources.length} fuentes. Eliminando...`);
        await sequelize.query(
          `DELETE FROM agent_lead_sources WHERE agent_id = :adminId`,
          {
            replacements: { adminId: admin.id }
          }
        );
      } else {
        console.log(`✅ El administrador ${admin.email} no tiene fuentes (correcto)`);
      }
    }
    
    // 5. Verificar agentes inactivos
    console.log('\n5. Verificando agentes inactivos:');
    const [inactiveAgents] = await sequelize.query(
      `SELECT id, first_name, last_name, email FROM agents WHERE is_active = false`
    );
    
    console.log(`Encontrados ${inactiveAgents.length} agentes inactivos`);
    for (const agent of inactiveAgents) {
      // Eliminar todas las fuentes para agentes inactivos
      await sequelize.query(
        `DELETE FROM agent_lead_sources WHERE agent_id = :agentId`,
        {
          replacements: { agentId: agent.id }
        }
      );
      console.log(`- ${agent.first_name} ${agent.last_name} (${agent.email}): fuentes eliminadas`);
    }
    
    // 6. Verificación final
    console.log('\n=== VERIFICACIÓN FINAL ===');
    
    // Verificar fuentes de administradores (debería ser 0)
    const [adminSourcesFinal] = await sequelize.query(
      `SELECT a.email, als.source 
       FROM agents a
       JOIN agent_lead_sources als ON a.id = als.agent_id
       WHERE a.role = 'admin'`
    );
    
    if (adminSourcesFinal.length > 0) {
      console.log(`❌ ERROR: Todavía hay ${adminSourcesFinal.length} fuentes asignadas a administradores`);
    } else {
      console.log('✅ Los administradores no tienen fuentes asignadas (correcto)');
    }
    
    // Verificar fuentes de tu cuenta específicamente
    const yourEmail = 'matiasgalliani00@gmail.com';
    const [yourSources] = await sequelize.query(
      `SELECT als.source 
       FROM agents a
       JOIN agent_lead_sources als ON a.id = als.agent_id
       WHERE a.email = :email
       ORDER BY als.source`,
      {
        replacements: { email: yourEmail }
      }
    );
    
    console.log(`\nFuentes asignadas a tu cuenta (${yourEmail}):`);
    if (yourSources.length > 0) {
      for (const src of yourSources) {
        console.log(`- ${src.source}`);
      }
      
      const hasAimedici = yourSources.some(src => src.source === 'aimedici');
      const hasAiquinto = yourSources.some(src => src.source === 'aiquinto');
      
      if (hasAimedici && hasAiquinto) {
        console.log('✅ Tu cuenta tiene ambas fuentes configuradas correctamente');
      } else {
        console.log('❌ Tu cuenta no tiene todas las fuentes necesarias');
      }
    } else {
      console.log('❌ Tu cuenta no tiene fuentes asignadas');
    }
    
    // Resumen final por fuente
    console.log('\n--- RESUMEN FINAL ---');
    const sources = ['aiquinto', 'aimedici', 'aifidi'];
    
    console.log('Agentes activos en round robin por fuente:');
    for (const source of sources) {
      const [result] = await sequelize.query(
        `SELECT a.first_name, a.last_name, a.email
         FROM agents a
         JOIN agent_lead_sources als ON a.id = als.agent_id
         WHERE als.source = :source
         AND a.is_active = true
         AND a.role = 'agent'
         ORDER BY a.id`,
        {
          replacements: { source }
        }
      );
      
      console.log(`\n${source.toUpperCase()}: ${result.length} agentes`);
      if (result.length > 0) {
        result.forEach((agent, idx) => {
          console.log(`${idx + 1}. ${agent.first_name} ${agent.last_name} (${agent.email})`);
        });
      } else {
        console.log('Ningún agente asignado a esta fuente');
      }
    }
    
  } catch (error) {
    console.error('Error en la corrección final:', error);
  } finally {
    // Cerrar la conexión a la base de datos
    await sequelize.close();
  }
}

// Ejecutar la función
finalFixLeads().catch(console.error); 