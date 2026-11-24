# CLAUDE.md

Laboratório do Use a Cabeça! C# em TypeScript. Leia a skill `lab-ts` (`.claude/skills/lab-ts/SKILL.md`) antes de
mexer no código e o `docs/cronograma.md` para saber o que o laboratório pede.

- Não há Node no host: rode tudo pelo Docker (`make check`, `make up`).
- Domínio em `packages/domain` sem dependência de tela ou banco; a tela só desenha o estado dele.
- Hooks em `.githooks` (ative com `git config core.hooksPath .githooks`) e o guarda do Claude em
  `.claude/hooks/git_guard.py` cobram o padrão de branch, mensagem e tamanho de commit.
