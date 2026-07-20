# Moder-Unix
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