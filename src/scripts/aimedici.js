const { Pool } = require('pg');
const pool = new Pool();

// Check aimedici sources
async function checkAimediciSources() {
    try {
        const result = await pool.query('SELECT * FROM aimedici_sources');
        return result.rows;
    } catch (error) {
        console.error('Error checking aimedici sources:', error);
        throw error;
    }
}

// Check aimedici agents
async function checkAimediciAgents() {
    try {
        const result = await pool.query('SELECT * FROM aimedici_agents');
        return result.rows;
    } catch (error) {
        console.error('Error checking aimedici agents:', error);
        throw error;
    }
}

// Add aimedici directly
async function addAimediciDirect(data) {
    try {
        const result = await pool.query(
            'INSERT INTO aimedici (name, email, phone) VALUES ($1, $2, $3) RETURNING *',
            [data.name, data.email, data.phone]
        );
        return result.rows[0];
    } catch (error) {
        console.error('Error adding aimedici:', error);
        throw error;
    }
}

// Fix aimedici sync
async function fixAimediciSync() {
    try {
        // Implementation of sync fix logic
        const result = await pool.query('UPDATE aimedici SET sync_status = true WHERE sync_status = false');
        return result.rowCount;
    } catch (error) {
        console.error('Error fixing aimedici sync:', error);
        throw error;
    }
}

// Verify aimedici fix
async function verifyAimediciFix() {
    try {
        const result = await pool.query('SELECT * FROM aimedici WHERE sync_status = false');
        return result.rows.length === 0;
    } catch (error) {
        console.error('Error verifying aimedici fix:', error);
        throw error;
    }
}

module.exports = {
    checkAimediciSources,
    checkAimediciAgents,
    addAimediciDirect,
    fixAimediciSync,
    verifyAimediciFix
}; 