# Maschera Project

This project contains various maintenance and utility scripts for managing different aspects of the system.

## Project Structure

```
src/
├── scripts/
│   ├── aimedici/     # Aimedici-related scripts
│   ├── agentetres/   # Agentetres-related scripts
│   ├── aifidi/       # Aifidi-related scripts
│   └── migration.js  # File organization script
├── utils/
│   └── database.js   # Database utility functions
└── migrations/       # Database migration files
```

## Available Scripts

### Aimedici Scripts
- `npm run aimedici:check` - Check Aimedici sources
- `npm run aimedici:check-agents` - Check Aimedici agents
- `npm run aimedici:add` - Add Aimedici directly
- `npm run aimedici:fix` - Fix Aimedici issues
- `npm run aimedici:check-sync` - Check Aimedici sync status

### Agentetres Scripts
- `npm run agentetres:fix` - Fix Agentetres sources
- `npm run agentetres:fix-direct` - Fix Agentetres sources directly
- `npm run agentetres:check` - Check fix success

### Aifidi Scripts
- `npm run aifidi:remove` - Remove Aifidi directly
- `npm run aifidi:remove-source` - Remove Aifidi source
- `npm run aifidi:verify` - Verify Aifidi fix
- `npm run aifidi:test` - Test Aifidi fix
- `npm run aifidi:fix` - Fix Aifidi bug

### Database Scripts
- `npm run init-db` - Initialize database
- `npm run init-leads` - Initialize leads tables

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the environment template:
   ```bash
   cp env-config-template.txt .env
   ```

3. Configure your environment variables in `.env`

## Development

- `npm run dev` - Run in development mode with auto-reload
- `npm start` - Run in production mode

## Documentation

- See `SETUP-GUIDE.md` for detailed setup instructions
- See `INTEGRATION.md` for integration documentation 