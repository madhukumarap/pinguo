# SMS SaaS MVP

A beginner-friendly SMS API SaaS starter.

## Stack
- Backend: Node.js + Express + PostgreSQL
- Authentication: JWT
- Customer API authentication: API keys (stored hashed)
- SMS queue: simple in-process mock queue for MVP
- Frontend: React + Vite
- SMS delivery: MOCK ONLY in this version

## Important
This MVP does NOT connect to a real SMS network/provider. It creates an SMS record and simulates delivery.
Before production use in India, add the required telecom/DLT/compliance flow and a legitimate SMS transport/SMPP connection.

## Project structure

sms-saas-mvp/
  backend/
    src/
      server.js
      db.js
      middleware/auth.js
      routes/auth.js
      routes/apiKeys.js
      routes/sms.js
      routes/dashboard.js
  database/schema.sql
  frontend/
  docker-compose.yml

## 1. Start PostgreSQL

From the project root:

    docker compose up -d postgres

## 2. Backend

    cd backend
    npm install
    copy .env.example .env

Edit .env if necessary, then:

    npm run dev

Backend:
    http://localhost:5000

Health:
    http://localhost:5000/health

## 3. Frontend

    cd frontend
    npm install
    npm run dev

Frontend:
    http://localhost:5173

## 4. Test the API

Register:

POST http://localhost:5000/api/auth/register

{
  "name": "Mallikarjun",
  "email": "demo@example.com",
  "password": "password123",
  "companyName": "Demo Company"
}

Login:

POST http://localhost:5000/api/auth/login

Use the returned JWT as:

Authorization: Bearer YOUR_JWT

Create an API key:

POST http://localhost:5000/api/keys

Then use the returned API key:

POST http://localhost:5000/v1/sms/send

Authorization: Bearer sk_live_xxxxx

{
  "to": "919876543210",
  "message": "Your OTP is 123456"
}

## 5. MVP flow

Customer -> Login -> Company -> API Key -> Send SMS -> Credit check -> SMS record -> Mock queue -> Delivered

## Production roadmap

1. PostgreSQL migrations
2. Redis + BullMQ
3. Real SMS transport/SMPP integration
4. DLT/header/template management
5. Razorpay subscriptions
6. Webhooks and delivery receipts
7. Rate limiting
8. Audit logs
9. Monitoring
10. AWS deployment
