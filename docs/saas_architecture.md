# SaaS Architecture

## Objetivo

Transformar o App do Baba em uma plataforma SaaS multi-tenant sem remover o MVP original de ligas, jogadores, sessões, geração de times, partidas, eventos e ranking.

## Monorepo

- `backend`: API FastAPI, autenticação, domínio SaaS e billing
- `frontend`: interface Next.js com TypeScript
- `docs`: decisões arquiteturais e regras operacionais

## Backend

- `FastAPI` como camada HTTP
- `SQLAlchemy 2.x` para persistência
- `Alembic` preparado para versionamento de schema
- `PostgreSQL` como banco principal
- JWT stateless para autenticação

## Estratégia multi-tenant

- `League` é a unidade de tenant
- todo dado operacional possui vínculo explícito com `league_id`
- acesso do usuário a um tenant passa por `LeagueMember`
- permissões são avaliadas no contexto da liga, não globalmente

## Domínio principal

- Conta: `User`
- Tenant: `League`, `LeagueMember`
- Operação do MVP: `Player`, `Session`, `SessionTeam`, `SessionTeamPlayer`, `Match`, `MatchEvent`, `SessionSubstitution`, `LeaguePlayerStats`
- Monetização: `SubscriptionPlan`, `Subscription`, `PaymentEvent`
