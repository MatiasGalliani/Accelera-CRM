import fetch from 'node-fetch';
import admin from 'firebase-admin';
import serviceAccount from './app-documenti-firebase-adminsdk-fbsvc-6d34982729.json' assert { type: 'json' };

// Inicializar Firebase Admin si no está inicializado
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

/**
 * Función para obtener un token Firebase para autenticación
 */
async function getFirebaseToken() {
  try {
    // Crear un usuario personalizado para la prueba
    const uid = 'admin-test-user';
    
    // Generar token
    const token = await admin.auth().createCustomToken(uid);
    
    // Intercambiar por un token de ID
    const response = await fetch(
      `https://www.googleapis.com/identitytoolkit/v3/relyingparty/verifyCustomToken?key=${process.env.FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          returnSecureToken: true
        })
      }
    );
    
    const data = await response.json();
    return data.idToken;
  } catch (error) {
    console.error('Error obteniendo token Firebase:', error);
    throw error;
  }
}

/**
 * Función para probar el endpoint de asignación de leads por round robin
 */
async function testEndpoint() {
  try {
    console.log('Probando el endpoint de asignación de leads por round robin...');
    
    // Obtener token para autenticación
    console.log('Obteniendo token de autenticación...');
    const token = await getFirebaseToken();
    console.log('Token obtenido correctamente');
    
    // Datos del lead de prueba
    const leadData = {
      source: 'aiquinto',
      firstName: 'Test',
      lastName: 'Endpoint',
      email: `test-endpoint-${Date.now()}@example.com`,
      phone: '987654321'
    };
    
    console.log('Enviando solicitud al endpoint con los siguientes datos:');
    console.log(leadData);
    
    // Enviar solicitud al endpoint
    const response = await fetch('http://localhost:3000/api/leads/test-roundrobin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(leadData)
    });
    
    // Verificar respuesta
    if (response.ok) {
      const result = await response.json();
      console.log('\nRespuesta exitosa del servidor:');
      console.log(JSON.stringify(result, null, 2));
      console.log('\nPrueba completada exitosamente');
    } else {
      const errorData = await response.json();
      console.error('\nError en la respuesta del servidor:');
      console.error(`Estado: ${response.status}`);
      console.error(errorData);
    }
  } catch (error) {
    console.error('Error durante la prueba:', error);
  }
}

// Ejecutar la prueba
testEndpoint().catch(console.error); 