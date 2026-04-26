# Deploy com Vercel + Render

Este projeto esta preparado para deploy com:

- frontend em `Vercel`
- backend em `Render`
- banco PostgreSQL hospedado

## Arquivos de apoio

- [frontend/.env.example](/c:/Users/vitor/Desktop/BABA/frontend/.env.example)
- [frontend/.env.local.example](/c:/Users/vitor/Desktop/BABA/frontend/.env.local.example)
- [backend/.env.example](/c:/Users/vitor/Desktop/BABA/backend/.env.example)
- [backend/Dockerfile](/c:/Users/vitor/Desktop/BABA/backend/Dockerfile)
- [render.yaml](/c:/Users/vitor/Desktop/BABA/render.yaml)

## Backend no Render

O backend ja esta pronto para:

- ler `DATABASE_URL`
- ler `PORT`
- subir com `uvicorn` em `0.0.0.0`
- responder `GET /health`
- aceitar CORS do frontend local e do dominio da Vercel

### O que preencher no painel do Render

Crie um Web Service apontando para o repositorio e use a pasta `backend`.

Se for usar o `Dockerfile`, o Render vai detectar isso automaticamente.

Preencha estas variaveis:

- `ENVIRONMENT=production`
- `API_PREFIX=/api`
- `LOG_LEVEL=info`
- `SECRET_KEY=<uma-chave-forte>`
- `DATABASE_URL=<url-do-seu-postgres-hospedado>`
- `FRONTEND_URL=https://seu-frontend.vercel.app`
- `CORS_ALLOWED_ORIGINS=https://seu-frontend.vercel.app`
- `ALLOWED_HOSTS=seu-backend.onrender.com`

Se voce estiver usando dominio customizado no frontend, substitua `https://seu-frontend.vercel.app` pelo dominio final.

### Start command do backend

Se voce optar por runtime sem Docker no Render, use:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

### Health check

Use:

```text
/health
```

## Frontend na Vercel

O frontend ja usa `NEXT_PUBLIC_API_URL` e `NEXT_PUBLIC_API_BASE_URL` pelo arquivo [api.ts](/c:/Users/vitor/Desktop/BABA/frontend/lib/api.ts).

### O que preencher no painel da Vercel

Configure a Root Directory como:

```text
frontend
```

Variavel obrigatoria:

```text
NEXT_PUBLIC_API_URL=https://seu-backend.onrender.com/api
```

Se for usar dominio customizado no backend, use a URL publica final.

### Build do frontend

O build continua sendo o padrao do Next.js:

```bash
npm run build
```

## Banco PostgreSQL hospedado

O backend ja esta preparado para banco externo via `DATABASE_URL`.

Exemplo:

```text
postgresql+psycopg://usuario:senha@host:5432/banco
```

Pode ser banco do Render, Neon, Supabase, Railway ou outro provedor compativel com Postgres.

## Alembic em producao

O Alembic continua funcional porque le `DATABASE_URL` pelos settings.

Para rodar migrations em producao, voce pode:

### Opcao 1. Rodar localmente apontando para o banco hospedado

```bash
cd backend
set DATABASE_URL=postgresql+psycopg://usuario:senha@host:5432/banco
alembic upgrade head
```

### Opcao 2. Rodar no shell do Render

No painel do Render, abra o Shell do service e execute:

```bash
cd /app
alembic upgrade head
```

## Passos finais manuais

### Na Vercel

1. Importar o repositorio.
2. Definir `frontend` como Root Directory.
3. Adicionar `NEXT_PUBLIC_API_URL`.
4. Fazer o primeiro deploy.

### No Render

1. Criar o Web Service do backend.
2. Apontar para a pasta `backend` ou usar o `render.yaml`.
3. Adicionar as variaveis de ambiente.
4. Configurar o health check em `/health`.
5. Fazer o deploy.

### No banco hospedado

1. Criar a instancia Postgres.
2. Copiar a connection string.
3. Salvar em `DATABASE_URL` no Render.
4. Rodar `alembic upgrade head`.

## Validacao depois do deploy

Backend:

```text
https://seu-backend.onrender.com/health
```

Frontend:

```text
https://seu-frontend.vercel.app
```

Se o frontend abrir e o backend responder no healthcheck, a base do deploy esta pronta.
