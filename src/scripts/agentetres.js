const { Pool } = require('pg');
const pool = new Pool();

// Fix agentetres sources
async function fixAgentetresSources() {
    try {
        const result = await pool.query(`
            UPDATE agentetres_sources 
            SET status = 'active' 
            WHERE status = 'pending'
        `);
        return result.rowCount;
    } catch (error) {
        console.error('Error fixing agentetres sources:', error);
        throw error;
    }
}

// Fix agentetres sources directly
async function fixAgentetresSourcesDirect() {
    try {
        const result = await pool.query(`
            UPDATE agentetres_sources 
            SET status = 'active', 
                updated_at = NOW() 
            WHERE status = 'pending'
        `);
        return result.rowCount;
    } catch (error) {
        console.error('Error fixing agentetres sources directly:', error);
        throw error;
    }
}

// Check fix success
async function checkFixSuccess() {
    try {
        const result = await pool.query(`
            SELECT COUNT(*) as pending_count 
            FROM agentetres_sources 
            WHERE status = 'pending'
        `);
        return result.rows[0].pending_count === 0;
    } catch (error) {
        console.error('Error checking fix success:', error);
        throw error;
    }
}

module.exports = {
    fixAgentetresSources,
    fixAgentetresSourcesDirect,
    checkFixSuccess
}; 