# HealthTech Backend (NestJS + Prisma)

API backend para la plataforma demo de cumplimiento HIPAA.

## Requisitos

- Node.js 24+
- npm 11+
- Docker Desktop (para el stack completo)

## Entorno

Crea `backend/.env` a partir de `backend/.env.example` y completa los secretos reales.

Claves requeridas:

- `DATABASE_URL`
- `JWT_SECRET`
- `PHI_ENCRYPTION_KEY` (64 caracteres hexadecimales)
- `PASSWORD_EXPIRY_DAYS`
- `SESSION_TIMEOUT_MINUTES`

## Ejecutar localmente (sin Docker)

```bash
cd backend
npm install
npm run start:dev
```

URL predeterminada de la API: `http://localhost:3001`

Swagger en desarrollo: `http://localhost:3001/api/docs`

## Ejecutar el stack completo con Docker Compose

Desde `backend/`:

```bash
docker compose up --build
```

Servicios:

- `http://localhost` -> Nginx (frontend + proxy de `/api`)
- `http://localhost:3001` -> Backend directo
- `http://localhost:3000` -> Frontend directo
- `http://localhost:3002` -> Grafana
- `http://localhost:3100` -> Loki

Detener:

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

## Notas

- El registro de auditoría está habilitado globalmente mediante un interceptor.
- El refresh token se almacena en una cookie `httpOnly`.
- Los campos PHI se cifran a nivel de aplicación antes de persistirse.
