const { Sequelize } = require('sequelize');

// Configuración de la conexión a la base de datos
const sequelize = new Sequelize('case_management', 'postgres', 'postgres', {
  host: 'localhost',
  port: 5432,
  dialect: 'postgres',
  logging: false
});

/**
 * Script para verificar que la corrección del bug de AIFIDI funciona
 */
async function verifyAifidiFix() {
  try {
    // Probar la conexión a la base de datos
    await sequelize.authenticate();
    console.log('Conexión a PostgreSQL establecida correctamente.');
    
    // 1. Verificar si agentetres@gmail.com tiene asignada la fuente AIFIDI
    console.log('\n1. Verificando si agentetres@gmail.com tiene AIFIDI...');
    const [agenteTres] = await sequelize.query(`
      SELECT a.id, a.email, a.first_name, a.last_name, als.id as source_id, als.source
      FROM agents a
      LEFT JOIN agent_lead_sources als ON a.id = als.agent_id
      WHERE a.email = 'agentetres@gmail.com'
      ORDER BY als.source
    `);
    
    console.log(`Encontradas ${agenteTres.length} fuentes para agentetres@gmail.com:`);
    
    if (agenteTres.length === 0) {
      console.log('❌ No se encontró el agente agentetres@gmail.com');
    } else {
      // Mostrar todas las fuentes asignadas
      const sources = new Set();
      agenteTres.forEach(row => {
        if (row.source) {
          sources.add(row.source);
          console.log(`- ${row.source} (ID: ${row.source_id})`);
        }
      });
      
      // Verificar específicamente AIFIDI
      if (sources.has('aifidi')) {
        console.log('❌ AIFIDI sigue asignado a agentetres@gmail.com');
      } else {
        console.log('✅ AIFIDI no está asignado a agentetres@gmail.com');
      }
    }
    
    // 2. Crear un nuevo agente de prueba para verificar que no recibe AIFIDI automáticamente
    console.log('\n2. Creando un agente de prueba...');
    const testEmail = `test-agent-${Date.now()}@example.com`;
    
    await sequelize.query(`
      INSERT INTO agents (email, first_name, last_name, role, is_active, created_at, updated_at)
      VALUES (:email, 'Test', 'Agent', 'agent', true, NOW(), NOW())
      RETURNING id
    `, {
      replacements: { email: testEmail }
    });
    
    // Obtener el ID del agente creado
    const [newAgent] = await sequelize.query(`
      SELECT id FROM agents WHERE email = :email
    `, {
      replacements: { email: testEmail }
    });
    
    if (newAgent.length === 0) {
      throw new Error('No se pudo crear el agente de prueba');
    }
    
    const newAgentId = newAgent[0].id;
    console.log(`✅ Agente de prueba creado con ID: ${newAgentId}`);
    
    // 3. Verificar si el nuevo agente tiene fuentes asignadas automáticamente
    console.log('\n3. Verificando las fuentes del agente de prueba...');
    const [newAgentSources] = await sequelize.query(`
      SELECT source FROM agent_lead_sources
      WHERE agent_id = :agentId
    `, {
      replacements: { agentId: newAgentId }
    });
    
    if (newAgentSources.length === 0) {
      console.log('✅ El agente de prueba no tiene fuentes asignadas automáticamente');
    } else {
      console.log(`❌ El agente de prueba tiene ${newAgentSources.length} fuentes asignadas:`);
      newAgentSources.forEach(source => {
        console.log(`- ${source.source}`);
      });
      
      // Verificar específicamente AIFIDI
      const hasAifidi = newAgentSources.some(s => s.source === 'aifidi');
      if (hasAifidi) {
        console.log('❌ AIFIDI se asignó automáticamente. La corrección del bug no funcionó.');
      } else {
        console.log('✅ AIFIDI no se asignó, pero otras fuentes sí se asignaron automáticamente.');
      }
    }
    
    // 4. Limpiar los datos de prueba
    console.log('\n4. Limpiando datos de prueba...');
    await sequelize.query(`
      DELETE FROM agent_lead_sources
      WHERE agent_id = :agentId
    `, {
      replacements: { agentId: newAgentId }
    });
    
    await sequelize.query(`
      DELETE FROM agents
      WHERE id = :agentId
    `, {
      replacements: { agentId: newAgentId }
    });
    
    console.log('✅ Datos de prueba eliminados correctamente');
    
  } catch (error) {
    console.error('Error durante la verificación:', error);
  } finally {
    // Cerrar la conexión a la base de datos
    await sequelize.close();
    console.log('\nVerificación completada.');
  }
}

// Ejecutar la función
verifyAifidiFix(); 