# Setup Guide for Lead Management System

This guide will help you get the system up and running properly.

## Prerequisites
- Node.js (v14 or newer)
- PostgreSQL installed and running
- Firebase account with Authentication and Firestore enabled

## Step 1: Environment Configuration

1. Create a `.env` file in the `backend` directory with the following information (replace with your actual values):

```
# Firebase Admin SDK
FIREBASE_PROJECT_ID=app-documenti
FIREBASE_CLIENT_EMAIL=[Your Firebase admin client email]
FIREBASE_PRIVATE_KEY="[Your Firebase private key with newlines as \n]"

# PostgreSQL Database
DB_NAME=case_management
DB_USER=postgres
DB_PASSWORD=[Your PostgreSQL password]
DB_HOST=localhost
DB_PORT=5432

# Webhook API
WEBHOOK_API_KEY=dev-api-key-123

# Server Config
PORT=3000
NODE_ENV=development
```

## Step 2: Database Setup

1. Create a PostgreSQL database named `case_management`:
   ```
   createdb case_management
   ```

2. Initialize the database tables:
   ```
   cd backend
   npm install
   npm run init-db
   ```

## Step 3: Frontend Setup

1. Install frontend dependencies:
   ```
   cd frontend
   npm install
   ```

## Step 4: Run the Application

1. Start the backend server:
   ```
   cd backend
   npm run dev
   ```

2. Start the frontend development server:
   ```
   cd frontend
   npm run dev
   ```

## Step 5: Create an Admin User

1. Access the front-end login screen
2. Login with the default admin email:
   - Email: admin@creditplan.it
   - Password: [Set this up in Firebase Authentication]

## Troubleshooting

### Database Connection Issues
- Make sure PostgreSQL is running
- Verify your database credentials in the `.env` file
- Check that the database `case_management` exists

### API Connection Issues
- Ensure the backend is running on port 3000
- Check the Vite proxy configuration in `frontend/vite.config.js`
- Look for CORS errors in the console

### Authentication Issues
- Verify that your Firebase configuration is correct
- Make sure the private key is properly formatted with newlines
- Ensure the admin email exists in Firebase Authentication

### Firebase Issues
- Make sure your Firebase project has Authentication and Firestore enabled
- Verify that the service account has proper permissions 