# HealthTech Backend (NestJS + Prisma)

Backend API for the HIPAA compliance demo platform.

## Requirements

- Node.js 22+
- npm 10+
- Docker Desktop (for full stack)

## Environment

Create `backend/.env` from `backend/.env.example` and fill real secrets.

Required keys:

- `DATABASE_URL`
- `JWT_SECRET`
- `PHI_ENCRYPTION_KEY` (64 hex chars)
- `PASSWORD_EXPIRY_DAYS`
- `SESSION_TIMEOUT_MINUTES`

## Run Locally (without Docker)

```bash
cd backend
npm install
npm run start:dev
```

API default URL: `http://localhost:3001`

Swagger in dev: `http://localhost:3001/api/docs`

## Run Full Stack with Docker Compose

From `backend/`:

```bash
docker compose up --build
```

Services:

- `http://localhost` -> Nginx (frontend + `/api` proxy)
- `http://localhost:3001` -> Backend direct
- `http://localhost:3000` -> Frontend direct
- `http://localhost:3002` -> Grafana
- `http://localhost:3100` -> Loki

Stop:

```bash
docker compose down
```

## Scripts

```bash
npm run start:dev
npm run build
npm run start:prod
npm run lint
npm run test
npm run test:e2e
```

## Notes

- Audit logging is enabled globally via interceptor.
- Refresh token is stored in `httpOnly` cookie.
- PHI fields are encrypted at application level before persistence.
