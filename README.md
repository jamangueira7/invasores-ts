# Invasores TS

Jogo de nave contra ondas de invasores, com tiros, vidas, pontuação e estrelas piscando. Laboratório do **Use a Cabeça! C#** reescrito em **TypeScript**, com a mesma estrutura do
[corrida-cachorro-ts](https://github.com/jamangueira7/corrida-cachorro-ts): React + Vite, Fastify, Postgres com
Kysely, Vitest e tudo subindo com Docker.

> Status: estrutura pronta; o laboratório segue as semanas do `docs/cronograma.md`.

## Rodar

Pré-requisito: Docker com Compose. Não precisa de Node na máquina.

```bash
docker compose up -d          # ou: make up
```

- App: http://localhost:5175
- API (pelo proxy do Vite): http://localhost:5175/api/health
- Banco: `docker compose exec db psql -U lab`
- Produção (nginx + Node compilado): `make prod` → http://localhost:8080

## Estrutura

```
packages/domain/   classes do livro em TS puro + testes (Vitest)
apps/web/          React + Vite
apps/api/          Fastify + Kysely, migrations em src/migrations
docs/cronograma.md plano dos três laboratórios
```

## Desenvolvimento

```bash
git config core.hooksPath .githooks   # ativa os hooks de commit e push
make check                            # ESLint + tsc + Vitest no container
```

Branches `feature/<nome>`, commits `tipo(escopo): descrição` com até 6 arquivos. Detalhes na skill
`.claude/skills/lab-ts/SKILL.md`.
