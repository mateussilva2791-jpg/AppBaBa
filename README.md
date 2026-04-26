# Baba SaaS Foundation

Projeto SaaS com frontend em `Next.js`, backend em `FastAPI` e banco `PostgreSQL`.

## Estrutura

- `frontend/`: aplicacao Next.js
- `backend/`: API FastAPI + Alembic
- `deploy/`: configuracao de proxy e artefatos de producao
- `scripts/production/`: scripts operacionais de deploy
- `docs/`: documentacao complementar

## Desenvolvimento local

### Banco

```bash
docker compose up -d
```

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -e .
copy .env.example .env
alembic upgrade head
python -m app.main
```

Backend em `http://127.0.0.1:8001` quando `API_PORT=8001`.

### Frontend

```bash
cd frontend
copy .env.local.example .env.local
npm install
npm run dev -- --hostname 127.0.0.1 --port 3001
```

Frontend em `http://127.0.0.1:3001`.

## Producao

Os arquivos principais de deploy ja estao incluidos:

- `backend/Dockerfile`
- `frontend/Dockerfile`
- `docker-compose.prod.yml`
- `deploy/nginx/default.conf`
- `.env.production.example`
- `.github/workflows/production.yml`

Guia completo:

- [docs/deploy-production.md](docs/deploy-production.md)
- [docs/deploy-vercel-render.md](docs/deploy-vercel-render.md)
- [docs/render-backend-deploy.md](docs/render-backend-deploy.md)
