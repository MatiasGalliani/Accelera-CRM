const fs = require('fs');
const path = require('path');

// Define the mapping of files to their new locations
const fileMappings = {
    // Aifidi related files
    'remove-aifidi-direct.js': 'src/scripts/aifidi/remove-direct.js',
    'remove-aifidi-source.js': 'src/scripts/aifidi/remove-source.js',
    'verify-aifidi-fix.js': 'src/scripts/aifidi/verify-fix.js',
    'test-fix-aifidi-bug.js': 'src/scripts/aifidi/test-fix.js',
    'fix-aifidi-bug.js': 'src/scripts/aifidi/fix-bug.js',

    // Aimedici related files
    'simple-aimedici-check.js': 'src/scripts/aimedici/simple-check.js',
    'check-aimedici-robin.js': 'src/scripts/aimedici/check-robin.js',
    'direct-add-aimedici-matias.js': 'src/scripts/aimedici/add-direct.js',
    'fix-matias-aimedici.js': 'src/scripts/aimedici/fix.js',
    'check-matias-sync.js': 'src/scripts/aimedici/check-sync.js',
    'check-aimedici-sources.js': 'src/scripts/aimedici/check-sources.js',
    'check-aimedici-agents.js': 'src/scripts/aimedici/check-agents.js',

    // Agentetres related files
    'fix-agentetres-sources-direct.js': 'src/scripts/agentetres/fix-sources-direct.js',
    'fix-agentetres-sources.js': 'src/scripts/agentetres/fix-sources.js',
    'check-fix-success.js': 'src/scripts/agentetres/check-success.js',
    'fix-agentetres-sql.sql': 'src/migrations/agentetres.sql'
};

// Create necessary directories
function createDirectories() {
    const directories = [
        'src/scripts/aifidi',
        'src/scripts/aimedici',
        'src/scripts/agentetres',
        'src/migrations'
    ];

    directories.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

// Move files to their new locations
function moveFiles() {
    Object.entries(fileMappings).forEach(([oldPath, newPath]) => {
        if (fs.existsSync(oldPath)) {
            // Create directory if it doesn't exist
            const dir = path.dirname(newPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Move the file
            fs.renameSync(oldPath, newPath);
            console.log(`Moved ${oldPath} to ${newPath}`);
        } else {
            console.log(`Warning: ${oldPath} not found`);
        }
    });
}

// Main execution
try {
    console.log('Creating directories...');
    createDirectories();
    
    console.log('Moving files...');
    moveFiles();
    
    console.log('Migration completed successfully!');
} catch (error) {
    console.error('Error during migration:', error);
} 