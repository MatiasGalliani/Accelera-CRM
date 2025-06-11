import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Gets the appropriate sender email based on the lead source
 * @param {string} source - The lead source
 * @returns {string} - The sender email address
 */
function getSenderEmail(source) {
  console.log(`[EmailService] Getting sender email for source: ${source}`);
  let senderEmail;
  
  switch (source.toLowerCase()) {
    case 'aiquinto':
      senderEmail = 'AIQuinto.it <aiquinto@transactional.creditplan.it>';
      break;
    case 'aimedici':
      senderEmail = 'AIMedici.it <aimedici@transactional.creditplan.it>';
      break;
    case 'aifidi':
      senderEmail = 'AIFidi.it <aifidi@transactional.creditplan.it>';
      break;
    default:
      senderEmail = 'Maschera Per Noi <noreply@transactional.creditplan.it>';
  }
  
  console.log(`[EmailService] Selected sender email: ${senderEmail}`);
  return senderEmail;
}

function formatDate(dateString) {
  if (!dateString) return 'Non specificato';
  const date = new Date(dateString);
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Sends a notification email to an agent when a new lead is assigned
 * @param {Object} lead - The lead object
 * @param {Object} agent - The agent object
 * @returns {Promise<Object>} - Result of the email sending
 */
export async function sendLeadNotificationEmail(lead, agent) {
  console.log(`[EmailService] Starting to send lead notification email for lead ID: ${lead.id}`);
  console.log(`[EmailService] Lead source: ${lead.source}, Agent email: ${agent.email}`);
  
  try {
    // Get lead details based on source
    const leadDetails = lead.details || {};
    console.log(`[EmailService] Lead details:`, JSON.stringify(leadDetails, null, 2));
    
    let additionalDetails = '';

    // Add source-specific details
    if (lead.source === 'aiquinto') {
      console.log(`[EmailService] Processing AIQuinto lead with employee type: ${leadDetails.employeeType}`);
      
      if (leadDetails.employeeType === 'Pensionato') {
        console.log(`[EmailService] Generating pensionato email template`);
        additionalDetails = `
          <p>È arrivato un nuovo lead pensionato con i seguenti dettagli:</p>
          <div class="data-item"><span class="label">Nome:</span> ${lead.firstName}</div>
          <div class="data-item"><span class="label">Cognome:</span> ${lead.lastName}</div>
          <div class="data-item"><span class="label">Email:</span> ${lead.email}</div>
          <div class="data-item"><span class="label">Telefono:</span> ${lead.phone || 'Non specificato'}</div>
          <div class="data-item"><span class="label">Importo Pensione:</span> ${leadDetails.pensionAmount || 'Non specificato'}</div>
          <div class="data-item"><span class="label">Pensione Netta:</span> ${leadDetails.netPension || 'Non specificato'}</div>
          <div class="data-item"><span class="label">Ente Pensionistico:</span> ${leadDetails.pensionAuthority || 'Non specificato'}</div>
          <div class="data-item"><span class="label">Tipo di Pensione:</span> ${leadDetails.pensionType || 'Non specificato'}</div>
          <div class="data-item"><span class="label">Data di Nascita:</span> ${formatDate(leadDetails.birthDate)}</div>
          <div class="data-item"><span class="label">Provincia:</span> ${leadDetails.residenceProvince || 'Non specificato'}</div>
        `;
      } else {
        console.log(`[EmailService] Generating dipendente email template`);
        additionalDetails = `
          <p>È arrivato un nuovo lead dipendente con i seguenti dettagli:</p>
          <div class="data-item"><span class="label">Nome:</span> ${lead.firstName}</div>
          <div class="data-item"><span class="label">Cognome:</span> ${lead.lastName}</div>
          <div class="data-item"><span class="label">Email:</span> ${lead.email}</div>
          <div class="data-item"><span class="label">Telefono:</span> ${lead.phone || 'Non specificato'}</div>
          <div class="data-item"><span class="label">Importo Richiesto:</span> ${leadDetails.requestedAmount || 'Non specificato'}</div>
          <div class="data-item"><span class="label">Salario Netto:</span> ${leadDetails.netSalary || 'Non specificato'}</div>
          <div class="data-item"><span class="label">Tipo di Dipendente:</span> ${leadDetails.employeeType || 'Non specificato'}</div>
          <div class="data-item"><span class="label">Tipo di Azienda:</span> ${leadDetails.employmentSubtype || 'Non specificato'}</div>
          <div class="data-item"><span class="label">Tipo di Contratto:</span> ${leadDetails.contractType || 'Non specificato'}</div>
          <div class="data-item"><span class="label">Data di Nascita:</span> ${formatDate(leadDetails.birthDate)}</div>
          <div class="data-item"><span class="label">Provincia:</span> ${leadDetails.residenceProvince || 'Non specificato'}</div>
          <div class="data-item"><span class="label">Data di Assunzione:</span> ${leadDetails.employmentDate || 'Non specificato'}</div>
          <div class="data-item"><span class="label">Numero di Dipendenti:</span> ${leadDetails.numEmployees || 'Non specificato'}</div>
        `;
      }
    } else if (lead.source === 'aimedici') {
      console.log(`[EmailService] Generating AIMedici email template`);
      additionalDetails = `
        <div class="data-item"><span class="label">Nome:</span> ${lead.firstName}</div>
        <div class="data-item"><span class="label">Cognome:</span> ${lead.lastName}</div>
        <div class="data-item"><span class="label">Email:</span> ${lead.email}</div>
        <div class="data-item"><span class="label">Telefono:</span> ${lead.phone || 'Non specificato'}</div>
        <div class="data-item"><span class="label">Scopo del finanziamento:</span> ${leadDetails.financingPurpose || 'Non specificato'}</div>
        <div class="data-item"><span class="label">Importo richiesto:</span> ${leadDetails.requestedAmount || 'Non specificato'}</div>
        <div class="data-item"><span class="label">Città di residenza:</span> ${leadDetails.residenceCity || 'Non specificato'}</div>
        <div class="data-item"><span class="label">Provincia:</span> ${leadDetails.residenceProvince || 'Non specificato'}</div>
      `;
    } else if (lead.source === 'aifidi') {
      console.log(`[EmailService] Generating AIFidi email template`);
      additionalDetails = `
        <div class="data-item"><span class="label">Nome:</span> ${lead.firstName}</div>
        <div class="data-item"><span class="label">Cognome:</span> ${lead.lastName}</div>
        <div class="data-item"><span class="label">Email:</span> ${lead.email}</div>
        <div class="data-item"><span class="label">Telefono:</span> ${lead.phone || 'Non specificato'}</div>
        <div class="data-item"><span class="label">Scopo del finanziamento:</span> ${leadDetails.financingPurpose || 'Non specificato'}</div>
        <div class="data-item"><span class="label">Importo richiesto:</span> ${leadDetails.requestedAmount || 'Non specificato'}</div>
        <div class="data-item"><span class="label">Città di residenza:</span> ${leadDetails.legalCity || 'Non specificato'}</div>
        <div class="data-item"><span class="label">Provincia:</span> ${leadDetails.operationalCity || 'Non specificato'}</div>
      `;
    }

    console.log(`[EmailService] Preparing to send email with Resend`);
    console.log(`[EmailService] From: ${getSenderEmail(lead.source)}`);
    console.log(`[EmailService] To: ${agent.email}`);
    console.log(`[EmailService] Subject: Nuovo Lead Assegnato - ${lead.firstName} ${lead.lastName}`);

    const { data, error } = await resend.emails.send({
      from: getSenderEmail(lead.source),
      to: agent.email,
      subject: `Nuovo Lead Assegnato - ${lead.firstName} ${lead.lastName}`,
      html: `
        <!DOCTYPE html>
        <html lang="it">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Nuovo Lead Assegnato</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              background-color: #f4f4f4; 
              color: #333; 
              margin: 0; 
              padding: 0; 
            }
            .container { 
              max-width: 600px; 
              margin: 20px auto; 
              background: #fff; 
              padding: 20px; 
              border-radius: 8px; 
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .header { 
              background-color: #007bff; 
              color: #fff; 
              padding: 20px; 
              text-align: center; 
              border-radius: 6px 6px 0 0; 
            }
            .logo { 
              max-width: 150px; 
              height: auto; 
              margin-bottom: 10px; 
            }
            .content { 
              padding: 20px; 
            }
            .data-item { 
              margin-bottom: 10px; 
              padding: 8px;
              border-bottom: 1px solid #eee;
            }
            .label { 
              font-weight: bold; 
              color: #007bff;
              display: inline-block;
              width: 200px;
            }
            .footer { 
              margin-top: 20px; 
              font-size: 12px; 
              text-align: center; 
              color: #777; 
              padding: 20px;
              border-top: 1px solid #eee;
            }
            .button {
              display: inline-block;
              padding: 10px 20px;
              background-color: #007bff;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin-top: 20px;
            }
            .button:hover {
              background-color: #0056b3;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Nuovo Lead Assegnato</h2>
            </div>
            <div class="content">
              <p>Ciao ${agent.firstName},</p>
              <p>Hai ricevuto un nuovo lead da ${lead.source}.</p>
              <h3>Dettagli del Lead:</h3>
              ${additionalDetails}
              <div style="text-align: center; margin-top: 30px;">
                <a href="${process.env.DASHBOARD_URL}/leads/${lead.id}" class="button">Gestisci Lead</a>
              </div>
            </div>
            <div class="footer">
              <p>Questo è un messaggio automatico. Non rispondere a questa email.</p>
              <img class="logo" src="https://backend-richiedidiessereconttato-production.up.railway.app/assets/logo_eugenio.png" alt="Maschera Per Noi" style="width: 150px;" />
            </div>
          </div>
        </body>
        </html>
      `
    });

    if (error) {
      console.error('[EmailService] Error sending lead notification email:', error);
      throw error;
    }

    console.log(`[EmailService] Email sent successfully. Response:`, JSON.stringify(data, null, 2));
    return data;
  } catch (error) {
    console.error('[EmailService] Error in sendLeadNotificationEmail:', error);
    console.error('[EmailService] Error stack:', error.stack);
    throw error;
  }
}

export default {
  sendLeadNotificationEmail
}; 