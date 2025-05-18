import { Agent, AgentLeadSource } from './models/leads-index.js';
import sequelize from './config/database.js';

/**
 * Fix admin accounts to ensure they never receive leads
 */
async function fixAdminSources() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Starting admin account cleanup...');
    
    // 1. Find all admin accounts
    const adminAccounts = await Agent.findAll({
      where: { role: 'admin' },
      include: [{ model: AgentLeadSource }],
      transaction
    });
    
    console.log(`\nFound ${adminAccounts.length} admin accounts:`);
    
    // Process each admin account
    for (const admin of adminAccounts) {
      console.log(`\n- ${admin.firstName} ${admin.lastName} (${admin.email})`);
      
      // Check if admin has any lead sources
      if (admin.AgentLeadSources && admin.AgentLeadSources.length > 0) {
        console.log(`  This admin has ${admin.AgentLeadSources.length} lead sources assigned:`);
        
        // List current sources
        admin.AgentLeadSources.forEach(source => {
          console.log(`  - ${source.source} (ID: ${source.id})`);
        });
        
        // Remove all lead sources
        console.log('  Removing all lead sources from this admin...');
        await AgentLeadSource.destroy({
          where: { agentId: admin.id },
          transaction
        });
        
        console.log('  ✅ All lead sources removed successfully');
      } else {
        console.log('  ✓ This admin has no lead sources (correct)');
      }
    }
    
    // Commit all changes
    await transaction.commit();
    console.log('\n✅ All changes committed successfully');
    
    // Verify changes
    console.log('\nVerifying changes...');
    
    const verifiedAdmins = await Agent.findAll({
      where: { role: 'admin' },
      include: [{ model: AgentLeadSource }]
    });
    
    for (const admin of verifiedAdmins) {
      console.log(`\n- ${admin.firstName} ${admin.lastName} (${admin.email})`);
      
      if (admin.AgentLeadSources && admin.AgentLeadSources.length > 0) {
        console.log(`  ❌ ERROR: Admin still has ${admin.AgentLeadSources.length} lead sources:`);
        admin.AgentLeadSources.forEach(source => {
          console.log(`  - ${source.source}`);
        });
      } else {
        console.log('  ✅ Confirmed: Admin has no lead sources (correct)');
      }
    }
    
    // Now update count of agents with aimedici access
    console.log('\nCounting agents (non-admin) with access to aimedici source:');
    const aimediciAgents = await AgentLeadSource.findAll({
      where: { source: 'aimedici' },
      include: [{ 
        model: Agent, 
        where: { 
          role: 'agent',
          isActive: true 
        }
      }]
    });
    
    console.log(`Found ${aimediciAgents.length} active regular agents with access to aimedici source:`);
    aimediciAgents.forEach((agentSource, index) => {
      console.log(`${index + 1}. ${agentSource.Agent.firstName} ${agentSource.Agent.lastName} (${agentSource.Agent.email})`);
    });
    
  } catch (error) {
    // Rollback in case of error
    await transaction.rollback();
    console.error('Error fixing admin accounts:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Run the function
fixAdminSources().catch(console.error); 