/**
 * Script to directly execute SQL in terminal to fix agentetres@gmail.com sources
 */

console.log(`
To fix the lead sources for agentetres@gmail.com, run the following commands in your database:

1. First, find the agent ID:
   SELECT id FROM agents WHERE email = 'agentetres@gmail.com';

2. Then, using that ID, remove the aifidi source (if present):
   DELETE FROM agent_lead_sources 
   WHERE agent_id = [AGENT_ID] AND source = 'aifidi';

3. Check if aimedici source exists:
   SELECT * FROM agent_lead_sources 
   WHERE agent_id = [AGENT_ID] AND source = 'aimedici';

4. If aimedici doesn't exist, add it:
   INSERT INTO agent_lead_sources (agent_id, source, created_at, updated_at)
   VALUES ([AGENT_ID], 'aimedici', NOW(), NOW());

5. Check if aiquinto source exists:
   SELECT * FROM agent_lead_sources 
   WHERE agent_id = [AGENT_ID] AND source = 'aiquinto';

6. If aiquinto doesn't exist, add it:
   INSERT INTO agent_lead_sources (agent_id, source, created_at, updated_at)
   VALUES ([AGENT_ID], 'aiquinto', NOW(), NOW());

7. Verify the final state:
   SELECT source FROM agent_lead_sources
   WHERE agent_id = [AGENT_ID]
   ORDER BY source;
   
Replace [AGENT_ID] with the actual ID of agentetres@gmail.com from step 1.
`);

console.log(`
IMPORTANT NOTES:
1. Our fix to the syncService.js file prevents FUTURE agents from getting aifidi automatically
2. This is a separate issue from the current incorrect sources for agentetres@gmail.com
3. The database credentials in our scripts might not be correct, so you need to run the commands directly
`); 