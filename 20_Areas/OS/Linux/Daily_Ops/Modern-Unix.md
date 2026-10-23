---
title: "Modern Unix"
aliases: ["Moder-Unix"]
tags:
  - area/os
  - topic/linux
  - topic/cli-tools
type: cheatsheet
status: stable
created: 2025-09-17
updated: 2026-10-23
---

# Modern Unix
###  Поиск файлов и текста

**fd** (замена `find`)

```sh
fd pattern
fd txt src/
```

**Alias**:

```sh
alias find='fd'
```

**ripgrep (rg)** (замена `grep`)

```sh
rg "TODO"
rg "func" src/
```

**Alias**:

```sh
alias grep='rg'
```

---

###  Навигация

**broot (br)**

```sh
br
br --install   # добавить режим cd
```

**Alias**:

```sh
alias br='broot'
```

---

###  Диск и место

**dust** (замена `du`)

```sh
dust
```

**Alias**:

```sh
alias du='dust'
```

**duf** (замена `df`)

```sh
duf
```

**Alias**:

```sh
alias df='duf'
```

---

###  Git

**delta** — красивый diff
Добавить в `~/.gitconfig`:

```ini
[core]
  pager = delta
[interactive]
  diffFilter = delta --color-only
```

**lazygit** — TUI для git

```sh
lazygit
```

---

###  История и поиск

**fzf** — fuzzy finder

```sh
history | fzf
fd | fzf
```

**mcfly** — умная история

```sh
mcfly search
```

Добавить в `~/.zshrc`:

```sh
eval "$(mcfly init zsh)"   # или bash/fish
```

---

### Также стоит знать

Инструменты без подробного разбора выше, но из той же категории "modern Unix":

- **bat** — замена `cat` с подсветкой синтаксиса и Git-интеграцией
- **eza** — современная замена `ls` (форк `exa`)
- **lsd** — файловый листинг нового поколения, совместимый с `ls`
- **choose** — дружелюбная альтернатива `cut`/`awk`
- **jq** — `sed` для JSON
- **sd** — интуитивная замена `sed` для find & replace
- **cheat** / **tldr** — интерактивные шпаргалки по командам вместо man
- **bottom** / **glances** / **gtop** — кроссплатформенные мониторы процессов (альтернативы `top`/`htop`)
- **hyperfine** — утилита для бенчмаркинга команд
- **gping** — `ping` с графиком
- **procs** — замена `ps` на Rust
- **httpie** / **curlie** / **xh** — удобные HTTP-клиенты для терминала (альтернативы `curl`)
- **zoxide** — умная замена `cd`, запоминающая часто посещаемые директории
- **doggo** — DNS-клиент для людей (альтернатива `dig`)