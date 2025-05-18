import { Agent, AgentLeadSource } from './models/leads-index.js';
import sequelize from './config/database.js';

/**
 * Count active agents by lead source
 */
async function countAgentsBySource() {
  try {
    console.log('Contando agentes activos por fuente de leads...');
    
    // Array of sources to check
    const sources = ['aiquinto', 'aimedici', 'aifidi'];
    
    // Get counts for each source
    for (const source of sources) {
      // Count active regular agents
      const regularAgents = await AgentLeadSource.findAll({
        where: { source },
        include: [{ 
          model: Agent, 
          where: { 
            isActive: true,
            role: 'agent'
          }
        }]
      });
      
      console.log(`\n${source.toUpperCase()}: ${regularAgents.length} agentes activos regulares`);
      regularAgents.forEach((agentSource, index) => {
        console.log(`${index + 1}. ${agentSource.Agent.firstName} ${agentSource.Agent.lastName} (${agentSource.Agent.email})`);
      });
      
      // Check for any admins (should be none)
      const adminAgents = await AgentLeadSource.findAll({
        where: { source },
        include: [{ 
          model: Agent, 
          where: { 
            role: 'admin'
          }
        }]
      });
      
      if (adminAgents.length > 0) {
        console.log(`\n⚠️ ADVERTENCIA: ${adminAgents.length} administradores tienen acceso a ${source}:`);
        adminAgents.forEach((agentSource, index) => {
          console.log(`${index + 1}. ${agentSource.Agent.firstName} ${agentSource.Agent.lastName} (${agentSource.Agent.email})`);
        });
      }
    }
    
    // Check for agents with no sources
    const allActiveAgents = await Agent.findAll({
      where: { 
        isActive: true,
        role: 'agent'
      },
      include: [{ model: AgentLeadSource }]
    });
    
    const agentsWithNoSources = allActiveAgents.filter(agent => 
      !agent.AgentLeadSources || agent.AgentLeadSources.length === 0);
    
    if (agentsWithNoSources.length > 0) {
      console.log(`\n⚠️ ADVERTENCIA: ${agentsWithNoSources.length} agentes activos no tienen fuentes asignadas:`);
      agentsWithNoSources.forEach((agent, index) => {
        console.log(`${index + 1}. ${agent.firstName} ${agent.lastName} (${agent.email})`);
      });
    }
    
    // Summary
    console.log('\n--- RESUMEN ---');
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
countAgentsBySource().catch(console.error); 