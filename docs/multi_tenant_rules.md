# Multi Tenant Rules

## Princípios

- cada liga é um tenant independente
- nenhum dado operacional pode existir sem `league_id`
- toda consulta deve filtrar explicitamente pelo tenant
- autorização sempre considera `user + league + role`

## Regras de isolamento

- `Player`, `Session`, `SessionTeam`, `SessionTeamPlayer`, `Match`, `MatchEvent`, `SessionSubstitution` e `LeaguePlayerStats` pertencem a uma `League`
- leitura e escrita só são permitidas para membros ativos da liga
- membership é controlado por `LeagueMember`
- o mesmo usuário pode participar de várias ligas com papéis distintos

## Papéis

- `OWNER`: dono da liga, gerencia billing e permissões críticas
- `ADMIN`: administra operação da liga
- `REGISTRADOR`: registra sessões, times, partidas e eventos
- `PLAYER`: visualiza e participa conforme regras da liga
