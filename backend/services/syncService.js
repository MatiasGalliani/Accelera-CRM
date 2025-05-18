import admin from 'firebase-admin';
import { Agent, AgentPage, AgentLeadSource } from '../models/leads-index.js';
import sequelize from '../config/database.js';

/**
 * Sincroniza un agente de Firestore a PostgreSQL
 * @param {string} agentId - ID del documento de Firestore
 * @param {Object} firestoreData - Datos del agente en Firestore
 * @returns {Promise<Object>} - Resultado de la sincronización
 */
export async function syncAgentFromFirestore(agentId, firestoreData) {
  const transaction = await sequelize.transaction();
  
  try {
    console.log(`Sincronizando agente ${agentId} desde Firestore:`, firestoreData);
    
    // Buscar si el agente ya existe por su UID de Firebase
    let agent = await Agent.findOne({
      where: { firebaseUid: firestoreData.uid },
      transaction
    });
    
    const created = !agent;
    
    if (created) {
      console.log(`Agente ${agentId} no existe en PostgreSQL, creando...`);
      
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
      
      console.log(`Agente ${agentId} creado en PostgreSQL con ID: ${agent.id}`);
    } else {
      console.log(`Agente ${agentId} ya existe en PostgreSQL, actualizando...`);
      
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
      
      console.log(`Agente ${agentId} actualizado en PostgreSQL`);
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
      
      // Solo asignar todas las fuentes si es un admin
      // Los agentes regulares no recibirán fuentes automáticamente
      if (agent.role === 'admin') {
        // Contar fuentes existentes
        const existingSources = await AgentLeadSource.count({
          where: { agentId: agent.id },
          transaction
        });
        
        // Si no tiene ninguna fuente asignada, asignar todas
        if (existingSources === 0) {
          console.log(`Asignando todas las fuentes de leads al admin ${agent.email}`);
          
          for (const source of allSources) {
            await AgentLeadSource.create({
              agentId: agent.id,
              source
            }, { transaction });
          }
        }
      } else {
        console.log(`No se asignan fuentes automáticamente al agente ${agent.email}`);
      }
    }
    
    // Confirmar la transacción
    await transaction.commit();
    
    return {
      success: true,
      action: created ? 'created' : 'updated',
      agentId: agent.id,
      firestoreId: agentId
    };
  } catch (error) {
    // Revertir la transacción en caso de error
    await transaction.rollback();
    console.error('Error en sincronización de agente:', error);
    
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
    console.log('Iniciando sincronización de todos los agentes de Firestore a PostgreSQL');
    
    // Obtener todos los agentes de Firestore
    const agentsSnapshot = await admin.firestore().collection('agents').get();
    
    const results = [];
    
    // Sincronizar cada agente
    for (const doc of agentsSnapshot.docs) {
      const result = await syncAgentFromFirestore(doc.id, doc.data());
      results.push(result);
    }
    
    console.log(`Sincronización completada: ${results.length} agentes procesados`);
    
    return results;
  } catch (error) {
    console.error('Error en sincronización de todos los agentes:', error);
    throw error;
  }
}

/**
 * Escucha cambios en la colección de agentes de Firestore y los sincroniza a PostgreSQL
 */
export function startFirestoreAgentListener() {
  console.log('Iniciando escucha de cambios en la colección de agentes de Firestore');
  
  return admin.firestore().collection('agents')
    .onSnapshot(async (snapshot) => {
      try {
        const batch = [];
        
        // Procesar cada cambio
        snapshot.docChanges().forEach((change) => {
          const agentId = change.doc.id;
          const firestoreData = change.doc.data();
          
          if (change.type === 'added' || change.type === 'modified') {
            batch.push(syncAgentFromFirestore(agentId, firestoreData));
          }
          // No manejamos 'removed' porque no queremos eliminar agentes en PostgreSQL
        });
        
        // Esperar a que se procesen todos los cambios
        await Promise.all(batch);
      } catch (error) {
        console.error('Error en listener de agentes:', error);
      }
    }, (error) => {
      console.error('Error en listener de Firestore:', error);
    });
}

export default {
  syncAgentFromFirestore,
  syncAllAgentsFromFirestore,
  startFirestoreAgentListener
}; 