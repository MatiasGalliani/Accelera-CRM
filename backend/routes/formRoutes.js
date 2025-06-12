import express from 'express';
import { createLead } from '../services/leadService.js';

const router = express.Router();

/*
  These endpoints receive the raw JSON produced by the AIQuinto
  public site (see FormScreen component in the frontend). They map
  the incoming fields to our lead structure and store them using the
  existing round-robin logic (source = "aiquinto").
*/

// POST  /api/forms/dipendente
router.post('/dipendente', async (req, res) => {
  try {
    const data = req.body;

    // Build the lead payload expected by leadService.createLead
    const leadData = {
      source: 'aiquinto',
      firstName: data.nome || '',
      lastName: data.cognome || '',
      email: data.mail,
      phone: data.telefono || '',
      message: JSON.stringify(data),
      privacyAccettata: data.privacyAccepted || false,

      // Map the fields correctly
      importoRichiesto: data.amountRequested || null,
      stipendioNetto: data.netSalary || null,
      tipologiaDipendente: data.depType || 'Dipendente',
      sottotipo: data.secondarySelection || null,
      tipoContratto: data.contractType || null,
      provinciaResidenza: data.province || null,
      meseAnnoAssunzione: data.employmentDate || null,
      numeroDipendenti: data.numEmployees || null,
      dataNascita: data.birthDate || null,
      cittaResidenza: data.residenceCity || null
    };

    const lead = await createLead(leadData);

    return res.status(201).json({
      success: true,
      leadId: lead.id,
      assignedAgentId: lead.assignedAgentId,
      message: 'Lead creato correttamente'
    });
  } catch (error) {
    console.error('Errore nella creazione lead dipendente:', error);
    return res.status(500).json({ error: error.message || 'Errore del server' });
  }
});

// POST /api/forms/aimedici
router.post('/aimedici', async (req, res) => {
  try {
    const data = req.body;

    // Build the lead payload expected by leadService.createLead
    const leadData = {
      source: 'aimedici',
      firstName: data.nome || '',
      lastName: data.cognome || '',
      email: data.mail,
      phone: data.telefono || '',

      // Persist the full original payload as message for reference / audit
      message: JSON.stringify(data),

      // Detail fields used by Aimedici in our DB
      importoRichiesto: data.importoRichiesto || null,
      scopoRichiesta: data.financingScope || null,
      cittaResidenza: data.cittaResidenza || null,
      provinciaResidenza: data.provinciaResidenza || null,
      privacyAccettata: data.privacyAccepted || false,
      
      // Additional fields from the form
      financingScope: data.financingScope || null,
      nome: data.nome || '',
      cognome: data.cognome || '',
      mail: data.mail || '',
      telefono: data.telefono || '',
      privacyAccepted: data.privacyAccepted || false
    };

    const lead = await createLead(leadData);

    return res.status(201).json({
      success: true,
      leadId: lead.id,
      assignedAgentId: lead.assignedAgentId,
      message: 'Lead creato correttamente'
    });
  } catch (error) {
    console.error('Errore nella creazione lead aimedici:', error);
    return res.status(500).json({ error: error.message || 'Errore del server' });
  }
});

// POST /api/forms/aifidi
router.post('/aifidi', async (req, res) => {
  try {
    const data = req.body;
    console.log('Received AIFidi form data:', data); // Add logging to debug

    // Build the lead payload expected by leadService.createLead
    const leadData = {
      source: 'aifidi',
      firstName: data.nome || '',
      lastName: data.cognome || '',
      email: data.mail,
      phone: data.telefono || '',
      message: JSON.stringify(data),
      importoRichiesto: data.importoRichiesto || null,
      financingScope: data.financingScope || null,  // Keep only financingScope
      nomeAzienda: data.nomeAzienda || null,
      cittaSedeLegale: data.cittaSedeLegale || null,
      cittaSedeOperativa: data.cittaSedeOperativa || null,
      privacyAccettata: data.privacyAccepted || false,
      nome: data.nome || '',
      cognome: data.cognome || '',
      mail: data.mail || '',
      telefono: data.telefono || '',
      privacyAccepted: data.privacyAccepted || false,
      partitaIVA: data.partitaIVA || null  // Add the new partitaIVA field
    };

    console.log('Processed lead data:', leadData); // Add logging to debug

    // Create the lead
    const lead = await createLead(leadData);

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      data: lead
    });
  } catch (error) {
    console.error('Error creating AIFidi lead:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating lead',
      error: error.message
    });
  }
});

// POST /api/forms/pensionato
router.post('/pensionato', async (req, res) => {
  try {
    const data = req.body;
    console.log('Received pensionato form data:', data);

    // Build the lead payload expected by leadService.createLead
    const leadData = {
      source: 'aiquinto',
      firstName: data.nome || '',
      lastName: data.cognome || '',
      email: data.mail,
      phone: data.telefono || '',
      message: JSON.stringify(data),
      privacyAccettata: data.privacyAccepted || false,
      
      // Map the fields correctly for pensionato
      importoRichiesto: data.pensionAmount || null,
      stipendioNetto: data.pensioneNetta || null,
      tipologiaDipendente: 'Pensionato',
      provinciaResidenza: data.province || null,
      dataNascita: data.birthDate || null,
      entePensionistico: data.entePensionistico || null,
      tipoPensione: data.pensioneType || null
    };

    console.log('Processed lead data:', leadData);

    // Create the lead using the round robin service
    const lead = await createLead(leadData);

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      data: lead
    });
  } catch (error) {
    console.error('Error creating pensionato lead:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating lead',
      error: error.message
    });
  }
});

export default router; 