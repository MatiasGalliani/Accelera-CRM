import Case from './Case.js';
import Client from './Client.js';
import Document from './Document.js';
import CaseNote from './CaseNote.js';
import CaseStatusHistory from './CaseStatusHistory.js';

// Define relationships
Case.belongsTo(Client, { foreignKey: 'clientId', as: 'client' });
Client.hasMany(Case, { foreignKey: 'clientId', as: 'cases' });

Case.hasMany(Document, { foreignKey: 'caseId' });
Document.belongsTo(Case, { foreignKey: 'caseId' });

Case.hasMany(CaseNote, { foreignKey: 'caseId' });
CaseNote.belongsTo(Case, { foreignKey: 'caseId' });

Case.hasMany(CaseStatusHistory, { foreignKey: 'caseId' });
CaseStatusHistory.belongsTo(Case, { foreignKey: 'caseId' });

export {
  Case,
  Client,
  Document,
  CaseNote,
  CaseStatusHistory
}; 