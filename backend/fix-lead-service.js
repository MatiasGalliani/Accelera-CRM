import fs from 'fs';
import path from 'path';

// Ruta al archivo del servicio de leads
const leadServicePath = path.join(process.cwd(), 'services', 'leadService.js');

// Función para corregir la función getAgentLeads
function fixLeadService() {
  try {
    if (!fs.existsSync(leadServicePath)) {
      console.log(`El archivo ${leadServicePath} no existe.`);
      return;
    }
    
    console.log(`Corrigiendo servicio de leads en ${leadServicePath}...`);
    
    // Leer el contenido del archivo
    const content = fs.readFileSync(leadServicePath, 'utf8');
    
    // Buscar y reemplazar el orden incorrecto en getAgentLeads
    const updatedContent = content.replace(
      /order: \[\['createdAt', 'DESC'\]\]/g,
      "order: [['created_at', 'DESC']]"
    ).replace(
      /order: \[\['created_at', 'DESC'\]\]\s*}/g,
      "order: [['created_at', 'DESC']]}"
    );
    
    // Si no hay cambios, no hace falta actualizar el archivo
    if (content === updatedContent) {
      console.log('No se encontraron problemas que corregir en el servicio de leads.');
      return;
    }
    
    // Guardar el contenido modificado
    fs.writeFileSync(leadServicePath, updatedContent, 'utf8');
    console.log('✅ Servicio de leads corregido exitosamente.');
    console.log('Es necesario reiniciar el servidor para aplicar los cambios.');
  } catch (error) {
    console.error('Error al corregir el servicio de leads:', error);
  }
}

// Ejecutar la corrección
fixLeadService(); 