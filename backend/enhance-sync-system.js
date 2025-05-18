import admin from 'firebase-admin';
import { Agent, AgentLeadSource } from './models/leads-index.js';
import sequelize from './config/database.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config();

// Initialize Firebase Admin SDK if not already initialized
try {
  admin.app();
} catch (error) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

/**
 * Enhance the synchronization system by adding more robust logging and error handling
 */
async function enhanceSyncSystem() {
  try {
    console.log('========== ENHANCING SYNC SYSTEM ==========');
    
    // 1. Create a new sync-debug.js file with enhanced logging functions
    console.log('\n1. Creating enhanced sync debug module...');
    
    const syncDebugCode = `import fs from 'fs';
import path from 'path';

// Create logs directory if it doesn't exist
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Log file paths
const syncLogPath = path.join(logDir, 'sync.log');
const errorLogPath = path.join(logDir, 'sync-errors.log');

/**
 * Log a synchronization event with timestamp
 * @param {string} message - The message to log
 * @param {Object} data - Optional data to include in the log
 */
export function logSync(message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = \`[\${timestamp}] \${message}\${data ? '\\n' + JSON.stringify(data, null, 2) : ''}\n\`;
  
  // Log to console
  console.log(\`[\${timestamp}] \${message}\`);
  
  // Append to log file
  fs.appendFileSync(syncLogPath, logEntry);
}

/**
 * Log a synchronization error with timestamp
 * @param {string} message - The error message
 * @param {Error} error - The error object
 * @param {Object} context - Additional context about the error
 */
export function logSyncError(message, error, context = {}) {
  const timestamp = new Date().toISOString();
  
  // Format the error details
  const errorDetails = {
    message: error.message,
    stack: error.stack,
    ...context
  };
  
  const logEntry = \`[\${timestamp}] ERROR: \${message}\n\${JSON.stringify(errorDetails, null, 2)}\n\n\`;
  
  // Log to console
  console.error(\`[\${timestamp}] ERROR: \${message}\`);
  console.error(error);
  
  // Append to error log file
  fs.appendFileSync(errorLogPath, logEntry);
}

export default {
  logSync,
  logSyncError
};`;

    // Save the file
    fs.writeFileSync(path.join(process.cwd(), 'backend', 'services', 'sync-debug.js'), syncDebugCode);
    
    // 2. Enhance the original syncService.js with better error handling and logging
    console.log('\n2. Enhancing the syncService.js file...');
    
    // Read the original file
    const originalSyncServicePath = path.join(process.cwd(), 'backend', 'services', 'syncService.js');
    const originalSyncService = fs.readFileSync(originalSyncServicePath, 'utf8');
    
    // Create the enhanced version with better logging and error handling
    const enhancedSyncService = `import admin from 'firebase-admin';
import { Agent, AgentPage, AgentLeadSource } from '../models/leads-index.js';
import sequelize from '../config/database.js';
import syncDebug from './sync-debug.js';

// Set a flag to retry syncs that fail
let pendingSyncs = [];

/**
 * Sincroniza un agente de Firestore a PostgreSQL
 * @param {string} agentId - ID del documento de Firestore
 * @param {Object} firestoreData - Datos del agente en Firestore
 * @returns {Promise<Object>} - Resultado de la sincronización
 */
export async function syncAgentFromFirestore(agentId, firestoreData) {
  const transaction = await sequelize.transaction();
  
  try {
    syncDebug.logSync(\`Sincronizando agente \${agentId} desde Firestore\`, firestoreData);
    
    // Validate the firestore data structure
    if (!firestoreData) {
      throw new Error('Missing Firestore data for agent');
    }
    
    if (!firestoreData.uid) {
      syncDebug.logSyncError('Missing UID in Firestore data', new Error('Invalid data'), { agentId, firestoreData });
      
      // Try to get the data again from Firestore
      const docRef = admin.firestore().collection('agents').doc(agentId);
      const docSnap = await docRef.get();
      
      if (docSnap.exists) {
        firestoreData = docSnap.data();
        syncDebug.logSync(\`Retrieved updated Firestore data for \${agentId}\`, firestoreData);
      } else {
        throw new Error(\`Agent document \${agentId} does not exist in Firestore\`);
      }
    }
    
    // Buscar si el agente ya existe por su UID de Firebase
    let agent = await Agent.findOne({
      where: { firebaseUid: firestoreData.uid },
      transaction
    });
    
    const created = !agent;
    
    if (created) {
      syncDebug.logSync(\`Agente \${agentId} no existe en PostgreSQL, creando...\`);
      
      // Crear el agente si no existe
      agent = await Agent.create({
        firebaseUid: firestoreData.uid,
        email: firestoreData.email,
        firstName: firestoreData.firstName || '',
        lastName: firestoreData.lastName || '',
        role: firestoreData.role || 'agent',
        isActive: firestoreData.isActive !== false,
        phone: firestoreData.phone || null,
        calendlyUrl: firestoreData.calendlyUrl || null
      }, { transaction });
      
      syncDebug.logSync(\`Agente \${agentId} creado en PostgreSQL con ID: \${agent.id}\`);
    } else {
      syncDebug.logSync(\`Agente \${agentId} ya existe en PostgreSQL, actualizando...\`);
      
      // Actualizar el agente si ya existe
      await agent.update({
        email: firestoreData.email,
        firstName: firestoreData.firstName || agent.firstName,
        lastName: firestoreData.lastName || agent.lastName,
        role: firestoreData.role || agent.role,
        isActive: firestoreData.isActive !== false,
        phone: firestoreData.phone || agent.phone,
        calendlyUrl: firestoreData.calendlyUrl || agent.calendlyUrl
      }, { transaction });
      
      syncDebug.logSync(\`Agente \${agentId} actualizado en PostgreSQL\`);
    }
    
    // Sincronizar las páginas permitidas
    if (firestoreData.pages && Array.isArray(firestoreData.pages)) {
      // Eliminar todas las páginas actuales
      await AgentPage.destroy({
        where: { agentId: agent.id },
        transaction
      });
      
      // Crear las nuevas páginas
      for (const pageRoute of firestoreData.pages) {
        await AgentPage.create({
          agentId: agent.id,
          pageRoute
        }, { transaction });
      }
    }
    
    // Sincronizar las fuentes de leads permitidas
    let leadSourcesUpdated = false;
    
    if (firestoreData.leadSources && Array.isArray(firestoreData.leadSources)) {
      syncDebug.logSync(\`Actualizando fuentes de leads para agente \${agentId}\`, { 
        sources: firestoreData.leadSources 
      });
      
      // Eliminar todas las fuentes actuales
      await AgentLeadSource.destroy({
        where: { agentId: agent.id },
        transaction
      });
      
      // Crear las nuevas fuentes
      for (const source of firestoreData.leadSources) {
        await AgentLeadSource.create({
          agentId: agent.id,
          source
        }, { transaction });
      }
      leadSourcesUpdated = true;
    } else if (firestoreData.page) {
      syncDebug.logSync(\`Usando formato antiguo (page) para fuentes de leads del agente \${agentId}\`, {
        page: firestoreData.page
      });
      
      // Para compatibilidad con la estructura anterior que usaba "page"
      // Eliminar todas las fuentes actuales
      await AgentLeadSource.destroy({
        where: { agentId: agent.id },
        transaction
      });
      
      // Crear la fuente única
      await AgentLeadSource.create({
        agentId: agent.id,
        source: firestoreData.page
      }, { transaction });
      leadSourcesUpdated = true;
    }
    
    // Si es un agente nuevo o es admin y no tiene fuentes configuradas, asignar todas las fuentes disponibles
    if ((created || agent.role === 'admin') && !leadSourcesUpdated) {
      // Para admins, asegurarnos de que tengan acceso a todas las fuentes
      const allSources = ['aiquinto', 'aimedici', 'aifidi'];
      
      // Contar fuentes existentes
      const existingSources = await AgentLeadSource.count({
        where: { agentId: agent.id },
        transaction
      });
      
      // Si no tiene ninguna fuente asignada, asignar todas
      if (existingSources === 0) {
        syncDebug.logSync(\`Asignando todas las fuentes de leads al \${agent.role === 'admin' ? 'admin' : 'nuevo agente'} \${agent.email}\`);
        
        for (const source of allSources) {
          await AgentLeadSource.create({
            agentId: agent.id,
            source
          }, { transaction });
        }
      }
    }
    
    // Confirmar la transacción
    await transaction.commit();
    
    // Remove from pending syncs if it was there
    pendingSyncs = pendingSyncs.filter(item => item.agentId !== agentId);
    
    return {
      success: true,
      action: created ? 'created' : 'updated',
      agentId: agent.id,
      firestoreId: agentId
    };
  } catch (error) {
    // Revertir la transacción en caso de error
    await transaction.rollback();
    syncDebug.logSyncError(\`Error en sincronización de agente \${agentId}\`, error, { firestoreData });
    
    // Add to pending syncs for retry
    pendingSyncs.push({
      agentId,
      firestoreData,
      timestamp: Date.now(),
      error: error.message
    });
    
    return {
      success: false,
      error: error.message,
      agentId,
      firestoreData
    };
  }
}

/**
 * Sincroniza todos los agentes de Firestore a PostgreSQL
 * @returns {Promise<Array>} - Resultados de la sincronización
 */
export async function syncAllAgentsFromFirestore() {
  try {
    syncDebug.logSync('Iniciando sincronización de todos los agentes de Firestore a PostgreSQL');
    
    // Obtener todos los agentes de Firestore
    const agentsSnapshot = await admin.firestore().collection('agents').get();
    
    const results = [];
    
    // Sincronizar cada agente
    for (const doc of agentsSnapshot.docs) {
      const result = await syncAgentFromFirestore(doc.id, doc.data());
      results.push(result);
    }
    
    syncDebug.logSync(\`Sincronización completada: \${results.length} agentes procesados\`);
    
    return results;
  } catch (error) {
    syncDebug.logSyncError('Error en sincronización de todos los agentes', error);
    throw error;
  }
}

/**
 * Escucha cambios en la colección de agentes de Firestore y los sincroniza a PostgreSQL
 */
export function startFirestoreAgentListener() {
  syncDebug.logSync('Iniciando escucha de cambios en la colección de agentes de Firestore');
  
  // Set up retry mechanism for pending syncs
  setInterval(async () => {
    try {
      if (pendingSyncs.length > 0) {
        syncDebug.logSync(\`Retrying \${pendingSyncs.length} pending syncs\`);
        
        // Get syncs that are at least 5 seconds old
        const now = Date.now();
        const toRetry = pendingSyncs.filter(item => now - item.timestamp > 5000);
        
        if (toRetry.length > 0) {
          // Clone and clear the current batch to avoid concurrent modification
          const batch = [...toRetry];
          
          // Try to process each one
          for (const item of batch) {
            await syncAgentFromFirestore(item.agentId, item.firestoreData);
          }
        }
      }
    } catch (error) {
      syncDebug.logSyncError('Error in retry mechanism', error);
    }
  }, 30000); // Check every 30 seconds
  
  return admin.firestore().collection('agents')
    .onSnapshot(async (snapshot) => {
      try {
        const changes = snapshot.docChanges();
        syncDebug.logSync(\`Received \${changes.length} changes from Firestore\`);
        
        const batch = [];
        
        // Procesar cada cambio
        changes.forEach((change) => {
          const agentId = change.doc.id;
          const firestoreData = change.doc.data();
          
          if (change.type === 'added' || change.type === 'modified') {
            syncDebug.logSync(\`Change detected for agent \${agentId}: \${change.type}\`);
            batch.push(syncAgentFromFirestore(agentId, firestoreData));
          }
          // No manejamos 'removed' porque no queremos eliminar agentes en PostgreSQL
        });
        
        // Esperar a que se procesen todos los cambios
        await Promise.all(batch);
      } catch (error) {
        syncDebug.logSyncError('Error en listener de agentes', error);
      }
    }, (error) => {
      syncDebug.logSyncError('Error en listener de Firestore', error);
    });
}

/**
 * Verifica la integridad de la sincronización entre Firestore y PostgreSQL
 * @returns {Promise<Object>} - Resultado de la verificación
 */
export async function verifySyncIntegrity() {
  try {
    syncDebug.logSync('Verificando integridad de sincronización');
    
    // Get all agents from Firestore
    const fsAgents = await admin.firestore().collection('agents').get();
    
    // Get all agents from PostgreSQL
    const pgAgents = await Agent.findAll({
      include: [{ model: AgentLeadSource }]
    });
    
    const fsAgentsMap = new Map();
    fsAgents.forEach(doc => {
      const data = doc.data();
      fsAgentsMap.set(data.uid, {
        id: doc.id,
        ...data
      });
    });
    
    const pgAgentsMap = new Map();
    pgAgents.forEach(agent => {
      pgAgentsMap.set(agent.firebaseUid, {
        id: agent.id,
        email: agent.email,
        role: agent.role,
        leadSources: agent.AgentLeadSources.map(s => s.source)
      });
    });
    
    // Find discrepancies
    const discrepancies = [];
    
    // Check Firestore agents exist in PostgreSQL
    for (const [uid, fsAgent] of fsAgentsMap.entries()) {
      const pgAgent = pgAgentsMap.get(uid);
      
      if (!pgAgent) {
        discrepancies.push({
          type: 'missing_in_pg',
          agent: fsAgent
        });
        continue;
      }
      
      // Check lead sources match
      const fsLeadSources = fsAgent.leadSources || [];
      const pgLeadSources = pgAgent.leadSources || [];
      
      if (!arraysEqual(fsLeadSources.sort(), pgLeadSources.sort())) {
        discrepancies.push({
          type: 'lead_sources_mismatch',
          firestore: {
            uid,
            email: fsAgent.email,
            leadSources: fsLeadSources
          },
          postgresql: {
            id: pgAgent.id,
            email: pgAgent.email,
            leadSources: pgLeadSources
          }
        });
      }
    }
    
    // Log and return results
    if (discrepancies.length > 0) {
      syncDebug.logSync(\`Found \${discrepancies.length} sync discrepancies\`, discrepancies);
    } else {
      syncDebug.logSync('No sync discrepancies found');
    }
    
    return {
      success: true,
      discrepancies
    };
  } catch (error) {
    syncDebug.logSyncError('Error verifying sync integrity', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Utility function to compare arrays
function arraysEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;
  
  for (let i = 0; i < a.length; ++i) {
    if (a[i] !== b[i]) return false;
  }
  
  return true;
}

export default {
  syncAgentFromFirestore,
  syncAllAgentsFromFirestore,
  startFirestoreAgentListener,
  verifySyncIntegrity
};`;

    // Backup original file before modifying
    fs.copyFileSync(originalSyncServicePath, `${originalSyncServicePath}.bak`);
    
    // Write enhanced version
    fs.writeFileSync(originalSyncServicePath, enhancedSyncService);
    
    // 3. Create a script to verify synchronization integrity
    console.log('\n3. Creating sync verification script...');
    
    const verifyScriptCode = `import { verifySyncIntegrity } from './services/syncService.js';
import sequelize from './config/database.js';

/**
 * Script to verify synchronization integrity
 * Can be run periodically to detect and fix any sync issues
 */
async function verifySync() {
  try {
    console.log('Running sync verification...');
    
    const result = await verifySyncIntegrity();
    
    if (result.success) {
      if (result.discrepancies.length === 0) {
        console.log('✅ All agents are properly synchronized!');
      } else {
        console.log(\`⚠️ Found \${result.discrepancies.length} synchronization issues:\`);
        
        for (const discrepancy of result.discrepancies) {
          console.log(\`\\n- Type: \${discrepancy.type}\`);
          
          if (discrepancy.type === 'missing_in_pg') {
            console.log(\`  Firestore agent not in PostgreSQL: \${discrepancy.agent.email}\`);
          } else if (discrepancy.type === 'lead_sources_mismatch') {
            console.log(\`  Lead sources mismatch for: \${discrepancy.firestore.email}\`);
            console.log(\`  Firestore: \${JSON.stringify(discrepancy.firestore.leadSources)}\`);
            console.log(\`  PostgreSQL: \${JSON.stringify(discrepancy.postgresql.leadSources)}\`);
          }
        }
        
        console.log('\\nWould you like to fix these issues? (Not implemented here)');
      }
    } else {
      console.error('❌ Error verifying sync:', result.error);
    }
  } catch (error) {
    console.error('Unhandled error:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the verification
verifySync();`;
    
    fs.writeFileSync(path.join(process.cwd(), 'backend', 'verify-sync.js'), verifyScriptCode);
    
    // 4. Add instructions to package.json for running the scripts
    console.log('\n4. Adding script to package.json...');
    
    // Read package.json
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    let packageJsonContent;
    
    try {
      packageJsonContent = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    } catch (error) {
      console.log('Could not update package.json, file not found or invalid JSON');
      packageJsonContent = null;
    }
    
    if (packageJsonContent) {
      // Add new scripts
      if (!packageJsonContent.scripts) {
        packageJsonContent.scripts = {};
      }
      
      packageJsonContent.scripts['verify-sync'] = 'node backend/verify-sync.js';
      packageJsonContent.scripts['debug-sync'] = 'node backend/debug-sync-issue.js';
      packageJsonContent.scripts['fix-sync'] = 'node backend/fix-sync-issue.js';
      
      // Write back the updated package.json
      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJsonContent, null, 2));
    }
    
    // 5. Create logs directory
    console.log('\n5. Creating logs directory...');
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir);
    }
    
    console.log('\n========== ENHANCEMENT COMPLETE ==========');
    console.log('\nThe synchronization system has been enhanced with:');
    console.log('1. Detailed logging to files in the logs directory');
    console.log('2. Automatic retry mechanism for failed syncs');
    console.log('3. Integrity verification tool');
    console.log('4. Enhanced error handling');
    console.log('\nYou can now run the following commands:');
    console.log('- npm run verify-sync: Check for synchronization issues');
    console.log('- npm run debug-sync: Debug specific sync issues');
    console.log('- npm run fix-sync: Fix the sync issues with agentedos@creditplan.it');
    
  } catch (error) {
    console.error('Error enhancing sync system:', error);
  }
}

// Run the enhancement
enhanceSyncSystem().catch(error => {
  console.error('Unhandled error:', error);
}); 