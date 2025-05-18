import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Simula una solicitud POST desde un formulario web de AIQuinto
 * - Esta función simula exactamente cómo llegaría un lead desde el sitio web
 */
async function simulateFormSubmission() {
  try {
    console.log('Simulando envío de formulario desde AIQuinto.it...');
    
    // Datos de prueba que simulan un envío real desde el formulario web
    // Estos campos deben coincidir exactamente con los nombres esperados en el API
    const formData = {
      firstName: 'Franco',
      lastName: 'Verdi',
      email: `test-${Date.now()}@example.com`,
      phone: '3397782456',
      message: 'Cerco un finanziamento per acquistare un\'auto nuova',
      source: 'aiquinto',
      importoRichiesto: '28000',
      stipendioNetto: '2600',
      tipologiaDipendente: 'Pubblico',
      sottotipo: 'Statale',
      tipoContratto: 'Tempo Indeterminato',
      provinciaResidenza: 'Torino',
      privacyAccettata: true,
      // Para el sistema de asignación directa
      agentId: 3  // ID del agente Matias Nahuel Galliani
    };
    
    // URL del endpoint que recibe los leads desde el sitio web
    const url = `${process.env.API_URL || 'http://localhost:3000'}/api/leads/webhook`;
    
    console.log('Enviando datos del formulario con asignación directa a agente ID 3 (Matias Galliani)');
    
    // Usar la clave de API correcta del archivo .env
    const apiKey = process.env.WEBHOOK_API_KEY || 'dev-api-key-123';
    
    // Enviar la solicitud POST con los datos del formulario
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify(formData)
    });
    
    // Procesar la respuesta
    const responseData = await response.json();
    
    if (response.ok) {
      console.log('\n✅ Formulario enviado correctamente');
      console.log('Respuesta del servidor:', responseData);
      
      console.log(`\n✅ Lead creado exitosamente:`);
      console.log(`ID: ${responseData.leadId}`);
      console.log(`Fuente: ${responseData.source}`);
      console.log(`Asignado a agente ID: ${responseData.assignedAgentId}`);
      console.log(`Nombre: Franco Verdi`);
      console.log(`Teléfono: 3397782456`);
      console.log(`Importe solicitado: 28000€`);
      console.log(`Salario neto: 2600€`);
      console.log(`Tipología: Pubblico`);
      console.log(`Subtipo: Statale`);
      console.log(`Tipo de contrato: Tempo Indeterminato`);
      console.log(`Provincia: Torino`);
      console.log(`Privacidad aceptada: Sí`);
      console.log(`Estado: Nuovo`);
    } else {
      console.error('\n❌ Error al enviar el formulario');
      console.error('Código de error:', response.status);
      console.error('Mensaje de error:', responseData.error || 'Desconocido');
    }
  } catch (error) {
    console.error('❌ Error general durante la simulación:', error);
  }
}

// Ejecutar la simulación
simulateFormSubmission(); 