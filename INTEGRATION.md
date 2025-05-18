# CRM Integration Guide

This document outlines how the external form processing system integrates with the CRM lead management system.

## Overview

The integration allows leads from external forms to be sent directly to the CRM, where they are assigned to agents based on their source permissions using a round-robin distribution algorithm.

## Components

1. **External Form Backend**: Collects form data and forwards it to the CRM
2. **CRM System**: Receives leads and assigns them to agents based on permissions

## Integration Flow

1. External form collects user data
2. External backend authenticates with Firebase 
3. External backend retrieves allowed agents for the specified source from CRM
4. External backend selects an agent using round-robin algorithm
5. Lead data is sent to CRM webhook with the assigned agent ID
6. CRM creates the lead record and associates it with the agent
7. Notification emails are sent to both the agent and the client

## Configuration

### Environment Variables for External Form Backend

```
# CRM Integration
CRM_BASE_URL=https://your-crm-domain.com
CRM_WEBHOOK_URL=/api/leads/webhook
CRM_API_KEY=your-webhook-api-key

# Firebase Authentication
FIREBASE_API_KEY=your-firebase-api-key
FIREBASE_AUTH_EMAIL=service-account@example.com
FIREBASE_AUTH_PASSWORD=secure-password

# Email Service
RESEND_API_KEY=your-resend-api-key
```

### Environment Variables for CRM

```
# Webhook Authentication
WEBHOOK_API_KEY=your-webhook-api-key

# Firebase Admin
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour Firebase Private Key\n-----END PRIVATE KEY-----\n"
```

## API Endpoints

### CRM Endpoints

- `GET /api/leads/allowed-sources?source={source}`: Get agents allowed for a specific source
- `POST /api/leads/webhook`: Webhook to receive lead data

### Authentication

The external system authenticates using Firebase Authentication to get a token, then includes it in API requests to the CRM:

```javascript
// Request headers
{
  'Authorization': `Bearer ${firebaseToken}`,
  'Content-Type': 'application/json'
}
```

## Data Format

When sending data to the CRM webhook, use this format:

```json
{
  "source": "aiquinto|aimedici|aifidi",
  "firstName": "Customer First Name",
  "lastName": "Customer Last Name",
  "email": "customer@example.com",
  "phone": "1234567890",
  "agentId": 123,
  "additionalFields": {
    "field1": "value1",
    "field2": "value2"
  }
}
```

## Troubleshooting

- Ensure Firebase authentication is properly configured
- Verify that agents have appropriate source permissions in the CRM
- Check API key configuration for webhook authentication
- Verify network connectivity between the form backend and CRM 