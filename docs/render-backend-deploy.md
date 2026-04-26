# Backend no Render

Este backend esta pronto para deploy como `Web Service` no Render com `FastAPI`, `PostgreSQL` hospedado e migrations com `Alembic`.

## O que ja esta implementado

- `FastAPI` com start de producao
- leitura de `PORT` no padrao do Render
- rota `GET /health`
- suporte a `DATABASE_URL`
- compatibilidade com URLs `postgres://` e `postgresql://`
- CORS para localhost e dominio do frontend
- logs basicos e tratamento padrao de erro
- `Alembic` lendo o banco pela configuracao central
- `requirements.txt` para deploy nativo
- `Dockerfile` para deploy com container

## Arquivos importantes

- [backend/app/main.py](/c:/Users/vitor/Desktop/BABA/backend/app/main.py)
- [backend/app/core/config.py](/c:/Users/vitor/Desktop/BABA/backend/app/core/config.py)
- [backend/alembic/env.py](/c:/Users/vitor/Desktop/BABA/backend/alembic/env.py)
- [backend/requirements.txt](/c:/Users/vitor/Desktop/BABA/backend/requirements.txt)
- [backend/.env.example](/c:/Users/vitor/Desktop/BABA/backend/.env.example)
- [backend/Dockerfile](/c:/Users/vitor/Desktop/BABA/backend/Dockerfile)
- [render.yaml](/c:/Users/vitor/Desktop/BABA/render.yaml)

## Render sem Docker

Se voce quiser usar o deploy nativo do Render:

- Root Directory: `backend`
- Build Command:

```bash
pip install -r requirements.txt
```

- Start Command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

- Health Check Path:

```text
/health
```

## Render com Docker

Se preferir usar container:

- Root Directory: repositorio
- Dockerfile Path: `backend/Dockerfile`

O `Dockerfile` ja sobe com:

```bash
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

## Variaveis de ambiente

Configure no Render:

- `DATABASE_URL`
- `SECRET_KEY`
- `ENV=production`
- `LOG_LEVEL=info`
- `FRONTEND_URL=https://seu-frontend.vercel.app`
- `CORS_ORIGINS=https://seu-frontend.vercel.app`
- `ALLOWED_HOSTS=seu-backend.onrender.com`

Em desenvolvimento local, localhost `3000` e `3001` ja sao aceitos automaticamente.

## Banco PostgreSQL

Use a connection string do banco hospedado em:

```text
DATABASE_URL
```

Exemplos aceitos:

```text
postgres://user:pass@host:5432/dbname
```

```text
postgresql://user:pass@host:5432/dbname
```

```text
postgresql+psycopg://user:pass@host:5432/dbname
```

O backend normaliza isso automaticamente para o driver usado pelo SQLAlchemy.

## Alembic em producao

O `Alembic` continua funcional porque usa a configuracao central de `DATABASE_URL`.

Para rodar migrations em producao:

### No shell do Render

```bash
cd /app
alembic upgrade head
```

### Localmente apontando para o banco remoto

```bash
cd backend
set DATABASE_URL=postgresql+psycopg://user:pass@host:5432/dbname
alembic upgrade head
```

## Passo a passo final

1. Subir o repositorio no GitHub.
2. Criar um `Web Service` no Render.
3. Definir `backend` como Root Directory se usar deploy nativo.
4. Preencher as variaveis de ambiente.
5. Configurar `/health` como health check.
6. Fazer o deploy.
7. Rodar `alembic upgrade head`.

## Validacao

Depois do deploy, valide:

```text
https://seu-backend.onrender.com/health
```

Se responder com status `ok` ou `degraded` e JSON da aplicacao, o backend subiu corretamente.
