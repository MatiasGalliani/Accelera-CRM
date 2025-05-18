import { Agent, AgentLeadSource } from './models/leads-index.js';
import sequelize from './config/database.js';

/**
 * Fix agent records in the database
 */
async function fixAgentRecords() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Starting agent database cleanup...');
    
    // 1. Fix the admin account (it@creditplan.it)
    const adminEmail = 'it@creditplan.it';
    console.log(`\nLooking for admin account: ${adminEmail}`);
    
    const admin = await Agent.findOne({
      where: { email: adminEmail },
      transaction
    });
    
    if (admin) {
      console.log(`Found account: ${admin.firstName} ${admin.lastName} (${admin.email})`);
      console.log(`Current role: ${admin.role}`);
      
      if (admin.role !== 'admin') {
        await admin.update({ role: 'admin' }, { transaction });
        console.log('✅ Updated role to admin');
      } else {
        console.log('✓ Already has admin role');
      }
    } else {
      console.log(`❌ Admin account not found: ${adminEmail}`);
    }
    
    // 2. Deactivate the deleted agent (prova.agente@creditplan.it)
    const deletedAgentEmail = 'prova.agente@creditplan.it';
    console.log(`\nLooking for deleted agent: ${deletedAgentEmail}`);
    
    const deletedAgent = await Agent.findOne({
      where: { email: deletedAgentEmail },
      transaction
    });
    
    if (deletedAgent) {
      console.log(`Found account: ${deletedAgent.firstName} ${deletedAgent.lastName} (${deletedAgent.email})`);
      console.log(`Current active status: ${deletedAgent.isActive ? 'Active' : 'Inactive'}`);
      
      if (deletedAgent.isActive) {
        await deletedAgent.update({ isActive: false }, { transaction });
        console.log('✅ Marked agent as inactive');
      } else {
        console.log('✓ Already marked as inactive');
      }
    } else {
      console.log(`❌ Deleted agent account not found: ${deletedAgentEmail}`);
    }
    
    // Commit the transaction
    await transaction.commit();
    console.log('\n✅ All updates committed successfully');
    
    // Verify the changes
    console.log('\nVerifying changes...');
    
    const updatedAdmin = await Agent.findOne({ 
      where: { email: adminEmail } 
    });
    
    if (updatedAdmin) {
      console.log(`Admin account: ${updatedAdmin.firstName} ${updatedAdmin.lastName}`);
      console.log(`Role: ${updatedAdmin.role}`);
      console.log(`Active: ${updatedAdmin.isActive ? 'Yes' : 'No'}`);
    }
    
    const updatedDeletedAgent = await Agent.findOne({ 
      where: { email: deletedAgentEmail } 
    });
    
    if (updatedDeletedAgent) {
      console.log(`\nDeleted agent: ${updatedDeletedAgent.firstName} ${updatedDeletedAgent.lastName}`);
      console.log(`Active: ${updatedDeletedAgent.isActive ? 'Yes' : 'No'}`);
    }
    
    // Show all active agents now
    console.log('\nCurrent active agents:');
    const activeAgents = await Agent.findAll({
      where: { isActive: true },
      attributes: ['id', 'firstName', 'lastName', 'email', 'role']
    });
    
    activeAgents.forEach((agent, index) => {
      console.log(`${index + 1}. ${agent.firstName} ${agent.lastName} (${agent.email}) - Role: ${agent.role}`);
    });
    
  } catch (error) {
    // Rollback in case of error
    await transaction.rollback();
    console.error('Error fixing agent records:', error);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Run the cleanup
fixAgentRecords().catch(console.error); 