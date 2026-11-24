# Cronograma: Laboratórios do Use a Cabeça! C# em TypeScript + Docker

Nov 24, 2026 · @João Mangueira

## Visão geral

O livro tem 3 laboratórios, e o plano cobre os três em 16 semanas (30/11/2026 a 21/03/2027), com cerca de 8 h por semana. Cada laboratório vira um projeto TypeScript que sobe inteiro com `docker compose up` e usa tudo o que o livro ensinou até aquele ponto.

| Laboratório | Pág. do livro (pág. do PDF) | Vem depois de | O que é |
| --- | --- | --- | --- |
| 1 — Um Dia de Corridas | 147 (158) | Cap. 1 a 4 | Simulador de corrida de cães com salão de apostas para 3 apostadores |
| 2 — A Missão | 313 (319) | Cap. 5 a 8 | Jogo de aventura por turnos numa masmorra: 7 níveis, 3 inimigos, armas e poções |
| 3 — Invasores | 583 (594) | Cap. 9 a 15 | Clone de Space Invaders com ondas de inimigos, tiros, vidas, pontuação e estrelas piscando |

Premissas do cronograma:

- Ritmo de 8 h por semana; com 4 h, dobre a duração de cada fase sem mudar a ordem.
- Cada fase começa com uma releitura rápida dos capítulos que o laboratório cobra, refazendo os exercícios em TS.
- O livro usa Windows Forms; no TS, a interface vira página web (DOM no Lab 1 e 2, Canvas no Lab 3) e os dados ficam numa API Node com Postgres.
- As semanas de fim de ano (21/12 e 28/12) estão no plano; se forem folga, empurre tudo duas semanas.

## Fundamentos do livro e o equivalente em TypeScript

Cada conceito de C# tem um correspondente direto em TS ou no ecossistema Node; a coluna "Lab" diz em qual projeto ele passa a ser obrigatório.

| Cap. | Conceito no livro (C#) | Equivalente em TS / Node | Lab |
| --- | --- | --- | --- |
| 1 | App orientado a dados: formulário, banco SQL, data binding, instalador | Página web + API REST + Postgres; "instalador" = imagem Docker | 1 |
| 2 | Namespaces, ponto de entrada, variáveis, operadores, `for`/`while`, `if/else` | Módulos ES (`import/export`), `main.ts`, `let/const`, mesmos laços e condições | 1 |
| 3 | Classes, instâncias, campos, métodos, diagramas de classe, inicializadores de objeto | `class`, `new`, propriedades, métodos, diagrama em Mermaid, objeto literal no construtor | 1 |
| 4 | Tipos de valor, conversões, referências, coleta de lixo, arrays, `this` | `number`/`string`/`boolean`, `Number()`/`parseInt`, referências de objeto, arrays tipados `Greyhound[]` | 1 |
| 5 | Encapsulamento: `private`, propriedades `get/set`, propriedades automáticas, construtor | `private` ou `#campo`, `get`/`set`, *parameter properties* no construtor, `readonly` | 2 |
| 6 | Herança, `override`, `base`, construtor na subclasse | `extends`, `override`, `super()`, `super.metodo()` | 2 |
| 7 | Interfaces, `is`/`as`, coerção, modificadores de acesso, classe e método abstratos, polimorfismo | `interface`, `implements`, *type guards* (`instanceof`, `x is IPotion`), `protected`, `abstract` | 2 |
| 8 | `enum`, `List`, `Dictionary`, `IComparer`, sobrecarga, `Queue`, `Stack` | `enum`, `Array`, `Map`, `sort` com comparador, *overload signatures*, fila e pilha genéricas `Queue<T>`/`Stack<T>` | 2 |
| 9 | Streams, `File`/`Directory`, serialização, binário, hexadecimal, `using` | `node:fs/promises`, streams do Node, `JSON.stringify`, `Buffer`, `toString('hex')` | 3 |
| 10 | Exceções: `try/catch/finally`, exceções próprias, `IDisposable` | `try/catch/finally`, `class GameOverError extends Error`, `using` + `Symbol.dispose` (TS 5.2+) | 3 |
| 11 | Eventos, delegados, callbacks | `EventTarget`/`EventEmitter` tipado, funções como parâmetro | 3 |
| 12 | Timers, sistema por turnos, primeira LINQ | `setInterval`, `requestAnimationFrame`, `filter/map/reduce` | 3 |
| 13 | Controles próprios, GDI+, `Paint`, buffer duplo, impressão | Canvas 2D, Web Components, `OffscreenCanvas` como buffer, `window.print()` | 3 |
| 14 | Finalizadores, `Dispose`, `struct` x classe, pilha x heap, métodos de extensão | `FinalizationRegistry`, objetos imutáveis (`readonly`, `structuredClone`), funções utilitárias ou *module augmentation* | 3 |
| 15 | LINQ: consultas, `group`, `join`, LINQ to SQL | `Object.groupBy`, `filter/map`, *query builder* (Kysely) com `groupBy` e `join` no Postgres | 3 |

O que o livro não cobre mas o projeto exige (Docker, Vite, Vitest) entra na Fase 0 e fica igual nos três laboratórios.

## Base técnica comum

Os três laboratórios usam o mesmo esqueleto: um monorepo com `web` (front), `api` (back), `db` (Postgres) e um pacote `domain` com as classes do livro, sem dependência de framework. Assim o domínio (Greyhound, Player, Invader...) é testado sozinho e a tela só desenha o que ele manda.

| Camada | Tecnologia | Papel |
| --- | --- | --- |
| Linguagem | TypeScript 5.x, `strict: true` | Todo o código |
| Domínio | Pacote `packages/domain`, TS puro | Classes do laboratório, sem DOM nem banco |
| Front | Vite + TS sem framework (DOM no Lab 1 e 2, Canvas no Lab 3) | Equivalente ao formulário WinForms |
| API | Node 22 + Fastify | Persistência, histórico e ranking |
| Banco | Postgres 16 + Kysely (migrations e consultas) | Equivalente ao banco do cap. 1 e à LINQ to SQL do cap. 15 |
| Testes | Vitest | Regras do domínio (apostas, dano, colisão) |
| Execução | Docker Compose | Sobe tudo com um comando |

Estrutura de pastas de cada laboratório:

```
lab-01-corridas/
├─ docker-compose.yml        # web, api, db
├─ docker-compose.prod.yml   # web servido pelo nginx
├─ Makefile                  # make up / down / test / logs
├─ packages/domain/          # classes do livro em TS puro + testes
├─ apps/web/                 # Vite + Dockerfile (dev e build → nginx)
├─ apps/api/                 # Fastify + Dockerfile multi-stage
└─ apps/api/migrations/      # tabelas do Postgres
```

Comportamento esperado do Docker em todos os labs:

- `docker compose up` em modo dev: Vite com *hot reload* na porta 5173, API na 3000, Postgres na 5432 com volume nomeado.
- `docker compose -f docker-compose.prod.yml up --build`: build multi-stage, front estático no nginx, API compilada rodando com `node dist/server.js` em imagem `node:22-alpine` com usuário não-root.
- `healthcheck` no Postgres e `depends_on: condition: service_healthy` na API.
- `.env.example` versionado; `.env` fora do Git.
- `make test` roda o Vitest dentro do container, para garantir que funciona igual em qualquer máquina.

## Fase 0 e Laboratório 1 — Um Dia de Corridas

### Fase 0 — Base e capítulos 1 e 2 (semana de 30/11)

Entrega: um template de monorepo que sobe com Docker e uma "Lista de Contatos" igual à do cap. 1, servindo de ensaio geral.

- [ ] Criar o template (pnpm workspaces, `tsconfig` base estrito, ESLint, Prettier, Vitest)
- [ ] Dockerfiles de `web` e `api` (dev e multi-stage), `docker-compose.yml` com Postgres e healthcheck
- [ ] Cap. 1 em TS: tabela `people`, CRUD na API, formulário na página ligado aos dados
- [ ] Cap. 2 em TS: módulos, `main.ts` como ponto de entrada, laços e `if/else` em pequenos exercícios com teste

### Laboratório 1 (semanas de 07/12, 14/12 e 21/12)

O sistema: três apostadores (João com R$ 50, Beto com R$ 75, Alfredo com R$ 45) apostam em 4 cães que correm em linha reta com passos aleatórios. As regras de negócio do livro são:

![alt text](image.png)

&#91;embedded content: esboço da tela · Lab 1, Um Dia de Corridas\]

Esboço próprio da tela final, não a arte do livro: os 4 cães correm até a linha de chegada e cada apostador vê o próprio saldo e a aposta feita. As telas originais do livro estão nas págs. 164 e 165 do PDF.

- Aposta mínima de R$ 5 e máxima de R$ 15, uma aposta por pessoa por corrida.
- Só aposta quem tem saldo; as apostas fecham quando a corrida começa.
- Dobro ou nada: quem acerta ganha o valor apostado, quem erra perde o valor apostado.
- Nenhum cão tem vantagem; cada corrida é independente.

Classes do livro e como ficam em TS:

| Classe | Responsabilidade | Ponto de atenção em TS |
| --- | --- | --- |
| `Greyhound` | Posição na pista, avançar de 1 a 4 casas, dizer se venceu, voltar à largada | Recebe o elemento da imagem (`HTMLElement`) no lugar do `PictureBox`; o `Random` vira um gerador injetável para dar para testar |
| `Guy` | Nome, saldo, aposta atual, atualizar rótulos, apostar, receber resultado | O livro usa campos públicos de propósito (encapsulamento só vem no cap. 5); mantenha assim |
| `Bet` | Valor, cão escolhido, apostador, descrição em texto, pagamento | `Guy` cria a `Bet` passando `this`, como o livro pede |

Fundamentos obrigatórios: classes e inicializadores (cap. 3), arrays de referências `Greyhound[]` e `Guy[]`, conversão de tipos do valor digitado e `this` (cap. 4), laço de corrida até haver vencedor (cap. 2), dados no Postgres (cap. 1).

Tarefas por semana:

1. Semana de 07/12 — releitura dos cap. 3 e 4; `Greyhound`, `Guy` e `Bet` no pacote `domain` com testes das regras de aposta.
2. Semana de 14/12 — tela: pista com 4 cães, salão de apostas com 3 opções de apostador, valor, número do cão e botão de largar. Animação simples avançando os cães em laço com pausa.
3. Semana de 21/12 — API e banco: tabela `races` com vencedor e data, tabela `bets` com o resultado de cada apostador; tela de histórico. Bloquear nova corrida e novas apostas com os cães em movimento.

Pronto quando:

- [ ] `docker compose up` abre a corrida em `localhost:5173` sem nenhum passo manual
- [ ] Os três apostam, a corrida anima até um vencedor e os saldos mudam pela regra do dobro ou nada
- [ ] Aposta fora de R$ 5 a R$ 15 ou sem saldo é recusada, com teste cobrindo os dois casos
- [ ] O histórico de corridas sobrevive a `docker compose down` e `up` (volume do Postgres)

## Laboratório 2 — A Missão (semanas de 28/12 a 25/01)

O sistema: um jogo de aventura por turnos visto de cima. O jogador anda ou ataca em 4 direções, depois cada inimigo vivo age. São 7 níveis com uma arma ou poção por nível; o jogo acaba quando o jogador limpa o nível 7 ou morre. Os detalhes de cada nível estão na tabela da pág. 325 do PDF.

![alt text](image-1.png)

&#91;embedded content: esboço da tela · Lab 2, A Missão\]

Esboço próprio da tela final: o jogador (J) enfrenta morcego, fantasma e zumbi, pega a arma do nível no chão e escolhe no inventário o que usar. As telas originais do livro estão nas págs. 319 a 321 do PDF.

Regras resumidas do livro:

- Jogador começa com 10 pontos de vida e carrega várias armas, mas usa uma de cada vez.
- Morcego: 6 de vida, metade das vezes vai na direção do jogador e metade aleatório, dano até 2.
- Fantasma: 8 de vida, um terço das vezes vai na direção do jogador e no resto fica parado, dano até 3.
- Zumbi: 10 de vida, o inimigo mais forte (movimento e dano na pág. 329 do PDF).
- Espada: alcance 10, dano 3, tenta a direção escolhida e depois as laterais. Arco: alcance 30, dano 1, só numa direção. Maça: alcance 20, dano 6, gira em círculo.
- Poção azul recupera até 5 e a vermelha até 10; são tratadas como armas e somem do inventário depois de usadas.

Arquitetura do livro e como fica em TS:

| Elemento | Papel | Em TS |
| --- | --- | --- |
| `Game` | Único objeto que a tela conhece; guarda jogador, inimigos, arma da sala, nível e limites | Classe com estado `private` e só *getters* públicos |
| `Mover` (abstrata) | Posição, mover-se dentro dos limites, saber se algo está perto | `abstract class` com campos `protected` |
| `Player` | Vida, inventário, equipar, atacar, receber dano | `extends Mover`; inventário exposto como `readonly string[]` |
| `Enemy` (abstrata) e `Bat`, `Ghost`, `Ghoul` | Vida, morto ou vivo, movimento próprio de cada um | `abstract move()` + `override` nas subclasses |
| `Weapon` (abstrata) e `Sword`, `Bow`, `Mace` | Nome, foi pega, ataque com alcance e padrão próprios | `abstract get name()` e `abstract attack()` |
| `IPotion`, `BluePotion`, `RedPotion` | Poções são armas com a propriedade extra "usada" | `interface IPotion` + *type guard* `isPotion(w): w is IPotion` no lugar do `is` do C# |
| `Direction` | Cima, baixo, esquerda, direita | `enum Direction` |

Fundamentos obrigatórios: encapsulamento com `private`, `get` e construtores (cap. 5), herança com `super` e `override` (cap. 6), interface, classes abstratas, `protected` e polimorfismo (cap. 7), `enum`, `Map` e ordenação com comparador (cap. 8). Uso extra de coleções sugerido: `Queue<T>` para a ordem dos turnos e ranking ordenado por nível e vida restante.

Tarefas por semana:

1. Semana de 28/12 — releitura dos cap. 5 e 6; **refatorar o Lab 1** com encapsulamento (campos privados, `get`, construtores), mostrando o antes e depois no Git.
2. Semana de 04/01 — releitura dos cap. 7 e 8; `Mover`, `Player`, `Enemy` e subclasses no `domain`, com testes de movimento nos limites e de dano.
3. Semana de 11/01 — armas, poções, `IPotion` e o método que monta cada um dos 7 níveis; testes do alcance de cada arma.
4. Semana de 18/01 — tela: masmorra com fundo, ícones posicionados por coordenada, inventário clicável com destaque da arma equipada, botões de andar e atacar, pontos de vida de todos.
5. Semana de 25/01 — API e banco: tabela `runs` (nome, nível alcançado, vida final, data) e ranking ordenado; tela de fim de jogo com "jogar de novo".

Pronto quando:

- [ ] A tela só conversa com `Game`; nenhum outro objeto do domínio é importado no front
- [ ] Nenhum campo de estado do domínio é público para escrita
- [ ] Os 7 níveis jogáveis do início ao fim, com vitória e derrota
- [ ] Testes cobrem o movimento de cada inimigo e o ataque de cada arma, com aleatório controlado
- [ ] Ranking persistido no Postgres e exibido ordenado

## Laboratório 3 — Invasores (semanas de 01/02 a 15/03)

O sistema: uma homenagem ao Space Invaders. A nave do jogador anda na base da tela e atira; ondas de invasores descem em formação e atiram de volta; há vidas, pontuação e um fundo de 300 estrelas em que algumas acendem e apagam a cada quadro. Neste PDF, as páginas com a especificação completa (584 a 596) estão em branco; só dá para ler a parte das estrelas (pág. 597) e a lista de melhorias (pág. 598). As regras abaixo são a interpretação clássica do jogo e devem ser conferidas num exemplar íntegro.

![alt text](image-2.png)

&#91;embedded content: esboço da tela · Lab 3, Invasores\]

Esboço próprio da tela final: placar no topo, formação com três tipos de invasor, tiros dos dois lados e a nave do jogador na base. Neste PDF, as páginas com as telas do Lab 3 estão corrompidas.

Modelo de classes proposto:

| Elemento | Papel | Fundamento que exercita |
| --- | --- | --- |
| `Game` | Ondas, vidas, pontos, colisões, fim de jogo | Eventos publicados para a tela (cap. 11) |
| `PlayerShip` | Movimento lateral, tiro, morte e renascimento | Herança e encapsulamento (cap. 5 e 6) |
| `Invader` e tipos (pontuações diferentes por tipo) | Formação, descida, tiro aleatório | Polimorfismo e `enum` do tipo (cap. 7 e 8) |
| `Shot` | Posição, direção, sai da tela | Objeto de valor imutável (cap. 14) |
| `Star` e `Stars` | Ponto e cor de cada estrela; 300 delas, algumas trocando a cada quadro | `Star` como objeto só de dados, no lugar da `struct` do livro (cap. 14) |
| `Renderer` | Desenha tudo no Canvas com buffer | Gráficos, `Paint` e buffer duplo (cap. 13) |
| `GameLoop` | Um relógio para animação e outro para a lógica | Timers e delegados (cap. 11 e 12) |

Como cada capítulo de 9 a 15 entra no projeto:

- Cap. 9 — salvar e carregar o jogo em andamento (JSON via API em arquivo no volume Docker) e um visualizador hexadecimal desse arquivo numa rota de debug.
- Cap. 10 — erros próprios (`SaveCorruptedError`, `InvalidMoveError`), `try/catch/finally` na carga do save, `using` com `Symbol.dispose` para liberar o loop e os listeners.
- Cap. 11 — `Game` emite `invaderKilled`, `playerHit`, `waveCleared` e `gameOver`; a tela e o placar só escutam.
- Cap. 12 — `requestAnimationFrame` para desenhar e `setInterval` para o passo dos invasores.
- Cap. 13 — Canvas 2D desenhando num `OffscreenCanvas` e copiando de uma vez (buffer duplo); o placar como Web Component; impressão do ranking com `window.print()`.
- Cap. 14 — `Shot` e `Star` imutáveis, `FinalizationRegistry` só para registrar no console quando objetos são coletados, e funções utilitárias no lugar de métodos de extensão.
- Cap. 15 — estatísticas com consultas no Postgres via Kysely: pontos por dia (`groupBy`), invasores abatidos por tipo, e `join` entre `players` e `games`.

Tarefas por semana:

1. Semana de 01/02 — releitura dos cap. 9 e 10; Canvas preto com as 300 estrelas piscando (o livro sugere começar exatamente por aí).
2. Semana de 08/02 — releitura dos cap. 11 e 12; `GameLoop`, `PlayerShip` com teclado e tiro.
3. Semana de 15/02 — invasores em formação, descida, tiros inimigos, colisões com testes.
4. Semana de 22/02 — releitura do cap. 13; `Renderer` com buffer, placar como Web Component, vidas e ondas.
5. Semana de 01/03 — releitura do cap. 14; salvar e carregar, erros próprios, visualizador hexadecimal.
6. Semana de 08/03 — releitura do cap. 15; tabelas `players`, `games` e `kills`, tela de estatísticas.
7. Semana de 15/03 — uma melhoria da lista do livro (explosões, nave-mãe, escudos ou bombardeiros), build de produção e revisão final.

Pronto quando:

- [ ] Jogo flui sem piscar a 60 quadros por segundo em `docker compose -f docker-compose.prod.yml up`
- [x] O domínio não conhece o Canvas; a tela só reage aos eventos do `Game`
- [x] Save corrompido gera erro tratado e mensagem na tela, sem travar o jogo
- [x] Tela de estatísticas usa ao menos uma consulta com `groupBy` e uma com `join`
- [x] Ao menos uma melhoria da lista do livro implementada (explosões)

## Cronograma consolidado

&#91;embedded content: cronograma · 4 fases, 3 entregas\]

O Lab 3 ocupa quase metade do tempo porque cobre 7 capítulos (9 a 15), contra 4 do Lab 1 e 4 do Lab 2.

Sobre o PDF: o arquivo veio de imagens escaneadas e cerca de 160 das 618 páginas saem em branco por corrupção, incluindo trechos dos cap. 1, 2, 4, 5, 6, 7, 9, 11, 12, 13 e 15 e quase toda a especificação do Lab 3 (PDF 584 a 596). Os Labs 1 e 2 foram lidos por completo; o Lab 3 deve ser conferido num exemplar íntegro antes da semana de 01/02.
