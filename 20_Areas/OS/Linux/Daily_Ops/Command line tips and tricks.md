
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
