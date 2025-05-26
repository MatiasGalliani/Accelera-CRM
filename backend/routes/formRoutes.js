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
    console.log('📥 /api/forms/dipendente payload:', JSON.stringify(data, null, 2));

    // Build the lead payload expected by leadService.createLead
    const leadData = {
      source: 'aiquinto',
      firstName: data.nome || '',
      lastName: data.cognome || '',
      email: data.mail,
      phone: data.telefono || '',
      message: JSON.stringify(data),

      importoRichiesto: data.amountRequested || null,
      stipendioNetto: data.netSalary || null,
      tipologiaDipendente: data.depType || null,
      sottotipo: data.secondarySelection || null,
      tipoContratto: data.contractType || null,
      provinciaResidenza: data.province || null,
      meseAnnoAssunzione: data.employmentDate || null,
      numeroDipendenti: data.numEmployees ? parseInt(data.numEmployees) : null,
      dataNascita: data.birthDate || null,
      privacyAccettata: data.privacyAccepted || false
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

// POST  /api/forms/pensionato
router.post('/pensionato', async (req, res) => {
  try {
    const data = req.body;

    const leadData = {
      source: 'aiquinto',
      firstName: data.nome || '',
      lastName: data.cognome || '',
      email: data.mail,
      phone: data.telefono || '',
      message: JSON.stringify(data),

      importoRichiesto: data.pensionAmount || null,
      stipendioNetto: data.pensioneNetta || null,
      entePensionistico: data.entePensionistico || null,
      tipologiaPensione: data.pensioneType || null,
      provinciaResidenza: data.province || null,
      dataNascita: data.birthDate || null,
      privacyAccettata: data.privacyAccepted || false,
      tipologiaDipendente: 'Pensionato'
    };


    const lead = await createLead(leadData);

    return res.status(201).json({
      success: true,
      leadId: lead.id,
      assignedAgentId: lead.assignedAgentId,
      message: 'Lead creato correttamente'
    });
  } catch (error) {
    console.error('Errore nella creazione lead pensionato:', error);
    return res.status(500).json({ error: error.message || 'Errore del server' });
  }
});

export default router; 