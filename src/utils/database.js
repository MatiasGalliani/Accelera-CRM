const { Pool } = require('pg');

// Create a connection pool
const pool = new Pool();

// Generic query function
async function query(text, params) {
    try {
        const result = await pool.query(text, params);
        return result;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}

// Transaction wrapper
async function transaction(callback) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

// Health check
async function checkConnection() {
    try {
        const result = await pool.query('SELECT NOW()');
        return result.rows[0].now;
    } catch (error) {
        console.error('Database connection error:', error);
        throw error;
    }
}

module.exports = {
    query,
    transaction,
    checkConnection,
    pool
}; 