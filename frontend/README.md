# HealthTech Frontend (Next.js)

Frontend panel for HIPAA compliance management.

## Requirements

- Node.js 22+
- npm 10+

## Environment

Create `frontend/.env` from `frontend/.env.example`.

Main key:

- `NEXT_PUBLIC_API_URL`

Recommended values:

- Local backend direct: `http://localhost:3001`
- Docker + nginx proxy: `/api`

## Run in Development

```bash
cd frontend
npm install
npm run dev
```

Open: `http://localhost:3000`

## Build and Start

```bash
npm run build
npm run start
```

## Notes

- Access token is kept in memory (not localStorage).
- Refresh flow relies on `httpOnly` cookie from backend.
- Authenticated routes are guarded by middleware (`proxy.ts`).
