import express from 'express';
import { Lead, LeadDetail } from '../models/leads-index.js';
import { getAgentByRoundRobin } from '../services/agentService.js';

const router = express.Router();

/**
 * @route   POST /api/forms/pensionato
 * @desc    Submit pensionato form
 * @access  Public
 */
router.post('/pensionato', async (req, res) => {
  try {
    const {
      nome,
      cognome,
      mail,
      telefono,
      birthDate,
      province,
      privacyAccepted,
      pensionAmount,
      pensioneNetta,
      entePensionistico,
      pensioneType,
    } = req.body;

    // Validate required fields
    if (!nome || !cognome || !mail || !telefono || !privacyAccepted) {
      return res.status(400).json({ error: 'Campi obbligatori mancanti' });
    }

    // Get agent using round robin for aiquinto source
    const agent = await getAgentByRoundRobin('aiquinto');

    // Create lead
    const lead = await Lead.create({
      source: 'aiquinto',
      firstName: nome,
      lastName: cognome,
      email: mail,
      phone: telefono,
      status: 'new',
      assignedAgentId: agent.id,
      privacyAccepted
    });

    // Create lead details
    await LeadDetail.create({
      leadId: lead.id,
      requestedAmount: pensionAmount,
      netSalary: pensioneNetta, // Using netSalary field for pension amount
      employeeType: 'Pensionato',
      employmentSubtype: pensioneType,
      birthDate,
      residenceProvince: province,
      entePensionistico
    });

    res.status(201).json({
      success: true,
      message: 'Lead pensionato creato con successo',
      leadId: lead.id
    });

  } catch (error) {
    console.error('Error creating pensionato lead:', error);
    res.status(500).json({ error: error.message || 'Errore del server' });
  }
});

/**
 * @route   POST /api/forms/dipendente
 * @desc    Submit dipendente form
 * @access  Public
 */
router.post('/dipendente', async (req, res) => {
  try {
    const {
      nome,
      cognome,
      mail,
      telefono,
      birthDate,
      province,
      privacyAccepted,
      amountRequested,
      netSalary,
      depType,
      secondarySelection,
      contractType,
      employmentDate,
      numEmployees
    } = req.body;

    // Validate required fields
    if (!nome || !cognome || !mail || !telefono || !privacyAccepted) {
      return res.status(400).json({ error: 'Campi obbligatori mancanti' });
    }

    // Get agent using round robin for aiquinto source
    const agent = await getAgentByRoundRobin('aiquinto');

    // Create lead
    const lead = await Lead.create({
      source: 'aiquinto',
      firstName: nome,
      lastName: cognome,
      email: mail,
      phone: telefono,
      status: 'new',
      assignedAgentId: agent.id,
      privacyAccepted
    });

    // Create lead details
    await LeadDetail.create({
      leadId: lead.id,
      requestedAmount: amountRequested,
      netSalary,
      employeeType: depType,
      employmentSubtype: secondarySelection,
      contractType,
      birthDate,
      residenceProvince: province,
      employmentDate,
      employeeCount: numEmployees
    });

    res.status(201).json({
      success: true,
      message: 'Lead dipendente creato con successo',
      leadId: lead.id
    });

  } catch (error) {
    console.error('Error creating dipendente lead:', error);
    res.status(500).json({ error: error.message || 'Errore del server' });
  }
});

export default router; 