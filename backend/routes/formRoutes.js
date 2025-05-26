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

      // Persist the full original payload as message for reference / audit
      message: JSON.stringify(data),

      // Detail fields used by AIQuinto in our DB
      importoRichiesto: data.amountRequested || null,
      stipendioNetto: data.netSalary || null,
      tipologiaDipendente: data.depType || 'Dipendente',
      sottotipo: data.secondarySelection || null,
      tipoContratto: data.contractType || null,
      provinciaResidenza: data.province || null,
      employmentDate: data.employmentDate || null,
      numEmployees: data.numEmployees ? parseInt(data.numEmployees) : null,
      birthDate: data.birthDate || null
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

export default router; 