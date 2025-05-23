import admin from 'firebase-admin';
import { Agent, AgentPage } from '../models/leads-index.js';
import { Op } from 'sequelize';

/**
 * Middleware para autenticar solicitudes con Firebase
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      console.error('No token provided');
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    // Verificar el token con Firebase
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

/**
 * Middleware para verificar si el usuario es admin en Firestore
 */
export const requireAdmin = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    
    // Verificar si es admin en Firestore
    const agentsSnapshot = await admin.firestore()
      .collection('agents')
      .where('uid', '==', uid)
      .limit(1)
      .get();
    
    // Si no existe en Firestore, verificar en PostgreSQL
    if (agentsSnapshot.empty) {
      const pgAgent = await Agent.findOne({
        where: { firebaseUid: uid }
      });
      
      if (!pgAgent || pgAgent.role !== 'admin') {
        return res.status(403).json({ 
          message: 'Accesso negato: richiede privilegi di amministratore' 
        });
      }
    } else {
      const agentData = agentsSnapshot.docs[0].data();
      
      if (agentData.role !== 'admin') {
        return res.status(403).json({ 
          message: 'Accesso negato: richiede privilegi di amministratore' 
        });
      }
    }
    
    // Si llegamos aquí, el usuario es admin
    next();
  } catch (err) {
    console.error('Admin check error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Middleware para verificar si el usuario tiene permiso para una página específica
 */
export const requirePagePermission = (pageRoute) => {
  return async (req, res, next) => {
    try {
      const uid = req.user.uid;
      
      // Verificar si es admin en Firestore (los admins tienen acceso a todo)
      const agentsSnapshot = await admin.firestore()
        .collection('agents')
        .where('uid', '==', uid)
        .limit(1)
        .get();
      
      if (!agentsSnapshot.empty) {
        const agentData = agentsSnapshot.docs[0].data();
        
        if (agentData.role === 'admin') {
          return next(); // Los admins tienen acceso a todo
        }
        
        // Verificar si tiene la página en su lista de permisos
        if (agentData.pages && Array.isArray(agentData.pages) && 
            (agentData.pages.includes(pageRoute) || agentData.pages.includes('*'))) {
          return next(); // Tiene permiso para esta página
        }
      }
      
      // Si no tiene permiso en Firestore, verificar en PostgreSQL
      const agent = await Agent.findOne({
        where: { firebaseUid: uid },
        include: [
          { 
            model: AgentPage,
            where: {
              [Op.or]: [
                { pageRoute },
                { pageRoute: '*' } // Comodín para todas las páginas
              ]
            },
            required: false
          }
        ]
      });
      
      if (agent && agent.role === 'admin') {
        return next(); // Los admins tienen acceso a todo
      }
      
      if (agent && agent.AgentPages && agent.AgentPages.length > 0) {
        return next(); // Tiene permiso para esta página
      }
      
      // Si llegamos aquí, el usuario no tiene permiso
      return res.status(403).json({ 
        message: `No tienes permiso para acceder a ${pageRoute}` 
      });
    } catch (err) {
      console.error('Page permission check error:', err);
      return res.status(500).json({ message: 'Server error' });
    }
  };
};

export const requireCampaignManager = async (req, res, next) => {
  try {
    const uid = req.user.uid;

    // First check in Firestore (if exists)
    const agentsSnapshot = await admin.firestore()
      .collection('agents')
      .where('uid', '==', uid)
      .limit(1)
      .get();

    if (!agentsSnapshot.empty) {
      const agentData = agentsSnapshot.docs[0].data();
      if (agentData.role === 'campaign_manager') {
        return next();
      }
    }

    // Fallback to PostgreSQL check
    const pgAgent = await Agent.findOne({ where: { firebaseUid: uid } });
    if (pgAgent && pgAgent.role === 'campaign_manager') {
      return next();
    }

    return res.status(403).json({
      message: 'Accesso negato: richiede privilegi di campaign manager'
    });
  } catch (err) {
    console.error('Campaign manager check error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

export default {
  authenticate,
  requireAdmin,
  requireCampaignManager,
  requirePagePermission
}; 