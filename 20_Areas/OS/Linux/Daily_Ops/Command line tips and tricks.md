
## Return to the prev working dir:
```bash
cd -
```

CTRL+L = clear

## The pushd and popd command:
```bash
pushd /var
cd ~
popd 
```
pushd work as flag, popd return to the flag

## Sending apps to the background, then back to the foreground:
```bash
CTRL+Z
fg 
```

CTRL+R search command in bash history

## history:
```bash
history
```

display data in history:
```bash
HISTTIMEFORMAT="%Y-%m-%d %T "
```

CTRL+A - start
CTRL+E - end

## Chaining command together - `;` in end of the line
```bash
ls; sudo pacman -Syu; reboot
```

starting a program after finishing the previous one - `&&`

```bash
python -m venv venv && source venv/bin/activate
```

## Following log files
```
tail -f logfile
```

## Emptying the content of the text
```bash
truncate -s 0 name.filetype
```

## Formatting command output with `columns`
```bash
mount | column -t
```

## Piping in linux
- Used to move data between the command
like this:
command 1 -------> command 2

Pipes character - `|`
```bash
command1 | command2 | etc 
```
Ex:
```bash
cat name.txt | sort
history | grep "neofetch" | sort
cat name.txt | head -8 | tail -4
```

`head -8 | tail -4` - this means that: display first 8 elements (`head -8`) and delete firs 4 elements (`tail -4`)


## way to shorten commands
```
alias install="sudo pacman -S "
```

in `.bashrc` or `.zshrc`:
```bash
alias v="vim "
alias nv="nvim "
alias wtr="curl wttr.in"
alias st="curl -s https://raw.githubusercontent.com/sivel/speedtest-cli/master/speedtest.py | python3 -"
alias stxt="curl -F 'f=@-;' pb1n.de"
alias qr="curl -F-=\<- qrenco.de"
```

## CURL
### get IP
```bash
curl ifconfig.me
```

### Share text or smth
send images
```bash
curl -F'url=https://gruvbox-wallpapers.pages.dev/wallpapers/anime/108948084_p0.png' http://0x0.st
```

from local
```bash
curl -F 'file=@Me.jpg' http://0x0.st
```

send text (Pipe)
```bash
ip a | curl -F 'f=@-;' pb1n.de
```

### Shorted link
```bash
curl --location --request POST "https://shorta.link" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data-urlencode "url=https://www.youtube.com/watch\?v\=C2n3UiJIcbg" \
    --data-urlencode "slug=yt"
```

### Create qrcode and send it 

```bash
echo "link" | curl -F-=\<- qrenco.de | curl -F 'f=@-;' pb1n.de
```

### Linux cheet sheet command
```
curl cheat.sh/{command}
```


## Just relax 
```
ssh play@ascii.town
```

### Shortcuts
Горячие клавиши в терминале Linux значительно ускоряют работу, позволяя не тратить время на постоянное нажатие клавиш перемещения курсора.

Вот основные комбинации, разбитые по категориям для удобства запоминания.

### 1. Перемещение курсора
Эти клавиши помогут быстро прыгать по строке:

* **`Ctrl + A`** — Перейти в **начало** строки.
* **`Ctrl + E`** — Перейти в **конец** строки.
* **`Alt + F`** — Перепрыгнуть на **одно слово вперед**.
* **`Alt + B`** — Перепрыгнуть на **одно слово назад**.
* **`Ctrl + XX`** (нажать X дважды) — Переместить курсор между текущей позицией и началом строки.

---

### 2. Редактирование текста
Удаление и исправление ошибок на лету:

* **`Ctrl + U`** — Удалить всё от позиции курсора до **начала** строки.
* **`Ctrl + K`** — Удалить всё от позиции курсора до **конца** строки.
* **`Ctrl + W`** — Удалить **одно слово** перед курсором.
* **`Alt + D`** — Удалить **одно слово** после курсора.
* **`Ctrl + Y`** — Вставить ("выплюнуть") последний удаленный текст (аналог команды вставки).
* **`Ctrl + _`** (Ctrl + Shift + -) — Отменить последнее действие (Undo).

---

### 3. Управление процессом
Эти клавиши позволяют контролировать выполнение команд:

* **`Ctrl + C`** — Прервать (завершить) текущую команду.
* **`Ctrl + Z`** — Приостановить выполнение команды (отправить в фоновый режим; вернуть можно командой `fg`).
* **`Ctrl + D`** — Выйти из текущей сессии (аналог команды `exit` или закрытие терминала).
* **`Ctrl + L`** — Очистить экран (аналог команды `clear`).

---

### 4. Работа с историей команд
* **`Ctrl + R`** — **Поиск по истории**. Просто начните вводить команду, и терминал найдет последнее совпадение. Нажимайте `Ctrl + R` повторно, чтобы пролистывать результаты.
* **`Ctrl + G`** — Выйти из режима поиска.
* **`!!`** — Повторить **самую последнюю** команду (очень удобно с `sudo !!`, если забыли права суперпользователя).
* **`!$`** — Вставить последний аргумент предыдущей команды (например, после `mkdir my_folder` можно написать `cd !$`, чтобы сразу войти в папку).

---

### 5. Управление экраном (внутри терминала)
* **`Ctrl + S`** — Остановить вывод на экран (терминал "замирает").
* **`Ctrl + Q`** — Возобновить вывод, если случайно нажали `Ctrl + S`.