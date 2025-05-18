import fs from 'fs';
import path from 'path';

// Ruta a los modelos que necesitan ser corregidos
const modelsPath = path.join(process.cwd(), 'models');

// Función para modificar un archivo modelo
function fixModelFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`El archivo ${filePath} no existe.`);
      return false;
    }
    
    // Leer el contenido del archivo
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Verificar si el modelo ya está corregido
    if (content.includes('createdAt: \'created_at\'') || content.includes('updatedAt: \'updated_at\'')) {
      console.log(`El archivo ${filePath} ya está corregido.`);
      return false;
    }
    
    // Actualizar las definiciones de timestamps
    let updatedContent;
    
    if (content.includes('timestamps: true')) {
      // Si el modelo ya tiene definición de timestamps, actualizarla
      updatedContent = content.replace(
        /timestamps: true(,?\s*)/g,
        'timestamps: true,\n  createdAt: \'created_at\',\n  updatedAt: \'updated_at\'$1'
      );
    } else {
      // Si el modelo no tiene definición de timestamps, agregarla al final
      updatedContent = content.replace(
        /\}\);/,
        '}, {\n  timestamps: true,\n  createdAt: \'created_at\',\n  updatedAt: \'updated_at\'\n});'
      );
    }
    
    // Guardar el contenido modificado
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`✅ Modelo ${path.basename(filePath)} corregido exitosamente.`);
    return true;
  } catch (error) {
    console.error(`Error al corregir el archivo ${filePath}:`, error);
    return false;
  }
}

// Función para corregir los modelos principales (Lead, LeadNote, etc.)
function fixLeadModels() {
  const modelsToFix = [
    path.join(modelsPath, 'Lead.js'),
    path.join(modelsPath, 'LeadDetail.js'),
    path.join(modelsPath, 'LeadNote.js'),
    path.join(modelsPath, 'LeadStatusHistory.js'),
    path.join(modelsPath, 'Agent.js'),
    path.join(modelsPath, 'AgentLeadSource.js')
  ];
  
  console.log('Corrigiendo modelos de Sequelize...');
  
  let fixedCount = 0;
  
  modelsToFix.forEach(modelPath => {
    if (fixModelFile(modelPath)) {
      fixedCount++;
    }
  });
  
  if (fixedCount > 0) {
    console.log(`\n✅ Corregidos ${fixedCount} modelos. Es necesario reiniciar el servidor para aplicar los cambios.`);
  } else {
    console.log('\nTodos los modelos ya estaban correctamente configurados o no se pudieron corregir.');
  }
}

// Ejecutar la corrección
fixLeadModels(); 