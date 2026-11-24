---
name: "lab-ts"
description: "Convenções dos laboratórios do Use a Cabeça! C# portados para TypeScript (React + Vite, Fastify, Kysely/Postgres, Vitest, Docker). Use sempre que for criar ou alterar código, testes, telas, API, migrations ou Docker neste repositório, ou quando o pedido citar um laboratório (corrida de cães, A Missão, Invasores) ou um capítulo do livro."
---

# Laboratórios do Use a Cabeça! C# em TypeScript

Cada repositório é um laboratório do livro reescrito em TypeScript, com o cronograma em `docs/cronograma.md`.

## Arquitetura (não quebre)

- `packages/domain`: as classes do livro em **TS puro**. Nada de DOM, React, fetch ou banco aqui. O aleatório
  é injetado (`RandomSource`) para os testes controlarem o resultado.
- `apps/web`: React + Vite. A tela só **desenha** o estado do domínio e chama os métodos dele; regra de negócio
  na tela é bug. O hook de ligação (ex.: `useRace`) guarda a instância do domínio num `useRef` e força o render.
- `apps/api`: Fastify + Kysely. Migrations em `src/migrations/index.ts` (aplicadas ao subir). Rotas sob `/api`.
  Valide o corpo com as mesmas regras do domínio (importe as constantes de `@lab/domain`).
- Respeite o capítulo: no Lab 1 os campos são públicos (encapsulamento só no cap. 5); no Lab 2 entram `private`,
  `abstract`, `interface`; no Lab 3 eventos, Canvas e `using`. A tabela "Fundamentos" do cronograma manda.

## Front bonito e fácil

- Visual com tokens em `:root` (`styles.css`), cartões com raio 16px, sombra suave, fonte Outfit.
- Cada elemento do jogo tem cor própria e consistente em toda a tela (pista, botões, histórico).
- Estados sempre visíveis: desabilitado durante a animação, mensagens de recusa em linha (`role="alert"`),
  `aria-live` no resultado, foco visível, `prefers-reduced-motion` e layout que funciona em 375px.

## Comandos (tudo via Docker; não há Node no host)

- `make up` → web em http://localhost:5173; API em /api pelo proxy do Vite; Postgres só na rede interna.
- `make check` → ESLint + tsc + Vitest no container (é o que o pre-push roda).
- `make prod` → build de produção (nginx + Node) em http://localhost:8080.

## Git (os hooks barram o resto)

- Branch `feature/<nome>` (ou fix/refactor/test/style/release); nunca commitar em `main`.
- Título `tipo(escopo): descrição`, mensagem com até 200 caracteres, sem Co-Authored-By.
- No máximo 6 arquivos e 600 linhas por commit: quebre em passos que funcionam sozinhos.
