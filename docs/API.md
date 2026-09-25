# SMS SaaS MVP API

Base URL:

    http://localhost:5000

## Auth

### Register

POST `/api/auth/register`

```json
{
  "name": "Mallikarjun",
  "email": "demo@example.com",
  "password": "password123",
  "companyName": "Demo Company"
}
```

### Login

POST `/api/auth/login`

```json
{
  "email": "demo@example.com",
  "password": "password123"
}
```

Returns a JWT.

## API Keys

All `/api/keys` endpoints require:

    Authorization: Bearer JWT

### Create API key

POST `/api/keys`

```json
{
  "name": "Production"
}
```

The raw key is returned once.

## SMS

SMS endpoints use the customer's API key:

    Authorization: Bearer sk_live_xxxxx

### Send SMS

POST `/v1/sms/send`

```json
{
  "to": "919876543210",
  "message": "Your OTP is 123456"
}
```

### Get SMS

GET `/v1/sms/:id`

## Dashboard

JWT required.

GET `/api/dashboard/summary`

GET `/api/dashboard/messages`

## Error model

```json
{
  "error": "Human readable error"
}
```

## Production additions

- Redis/BullMQ
- real SMS transport
- DLT/template/header management
- delivery webhook
- payment gateway
- rate limits
- API usage limits
- audit logs
- encrypted secrets
- monitoring
- automated tests
