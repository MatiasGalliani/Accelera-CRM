# Lead Form API Documentation

## Overview

This API provides endpoints to receive and process leads from various frontend forms. Leads are stored in a database and assigned to agents using a round-robin system.

## Endpoints

### POST /api/forms/pensionato

Receives leads from the "Pensionato" (Pensioner) form.

**Example Payload:**
```json
{
  "nome": "Mario",
  "cognome": "Rossi",
  "mail": "mario.rossi@example.com",
  "telefono": "123456789",
  "birthDate": "1960-01-01",
  "province": "MI",
  "privacyAccepted": true,
  "pensionAmount": "1500",
  "pensioneNetta": "1000",
  "entePensionistico": "italiana",
  "pensioneType": "Vecchiaia"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Lead creato con successo",
  "leadId": "123"
}
```

### POST /api/forms/dipendente

Receives leads from the "Dipendente" (Employee) form.

**Example Payload:**
```json
{
  "nome": "Luigi",
  "cognome": "Verdi",
  "mail": "luigi.verdi@example.com",
  "telefono": "987654321",
  "birthDate": "1985-05-15",
  "province": "RM",
  "privacyAccepted": true,
  "amountRequested": "10000", 
  "netSalary": "2000",
  "depType": "Privato",
  "secondarySelection": "SPA",
  "contractType": "indeterminato",
  "employmentDate": "01/2020",
  "numEmployees": "10"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Lead creato con successo",
  "leadId": "124"
}
```

## Implementation Details

Both endpoints transform the submitted form data into the format expected by the lead service and create new leads in the database. The leads are then assigned to agents using a round-robin system based on the source.

## CORS Configuration

The API is configured to accept requests from:
- http://localhost:5173
- http://localhost:3000
- https://accelera-crm.vercel.app
- All *.vercel.app domains

## Testing

You can run `node testApi.js` to see detailed information about the API endpoints and example payloads. 