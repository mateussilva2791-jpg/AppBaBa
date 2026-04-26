# Deploy em producao

Este projeto esta preparado para rodar em producao com `Next.js`, `FastAPI`, `PostgreSQL`, `Nginx` e `Docker Compose`. O setup suporta tanto banco hospedado externamente quanto um Postgres local em container.

## O que foi preparado

- backend com start de producao por variaveis de ambiente
- healthchecks de liveness e readiness
- frontend com build `standalone` e suporte a API publica ou proxy em `/api`
- `Dockerfile` para backend e frontend
- `docker-compose.prod.yml` com `restart: unless-stopped`
- proxy reverso Nginx com rotas para frontend, API e WebSocket
- scripts de start, stop, deploy e migrations
- workflow inicial de CI/CD no GitHub Actions

## Arquivos principais

- `docker-compose.prod.yml`
- `.env.production.example`
- `deploy/nginx/default.conf`
- `scripts/production/start.sh`
- `scripts/production/deploy.sh`
- `scripts/production/run-migrations.sh`
- `.github/workflows/production.yml`

## Variaveis que voce precisa preencher

Copie o exemplo:

```bash
cp .env.production.example .env.production
```

Preencha pelo menos:

- `APP_URL`: URL publica do sistema, como `https://baba.seudominio.com`
- `DATABASE_URL`: conexao do PostgreSQL em producao
- `POSTGRES_PASSWORD`: so se voce for usar o perfil `local-db`
- `ALLOWED_HOSTS`: dominios aceitos pelo backend
- `CORS_ALLOWED_ORIGINS`: dominios autorizados para CORS

## Deploy em VPS

### 1. Preparar o servidor

Instale Docker e Docker Compose plugin na VPS. Depois clone o repositório:

```bash
git clone <SEU_REPOSITORIO> baba
cd baba
cp .env.production.example .env.production
```

### 2. Ajustar o ambiente

Edite `.env.production` com sua URL publica e o banco de producao.

Se voce for usar um Postgres externo, apenas ajuste `DATABASE_URL`.

Se voce quiser um Postgres local via Docker, use:

```bash
DATABASE_URL="postgresql+psycopg://postgres:SUASENHA@postgres:5432/baba_saas"
```

e suba o compose com o perfil `local-db`.

### 3. Subir a aplicacao

Sem Postgres local:

```bash
bash ./scripts/production/start.sh
bash ./scripts/production/run-migrations.sh
```

Com Postgres local:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml --profile local-db up -d --build
bash ./scripts/production/run-migrations.sh
```

### 4. Validar a stack

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
curl http://127.0.0.1/health/live
curl http://127.0.0.1/health/ready
```

## Deploy de atualizacao

Na VPS:

```bash
git pull
bash ./scripts/production/deploy.sh
```

Esse script:

- rebuilda as imagens
- sobe os containers em background
- roda `alembic upgrade head`
- mostra o estado final do compose

## HTTPS

O `Nginx` ja esta pronto para trabalhar atras de um terminador TLS, balanceador ou proxy externo. Voce pode:

- terminar HTTPS em Cloudflare, Nginx Proxy Manager, Traefik ou load balancer do provedor
- ou adaptar esse `default.conf` para um bloco `server` com `listen 443 ssl`

Os headers `X-Forwarded-*`, `Upgrade` e `Connection` ja estao configurados para requests normais e WebSockets.

## GitHub Actions

O workflow `.github/workflows/production.yml` faz:

- validacao do backend
- build do frontend
- build das imagens Docker
- deploy remoto opcional por `workflow_dispatch`

Para ativar o deploy remoto, configure estes secrets no GitHub:

- `PRODUCTION_HOST`
- `PRODUCTION_USER`
- `PRODUCTION_PATH`
- `PRODUCTION_SSH_KEY`

No servidor remoto, o repositorio precisa existir no caminho definido por `PRODUCTION_PATH`, com `.env.production` preenchido.

Se o servidor Linux exigir permissao de execucao, rode uma vez:

```bash
chmod +x scripts/production/*.sh
```
