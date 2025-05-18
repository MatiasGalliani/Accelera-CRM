import express from 'express';
import { Resend } from 'resend';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3500;

// Initialize Resend with API Key
const resend = new Resend(process.env.RESEND_API_KEY);

// CRM API configuration
const CRM_WEBHOOK_URL = process.env.CRM_WEBHOOK_URL || '/api/leads/webhook';
const CRM_BASE_URL = process.env.CRM_BASE_URL || 'https://your-crm-base-url.com';
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
const FIREBASE_AUTH_EMAIL = process.env.FIREBASE_AUTH_EMAIL;
const FIREBASE_AUTH_PASSWORD = process.env.FIREBASE_AUTH_PASSWORD;

// Cache token to avoid multiple authentications
let firebaseToken = null;
let tokenExpiry = null;

// Function to authenticate with Firebase
async function getFirebaseToken() {
    try {
        // If we have a valid token, return it
        if (firebaseToken && tokenExpiry && new Date() < tokenExpiry) {
            return firebaseToken;
        }

        // Otherwise, get a new token
        const response = await axios.post(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
            {
                email: FIREBASE_AUTH_EMAIL,
                password: FIREBASE_AUTH_PASSWORD,
                returnSecureToken: true
            }
        );

        firebaseToken = response.data.idToken;
        // Set token expiry (tokens typically last 1 hour)
        const expiresIn = parseInt(response.data.expiresIn);
        tokenExpiry = new Date(new Date().getTime() + expiresIn * 1000);
        
        return firebaseToken;
    } catch (error) {
        console.error('Error authenticating with Firebase:', error.response?.data || error.message);
        throw error;
    }
}

// Function to get agents from CRM based on source
async function getAgentsFromCRM(source) {
    try {
        // Get Firebase token for authentication
        const token = await getFirebaseToken();
        
        // Make request to the CRM API to get allowed agents for the specified source
        const response = await axios.get(`${CRM_BASE_URL}/api/leads/allowed-sources?source=${source}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        // Log the agents retrieved
        console.log(`Retrieved ${response.data.length} agents for source: ${source}`);
        
        return response.data;
    } catch (error) {
        console.error(`Error fetching agents from CRM for source ${source}:`, error.response?.data || error.message);
        return [];
    }
}

// Source-specific round robin indexes
const roundRobinIndexes = {
    'aiquinto': 0,
    'aimedici': 0,
    'aifidi': 0
};

// Helper function to get agent using round robin based on source
async function getAgentByRoundRobin(source) {
    // Get agents for this specific source
    const agents = await getAgentsFromCRM(source);
    
    if (!agents || agents.length === 0) {
        throw new Error(`No agents available from CRM for source: ${source}`);
    }
    
    // Get the current index for this source
    const currentIndex = roundRobinIndexes[source] || 0;
    
    // Get the agent at the current index
    const agent = agents[currentIndex];
    
    // Update index for next request
    roundRobinIndexes[source] = (currentIndex + 1) % agents.length;
    console.log(`Agent selected for ${source}:`, agent.email);
    console.log(`New round-robin index for ${source}:`, roundRobinIndexes[source]);
    
    return agent;
}

// Root endpoint
app.get('/', (req, res) => {
    res.send('API funcionando correctamente');
});

// Load agent info from environment variables for email templates
const agentInfoMapping = {};
if (process.env.AGENT_INFO) {
    process.env.AGENT_INFO.split(',').forEach(pair => {
        // Support both pipe and colon separators for backwards compatibility
        let parts;
        if (pair.includes('|')) {
            parts = pair.split('|').map(s => s.trim());
        } else if (pair.includes(':')) {
            parts = pair.split(':').map(s => s.trim());
            console.log(`Warning: Using colon separator in AGENT_INFO is deprecated. Please use pipe (|) instead.`);
        } else {
            console.error("Invalid format in AGENT_INFO:", pair);
            return;
        }

        if (parts.length === 4) {
            const [email, name, phone, calendly] = parts;
            agentInfoMapping[email] = { name, phone, calendly };
        } else {
            console.error("Incorrect format in AGENT_INFO:", pair);
        }
    });
} else {
    console.warn("AGENT_INFO is not defined in .env");
}

const aimediciAgentInfoMapping = {};
if (process.env.AIMEDICI_AGENT_INFO) {
    process.env.AIMEDICI_AGENT_INFO.split(',').forEach(pair => {
        // Support both pipe and colon separators for backwards compatibility
        let parts;
        if (pair.includes('|')) {
            parts = pair.split('|').map(s => s.trim());
        } else if (pair.includes(':')) {
            parts = pair.split(':').map(s => s.trim());
            console.log(`Warning: Using colon separator in AIMEDICI_AGENT_INFO is deprecated. Please use pipe (|) instead.`);
        } else {
            console.error("Invalid format in AIMEDICI_AGENT_INFO:", pair);
            return;
        }

        if (parts.length === 4) {
            const [email, name, phone, calendly] = parts;
            aimediciAgentInfoMapping[email] = { name, phone, calendly };
        } else {
            console.error("Incorrect format in AIMEDICI_AGENT_INFO:", pair);
        }
    });
} else {
    console.warn("AIMEDICI_AGENT_INFO is not defined in .env");
}

// Helper function to send data to CRM webhook
async function sendToCRM(data) {
    try {
        // Get Firebase token for authentication
        const token = await getFirebaseToken();
        
        const response = await axios.post(`${CRM_BASE_URL}${CRM_WEBHOOK_URL}`, data, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        console.log('Data sent to CRM successfully:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error sending data to CRM:', error.response?.data || error.message);
        throw error;
    }
}

app.post('/manuale_aiquinto', async (req, res) => {
    console.log("=== Starting /manuale_aiquinto processing ===");
    console.log("Data received:", req.body);

    try {
        // Get data from request
        const datos = req.body.datos;
        if (!Array.isArray(datos)) {
            console.error("Error: 'datos' is not an array.");
            return res.status(400).json({ error: 'Data must be an array' });
        }

        // Extract fields from data
        const nome = req.body.nome || (datos.length >= 1 ? datos[0] : 'Non specificato');
        const cognome = req.body.cognome || (datos.length >= 2 ? datos[1] : 'Non specificato');
        const emailField = req.body.email || (datos.length >= 3 ? datos[2] : 'Non specificato');
        const telefono = req.body.telefono || (datos.length >= 4 ? datos[3] : 'Non specificato');
        const clientName = `${nome} ${cognome}`.trim() || 'Cliente';

        // Get agent using round robin from CRM for aiquinto source
        const agent = await getAgentByRoundRobin('aiquinto');
        
        // Format data for CRM webhook
        const crmData = {
            source: 'aiquinto',
            firstName: nome,
            lastName: cognome,
            email: emailField,
            phone: telefono,
            agentId: agent.id
        };

        // Send data to CRM webhook
        await sendToCRM(crmData);
        
        // Prepare email content for agent
        const textBodyAgent =
            `Nuovo Lead di Contatto Manuale
Ciao,
È arrivato un nuovo lead manuale su AIQuinto.it con i seguenti detalles:
Nome: ${nome}
Cognome: ${cognome}
Email: ${emailField}
Telefono: ${telefono}
Saluti,
€ugenio IA`;

        const htmlBodyAgent = `
<html>
  <head>
    <meta charset="UTF-8">
    <style>
      body { font-family: Arial, sans-serif; background-color: #f4f4f4; color: #333; margin: 0; padding: 0; }
      .container { max-width: 600px; margin: 20px auto; background: #fff; padding: 20px; border-radius: 8px; }
      .header { background-color: #007bff; color: #fff; padding: 20px; text-align: center; border-radius: 6px 6px 0 0; }
      .logo { max-width: 150px; height: auto; margin-bottom: 10px; }
      .content { padding: 20px; }
      .data-item { margin-bottom: 10px; }
      .label { font-weight: bold; }
      .footer { margin-top: 20px; font-size: 12px; text-align: center; color: #777; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h2>Nuovo Lead di Contatto Manuale</h2>
      </div>
      <div class="content">
        <p>Ciao,</p>
        <p>È arrivato un nuovo lead manuale con i seguenti detalles:</p>
        <div class="data-item"><span class="label">Nome:</span> ${nome}</div>
        <div class="data-item"><span class="label">Cognome:</span> ${cognome}</div>
        <div class="data-item"><span class="label">Email:</span> ${emailField}</div>
        <div class="data-item"><span class="label">Telefono:</span> ${telefono}</div>
      </div>
      <div class="footer">
        <p>Saluti</p>
        <img class="logo" src="https://i.imgur.com/Wzz0KLR.png" alt="€ugenio IA" style="width: 150px;" />
      </div>
    </div>
  </body>
</html>`;

        const emailDataAgent = {
            from: "€ugenio IA <eugenioia@resend.dev>",
            to: agent.email,
            subject: "Nuovo Lead di Contatto Manuale",
            text: textBodyAgent,
            html: htmlBodyAgent
        };

        console.log("Sending email to agent...");
        await resend.emails.send(emailDataAgent);
        console.log("Email sent successfully to agent:", agent.email);

        // Use agent data directly from CRM for client email
        const agentInfo = {
            name: agent.name,
            phone: agent.phone,
            calendly: agent.calendly
        };
        
        // Prepare email content for client
        const textBodyClient =
            `Hola,
Gracias por enviar tu información. Tu agente asignado es ${agentInfo.name || 'nuestro agente'}.
${agentInfo.phone ? "Puedes contactarlo al " + agentInfo.phone : ""}
Si lo deseas, también puedes agendar una llamada: ${agentInfo.calendly || ""}
Saludos,
AIQuinto`;

        const htmlBodyClient = `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Conosci il tuo agente in Creditplan</title>
</head>
<body style="background-color: #eff6ff; margin: 0; padding: 0;">
  <div style="max-width: 32rem; margin: 0 auto; background: #ffffff; border-radius: 0.5rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden;">
    <!-- Header: imagen con URL absoluto -->
    <div>
      <img src="https://i.imgur.com/1avwDd5.png" alt="Intestazione della Mail" style="width: 100%; display: block;">
    </div>
    <!-- Título -->
    <div style="text-align: center; padding: 1rem 0;">
      <span style="font-size: 2.25rem; font-weight: bold; color: #1e3a8a;">Grazie!</span>
    </div>
    <!-- Contenido Principal -->
    <div style="padding: 1.5rem; color: #4a5568;">
      <!-- Mensaje introductorio -->
      <p style="margin-bottom: 1rem;">Ciao <strong>${clientName},</strong></p>
      <p style="margin-bottom: 1rem;">
        <strong>Prima di tutto,</strong> ti ringraziamo per aver scelto Creditplan per le tue esigenze finanziarie. Siamo lieti di poterti supportare e ci impegniamo a fornirti l'assistenza più adeguata e personalizzata.
      </p>
      <p style="margin-bottom: 1rem;">
        Il nostro sistema ha processato la tua richiesta e, in base alla nostra organizzazione, <strong>ti è stato assegnato un agente dedicato</strong> che si occuperà di fornirti tutte le informazioni necessarie e guidarti nel percorso.
      </p>
      <!-- Información del agente -->
      <p style="margin-bottom: 1rem;">
        Il tuo agente assegnato è <strong>${agentInfo.name || 'il nostro agente'}</strong>.
      </p>
      <p style="margin-bottom: 1rem;">
        Puoi contattarlo direttamente al numero <strong>${agentInfo.phone || ''}</strong> oppure, se preferisci, fissare una chiamata utilizzando el link qui sotto.
      </p>
      <div style="text-align: center;">
        <a href="${agentInfo.calendly || '#'}" 
           style="display: inline-block; padding: 0.5rem 1.5rem; background-color: #1e3a8a; color: #ffffff; font-weight: bold; text-decoration: none; border-radius: 0.75rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          Fissa una chiamata
        </a>
      </div>
      <p style="margin-top: 1.5rem;">
        Siamo certi che il nostro team saprà offrirti la migliore consulenza e supporto. Rimaniamo a tua completa disposizione per qualsiasi ulteriore informazione.
      </p>
      <p style="margin-top: 0.5rem;">
        Cordiali saluti,<br>
        Il team di Creditplan
      </p>
    </div>
    <!-- Pie de Página -->
    <div style="background-color: #eff6ff; padding: 1rem; text-align: center; font-size: 0.875rem; color: #718096; border-top: 1px solid #e2e8f0;">
      &copy; 2025 Creditplan Società di Mediazione Creditizia. Tutti i diritti riservati.<br>
      Via Giacomo Tosi 3, Monza, MB (20900)
    </div>
  </div>
</body>
</html>
`;

        const emailDataClient = {
            from: "AIQuinto <eugenioia@resend.dev>",
            to: emailField,
            subject: "Conoce a tu agente asignado en AIQuinto",
            text: textBodyClient,
            html: htmlBodyClient
        };

        console.log("Sending email to client...");
        await resend.emails.send(emailDataClient);
        console.log("Email sent successfully to client:", emailField);

        res.json({ message: 'Data saved and emails sent successfully' });
    } catch (error) {
        console.error('Error processing request:', error);
        res.status(500).json({ error: 'An error occurred while processing the request' });
    }
});

app.listen(PORT, () => {
    console.log('Server running on port', PORT);
}); 