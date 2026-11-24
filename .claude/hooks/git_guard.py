#!/usr/bin/env python3
"""Hook PreToolUse do Claude Code: confere os comandos git antes de rodarem.

Lê o JSON do evento na entrada padrão e olha o texto do comando (Bash ou PowerShell). Sai com código 2
(bloqueia) e explica o motivo no stderr; sai com 0 para deixar passar.

Regras:
  Mensagem  1. Título `tipo(escopo): descrição`. Tipos: feat|fix|refactor|test|docs|style|chore|ci|perf|build.
               Escopo em minúsculas: letras, números, ., _, / ou -. `merge` e `hotfix` não são tipos
               (o merge sai como `chore(merge)`).
            2. A mensagem inteira (título, corpo e ID) tem no máximo 200 caracteres.
            3. Sem autor nem co-autor: Co-Authored-By, Signed-off-by, Author:, Generated with e Claude Code
               são barrados, e também --signoff/-s e --author.
  Branch    5. Nome `<prefixo>/<nome>`, com prefixo feature, fix, refactor, hotfix, test, style ou release.
            6. Nunca commitar direto em master, main ou develop.
            7. Vale também ao criar a branch: git checkout -b/-B e git switch -c/-C.
  Tamanho   8. No máximo 6 arquivos por commit.
            9. Com mais de um arquivo, no máximo 600 linhas alteradas (um arquivo só não tem limite).
           10. Conta também o que um `git add` do mesmo comando vai incluir (e `commit -a`). Um commit de merge
               conta todos os arquivos do merge.
  Outras   11. --no-verify e -n não são permitidos.
           12. O hook lê o texto do comando (-m, -F, heredoc). Mensagem montada em variável, função ou
               substituição de comando não dá para interpretar, e o commit é barrado: escreva a mensagem literal.
"""

from __future__ import annotations

import json
import os
import re
import shlex
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))
TYPES = 'feat|fix|refactor|test|docs|style|chore|ci|perf|build'
TITLE = re.compile(r'^(' + TYPES + r')\(([a-z0-9._/-]+)\): \S.*$')
BRANCH = re.compile(r'^(feature|fix|refactor|hotfix|test|style|release)/[A-Za-z0-9._/-]+$')
PROTECTED = ('master', 'main', 'develop')
FORBIDDEN = re.compile(r'co-authored-by|signed-off-by|^author:|generated with|claude code', re.I | re.M)
MAX_MESSAGE = 200
MAX_FILES = 6
MAX_LINES = 600
LOCKS = ('composer.lock', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml')
HEREDOC = re.compile(r"<<-?\s*(['\"]?)(\w+)\1[ \t]*\n(.*?)\n[ \t]*\2[ \t]*(?:\n|$|[)\"'])", re.S)
GIT = re.compile(r'(?:^|[\s;&|(`"\'])git((?:\s+-[-\w=./]+(?:\s+[^\s-][^\s]*)?)*)\s+(commit|add|checkout|switch)\b')


REPO = ROOT  # repositório do comando em análise (muda a cada `git` encontrado)


def git(*args: str) -> str:
    done = subprocess.run(['git', '-C', REPO, *args], capture_output=True, text=True)
    return done.stdout


def repo_for(command: str, start: int, flags: str) -> str:
    """O repositório em que o `git` do comando roda: o de `git -C <pasta>`, o do último `cd <pasta>` antes dele, ou este."""
    found = re.search(r'-C\s+("[^"]+"|\'[^\']+\'|\S+)', flags)
    path = found.group(1).strip('"\'') if found else None
    if path is None:
        for cd in re.finditer(r'\bcd\s+("[^"]+"|\'[^\']+\'|[^\s;&|]+)', command[:start]):
            path = cd.group(1).strip('"\'')
    if path is None:
        return ROOT
    path = os.path.expanduser(path)
    if not os.path.isabs(path):
        path = os.path.join(REPO, path)
    top = subprocess.run(['git', '-C', path, 'rev-parse', '--show-toplevel'], capture_output=True, text=True).stdout.strip()
    return top or ROOT


def block(reasons: list[str]) -> None:
    print('✗ Comando git bloqueado pelo hook do repositório (.claude/hooks/git_guard.py):', file=sys.stderr)
    for reason in reasons:
        print(f'  - {reason}', file=sys.stderr)
    sys.exit(2)


def tokens(text: str) -> list[str] | None:
    """Separa o trecho em palavras; tolera as aspas de fora de um `bash -c "..."` que sobraram no fim."""
    stripped = text.rstrip()
    for candidate in (text, stripped.removesuffix('"'), stripped.removesuffix("'"), stripped.removesuffix(')"')):
        try:
            return shlex.split(candidate, posix=True)
        except ValueError:
            continue
    return None


def statements(command: str) -> list[tuple[str, str, str, str]]:
    """Acha cada `git <subcomando>` e devolve (subcomando, argumentos, texto do resto do comando)."""
    found = []
    for match in GIT.finditer(command):
        rest = command[match.end():]
        # O corpo do heredoc é mensagem, não argumento: sai do texto que vira palavras.
        words = HEREDOC.sub('<<X\nX\n', rest)
        first = words.split('\n', 1)[0]
        cut = re.split(r'&&|\|\||;', words if '<<' in first else first, maxsplit=1)[0]
        found.append((match.group(2), cut, command[match.start():], repo_for(command, match.start(), match.group(1))))
    return found


def message_of(args: list[str], rest: str, raw: str) -> tuple[str | None, str | None]:
    """(mensagem, erro). Mensagem None sem erro = não há mensagem no comando (abre o editor ou usa --no-edit)."""
    heredoc = HEREDOC.search(raw)
    parts: list[str] = []
    i = 0
    while i < len(args):
        arg = args[i]
        value = None
        if arg in ('-m', '--message') and i + 1 < len(args):
            value, i = args[i + 1], i + 1
        elif arg.startswith('--message='):
            value = arg.split('=', 1)[1]
        elif arg.startswith('-m') and len(arg) > 2 and not arg.startswith('--'):
            value = arg[2:]
        elif arg in ('-F', '--file') and i + 1 < len(args):
            path = args[i + 1]
            i += 1
            if path == '-':
                if heredoc is None:
                    return None, 'mensagem lida da entrada padrão (-F -) sem heredoc: não dá para interpretar'
                parts.append(heredoc.group(3))
            elif os.path.isfile(path):
                parts.append(open(path, encoding='utf-8').read())
            else:
                return None, f'arquivo de mensagem "{path}" não encontrado: não dá para interpretar'
        if value is not None:
            if re.search(r'\$\(|\$\{|\$[A-Za-z_]|`', value):
                if heredoc is not None and '$(cat' in value:
                    parts.append(heredoc.group(3))
                else:
                    return None, f'mensagem montada com variável ou substituição ("{value[:40]}"): escreva a mensagem literal'
            else:
                parts.append(value)
        i += 1
    if not parts:
        return None, None
    return '\n\n'.join(p.strip('\n') for p in parts), None


def check_message(message: str, reasons: list[str]) -> None:
    lines = [ln for ln in message.split('\n') if not ln.startswith('#')]
    text = '\n'.join(lines).rstrip()
    title = text.split('\n', 1)[0]
    if not TITLE.match(title):
        reasons.append(f'título fora do padrão: "{title}". Use tipo(escopo): descrição, com tipo entre {TYPES.replace("|", ", ")} e escopo em minúsculas (letras, números, ., _, / ou -). Merge: chore(merge).')
    if len(text) > MAX_MESSAGE:
        reasons.append(f'a mensagem tem {len(text)} caracteres (máximo {MAX_MESSAGE}, contando título, corpo e ID).')
    if FORBIDDEN.search(text):
        reasons.append('a mensagem não pode ter autor nem co-autor (Co-Authored-By, Signed-off-by, Author:, Generated with, Claude Code).')


def short_flags(args: list[str]) -> set[str]:
    """Letras das opções curtas agrupadas, parando na que consome argumento (-m, -F, -C, -c)."""
    letters: set[str] = set()
    skip = False
    for arg in args:
        if skip:
            skip = False
            continue
        if arg.startswith('--') or not arg.startswith('-') or arg == '-':
            continue
        for letter in arg[1:]:
            if letter in 'mFCcS':
                skip = len(arg) == 2
                break
            letters.add(letter)
    return letters


def add_targets(args: list[str]) -> list[str]:
    """Arquivos que um `git add <args>` incluiria agora (simulação)."""
    flags = [a for a in args if a.startswith('-') and a != '--']
    paths = [a for a in args if not a.startswith('-')]
    target = ['--'] + paths if paths else []
    out = git('add', '--dry-run', *(f for f in flags if f in ('-A', '--all', '-u', '--update')), *(target or (['.'] if any(f in flags for f in ('-A', '--all', '-u', '--update')) else [])))
    return [re.sub(r"^(add|remove) '(.*)'$", r'\2', ln) for ln in out.splitlines() if ln.strip()]


def lines_of(path: str, staged: bool) -> int:
    out = git('diff', *(['--cached'] if staged else ['HEAD']), '--numstat', '--', path)
    total = 0
    for ln in out.splitlines():
        added, deleted, _ = (ln.split('\t') + ['0', '0', ''])[:3]
        if added.isdigit() and deleted.isdigit():
            total += int(added) + int(deleted)
    if total == 0 and os.path.isfile(os.path.join(REPO, path)) and not git('ls-files', '--', path).strip():
        with open(os.path.join(REPO, path), 'rb') as handle:
            data = handle.read()
        total = 0 if b'\0' in data[:8000] else data.count(b'\n') + 1  # binário não conta linhas
    return total


def check_size(adds: list[list[str]], all_flag: bool, reasons: list[str]) -> None:
    staged = [f for f in git('diff', '--cached', '--name-only').splitlines() if f]
    files = {f: True for f in staged}
    if os.path.exists(os.path.join(REPO, '.git', 'MERGE_HEAD')):
        for f in git('diff', '--name-only', 'HEAD', 'MERGE_HEAD').splitlines():
            files.setdefault(f, True)
    for add in adds:
        for f in add_targets(add):
            files.setdefault(f, False)
    if all_flag:
        for f in git('diff', '--name-only').splitlines():
            files.setdefault(f, False)
    if len(files) > MAX_FILES:
        reasons.append(f'{len(files)} arquivos no commit (máximo {MAX_FILES}), contando o que o `git add` do comando inclui.')
        return
    if len(files) > 1:
        total = sum(lines_of(f, staged) for f, staged in files.items() if not f.endswith(LOCKS))
        if total > MAX_LINES:
            reasons.append(f'{total} linhas alteradas em {len(files)} arquivos (máximo {MAX_LINES} com mais de um arquivo).')


def main() -> None:
    try:
        event = json.load(sys.stdin)
    except ValueError:
        sys.exit(0)
    command = (event.get('tool_input') or {}).get('command') or ''
    if 'git' not in command:
        sys.exit(0)

    reasons: list[str] = []
    adds: list[list[str]] = []
    new_branch: str | None = None
    committed = False

    global REPO
    commit_repo = ROOT
    for sub, rest, raw, repo in statements(command):
        REPO = repo
        args = tokens(rest)
        if args is None:
            if sub == 'commit':
                reasons.append('não consegui interpretar o texto do comando git commit (aspas não fechadas?).')
            continue
        if sub == 'add':
            adds.append(args)
        elif sub in ('checkout', 'switch'):
            for flag in ('-b', '-B', '-c', '-C', '--create', '--force-create'):
                if flag in args and args.index(flag) + 1 < len(args):
                    name = args[args.index(flag) + 1]
                    new_branch = name
                    if not BRANCH.match(name):
                        reasons.append(f'nome de branch "{name}" fora do padrão: use <prefixo>/<nome>, com prefixo feature, fix, refactor, hotfix, test, style ou release.')
        elif sub == 'commit':
            committed = True
            commit_repo = repo
            flags = short_flags(args)
            if '--no-verify' in args or 'n' in flags:
                reasons.append('--no-verify e -n não são permitidos.')
            if '--signoff' in args or 's' in flags or any(a == '--author' or a.startswith('--author=') for a in args):
                reasons.append('--signoff, -s e --author não são permitidos (sem autor nem co-autor).')
            message, error = message_of(args, rest, raw)
            if error:
                reasons.append(error)
            elif message is not None:
                check_message(message, reasons)
            check_size(adds, 'a' in flags or '--all' in args, reasons)
            adds = []  # o que foi adicionado até aqui entra neste commit, não no próximo

    if committed:
        REPO = commit_repo
        branch = new_branch or git('branch', '--show-current').strip()
        if branch in PROTECTED:
            reasons.append(f'nunca se commita direto em {branch}: crie uma branch (git switch -c feature/<nome>).')
        elif branch and not BRANCH.match(branch):
            reasons.append(f'a branch "{branch}" está fora do padrão <prefixo>/<nome> (feature, fix, refactor, hotfix, test, style ou release).')

    if reasons:
        block(reasons)
    sys.exit(0)


if __name__ == '__main__':
    main()
