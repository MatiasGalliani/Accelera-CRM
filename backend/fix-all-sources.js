import sequelize from './config/database.js';

/**
 * Fix all agent source issues with direct SQL commands
 */
async function fixAllSources() {
  try {
    console.log('Ejecutando correcciones directas de SQL para todas las fuentes...');
    
    // 1. Primero, eliminar todas las fuentes de leads para los admins
    const [admins] = await sequelize.query(
      `SELECT id, first_name, last_name, email FROM agents WHERE role = 'admin'`
    );
    
    console.log(`\nEncontrados ${admins.length} administradores en el sistema:`);
    for (const admin of admins) {
      console.log(`- ${admin.first_name} ${admin.last_name} (${admin.email})`);
      
      // Eliminar todas las fuentes para este admin
      const [deleted] = await sequelize.query(
        `DELETE FROM agent_lead_sources WHERE agent_id = :adminId RETURNING id`,
        {
          replacements: { adminId: admin.id }
        }
      );
      
      if (deleted && deleted.length > 0) {
        console.log(`  ✅ Eliminadas ${deleted.length} fuentes para este admin`);
      } else {
        console.log('  ✓ Este admin no tenía fuentes (correcto)');
      }
    }
    
    // 2. Añadir aimedici a tu cuenta
    const yourEmail = 'matiasgalliani00@gmail.com';
    const [yourAccount] = await sequelize.query(
      `SELECT id, first_name, last_name FROM agents WHERE email = :email AND is_active = true`,
      {
        replacements: { email: yourEmail }
      }
    );
    
    if (yourAccount && yourAccount.length > 0) {
      const yourId = yourAccount[0].id;
      console.log(`\nEncontrada tu cuenta: ${yourAccount[0].first_name} ${yourAccount[0].last_name} (ID: ${yourId})`);
      
      // Comprobar fuentes actuales
      const [currentSources] = await sequelize.query(
        `SELECT source FROM agent_lead_sources WHERE agent_id = :agentId`,
        {
          replacements: { agentId: yourId }
        }
      );
      
      console.log('Fuentes actuales:');
      currentSources.forEach((src, idx) => {
        console.log(`${idx + 1}. ${src.source}`);
      });
      
      // Verificar si ya tiene aimedici
      const hasAimedici = currentSources.some(src => src.source === 'aimedici');
      
      if (!hasAimedici) {
        // Añadir aimedici
        const [result] = await sequelize.query(
          `INSERT INTO agent_lead_sources (agent_id, source, created_at)
           VALUES (:agentId, 'aimedici', NOW())
           RETURNING id`,
          {
            replacements: { agentId: yourId }
          }
        );
        
        if (result && result.length > 0) {
          console.log(`✅ Añadida fuente aimedici con ID: ${result[0].id}`);
        } else {
          console.log('❌ Error al añadir aimedici');
        }
      } else {
        console.log('✓ Tu cuenta ya tiene acceso a aimedici');
      }
      
      // Verificar si tiene aiquinto
      const hasAiquinto = currentSources.some(src => src.source === 'aiquinto');
      
      if (!hasAiquinto) {
        // Añadir aiquinto
        const [result] = await sequelize.query(
          `INSERT INTO agent_lead_sources (agent_id, source, created_at)
           VALUES (:agentId, 'aiquinto', NOW())
           RETURNING id`,
          {
            replacements: { agentId: yourId }
          }
        );
        
        if (result && result.length > 0) {
          console.log(`✅ Añadida fuente aiquinto con ID: ${result[0].id}`);
        }
      } else {
        console.log('✓ Tu cuenta ya tiene acceso a aiquinto');
      }
    } else {
      console.log(`\n❌ No se encontró tu cuenta con email: ${yourEmail}`);
    }
    
    // 3. Verificar el estado final
    console.log('\n=== VERIFICACIÓN FINAL ===');
    
    // Verificar admins
    const [adminSources] = await sequelize.query(
      `SELECT a.email, als.source 
       FROM agents a
       JOIN agent_lead_sources als ON a.id = als.agent_id
       WHERE a.role = 'admin'`
    );
    
    if (adminSources.length > 0) {
      console.log(`\n⚠️ ADVERTENCIA: Todavía hay ${adminSources.length} fuentes asignadas a administradores:`);
      adminSources.forEach((src, idx) => {
        console.log(`${idx + 1}. ${src.email} - ${src.source}`);
      });
    } else {
      console.log('\n✅ Todos los administradores están correctamente sin fuentes de leads');
    }
    
    // Verificar tu cuenta
    const [yourFinalSources] = await sequelize.query(
      `SELECT als.source 
       FROM agents a
       JOIN agent_lead_sources als ON a.id = als.agent_id
       WHERE a.email = :email`,
      {
        replacements: { email: yourEmail }
      }
    );
    
    console.log(`\nFuentes finales para ${yourEmail}:`);
    if (yourFinalSources.length > 0) {
      yourFinalSources.forEach((src, idx) => {
        console.log(`${idx + 1}. ${src.source}`);
      });
      
      const finalHasAimedici = yourFinalSources.some(src => src.source === 'aimedici');
      const finalHasAiquinto = yourFinalSources.some(src => src.source === 'aiquinto');
      
      if (finalHasAimedici && finalHasAiquinto) {
        console.log('\n✅ ÉXITO: Tu cuenta tiene ambas fuentes configuradas correctamente');
      } else {
        console.log('\n❌ ERROR: Tu cuenta aún falta alguna fuente');
        if (!finalHasAimedici) console.log('- Falta aimedici');
        if (!finalHasAiquinto) console.log('- Falta aiquinto');
      }
    } else {
      console.log('❌ Tu cuenta no tiene fuentes asignadas');
    }
    
    // Conteo final por fuente
    console.log('\n--- RESUMEN FINAL ---');
    const sources = ['aiquinto', 'aimedici', 'aifidi'];
    const counts = {};
    
    for (const source of sources) {
      const [result] = await sequelize.query(
        `SELECT COUNT(*) as count
         FROM agents a
         JOIN agent_lead_sources als ON a.id = als.agent_id
         WHERE als.source = :source
         AND a.is_active = true
         AND a.role = 'agent'`,
        {
          replacements: { source }
        }
      );
      
      counts[source] = result[0].count;
    }
    
    console.log(`AIQUINTO: ${counts.aiquinto} agentes activos`);
    console.log(`AIMEDICI: ${counts.aimedici} agentes activos`);
    console.log(`AIFIDI: ${counts.aifidi} agentes activos`);
    
  } catch (error) {
    console.error('Error al corregir fuentes:', error);
  } finally {
    // Cerrar la conexión a la base de datos
    await sequelize.close();
  }
}

// Ejecutar la función
fixAllSources().catch(console.error); 