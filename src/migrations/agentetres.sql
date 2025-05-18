-- SQL script to fix lead sources for agentetres@gmail.com
-- This should be run directly in your database management tool (pgAdmin, DBeaver, etc.)

-- 1. Find the agent ID
SELECT id FROM agents WHERE email = 'agentetres@gmail.com';

-- Assuming the ID is stored in a variable @agent_id (replace with actual ID in queries below)

-- 2. Check current sources
SELECT * FROM agent_lead_sources WHERE agent_id = [AGENT_ID];

-- 3. Remove aifidi if present
DELETE FROM agent_lead_sources 
WHERE agent_id = [AGENT_ID] 
AND source = 'aifidi';

-- 4. Make sure aimedici is present
-- First check if it exists
SELECT * FROM agent_lead_sources 
WHERE agent_id = [AGENT_ID] 
AND source = 'aimedici';

-- If no rows returned, add it
INSERT INTO agent_lead_sources (agent_id, source, created_at, updated_at)
SELECT [AGENT_ID], 'aimedici', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM agent_lead_sources 
    WHERE agent_id = [AGENT_ID] AND source = 'aimedici'
);

-- 5. Make sure aiquinto is present
-- First check if it exists
SELECT * FROM agent_lead_sources 
WHERE agent_id = [AGENT_ID] 
AND source = 'aiquinto';

-- If no rows returned, add it
INSERT INTO agent_lead_sources (agent_id, source, created_at, updated_at)
SELECT [AGENT_ID], 'aiquinto', NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM agent_lead_sources 
    WHERE agent_id = [AGENT_ID] AND source = 'aiquinto'
);

-- 6. Verify final state
SELECT * FROM agent_lead_sources
WHERE agent_id = [AGENT_ID]
ORDER BY source; 