import sequelize from './config/database.js';

/**
 * Count agents by lead source using direct SQL queries
 */
async function directCountSources() {
  try {
    console.log('Contando agentes por fuente usando SQL directo...');
    
    // Array of sources to check
    const sources = ['aiquinto', 'aimedici', 'aifidi'];
    
    // Get counts for each source with direct SQL
    for (const source of sources) {
      // Count regular agents (non-admin)
      const [regularResults] = await sequelize.query(
        `SELECT a.id, a.first_name, a.last_name, a.email 
         FROM agents a
         JOIN agent_lead_sources als ON a.id = als.agent_id
         WHERE als.source = :source
         AND a.is_active = true
         AND a.role = 'agent'`,
        {
          replacements: { source }
        }
      );
      
      console.log(`\n${source.toUpperCase()}: ${regularResults.length} agentes activos regulares`);
      regularResults.forEach((agent, index) => {
        console.log(`${index + 1}. ${agent.first_name} ${agent.last_name} (${agent.email})`);
      });
      
      // Check for any admins with this source
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
        console.log(`\n⚠️ ADVERTENCIA: ${adminResults.length} administradores tienen acceso a ${source}:`);
        adminResults.forEach((admin, index) => {
          console.log(`${index + 1}. ${admin.first_name} ${admin.last_name} (${admin.email})`);
        });
      }
    }
    
    // Check for agents with no sources
    const [noSourceAgents] = await sequelize.query(
      `SELECT a.id, a.first_name, a.last_name, a.email
       FROM agents a
       LEFT JOIN agent_lead_sources als ON a.id = als.agent_id
       WHERE a.is_active = true
       AND a.role = 'agent'
       GROUP BY a.id, a.first_name, a.last_name, a.email
       HAVING COUNT(als.id) = 0`
    );
    
    if (noSourceAgents.length > 0) {
      console.log(`\n⚠️ ADVERTENCIA: ${noSourceAgents.length} agentes activos no tienen fuentes asignadas:`);
      noSourceAgents.forEach((agent, index) => {
        console.log(`${index + 1}. ${agent.first_name} ${agent.last_name} (${agent.email})`);
      });
    }
    
    // Check for aimedici in your account specifically
    const yourEmail = 'matiasgalliani00@gmail.com';
    const [yourSources] = await sequelize.query(
      `SELECT als.source
       FROM agents a
       JOIN agent_lead_sources als ON a.id = als.agent_id
       WHERE a.email = :email`,
      {
        replacements: { email: yourEmail }
      }
    );
    
    console.log(`\nFuentes asignadas a ${yourEmail}:`);
    if (yourSources.length > 0) {
      yourSources.forEach((src, idx) => {
        console.log(`${idx + 1}. ${src.source}`);
      });
      
      const hasAimedici = yourSources.some(src => src.source === 'aimedici');
      if (hasAimedici) {
        console.log('✅ Tu cuenta tiene acceso a aimedici');
      } else {
        console.log('❌ Tu cuenta NO tiene acceso a aimedici');
      }
    } else {
      console.log('❌ Tu cuenta no tiene fuentes asignadas');
    }
    
    // Summary with direct counts
    console.log('\n--- RESUMEN ---');
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
    console.error('Error contando agentes:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Run the function
directCountSources().catch(console.error); 