# HealthTech Frontend (Next.js)

Panel frontend para la gestión de cumplimiento HIPAA.

## Requisitos

- Node.js 24+
- npm 11+

## Entorno

Crea `frontend/.env` a partir de `frontend/.env.example`.

Clave principal:

- `NEXT_PUBLIC_API_URL`

Valores recomendados:

- Backend local directo: `http://localhost:3001`
- Docker + proxy nginx: `/api`

## Ejecutar en Desarrollo

```bash
cd frontend
npm install
npm run dev
```

Abre: `http://localhost:3000`

## Compilar e Iniciar

```bash
npm run build
npm run start
```

## Notas

- El token de acceso se mantiene en memoria (no en localStorage).
- El flujo de renovación se basa en la cookie `httpOnly` del backend.
- Las rutas autenticadas están protegidas por middleware (`proxy.ts`).
