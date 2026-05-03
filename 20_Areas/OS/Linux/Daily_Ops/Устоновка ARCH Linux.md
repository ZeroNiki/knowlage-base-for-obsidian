## подготовка к устоновке
- *Создаём образ на флешку*
- *Загружаемся с флешки*

### Устоновка
#### Начало

- *Подключаемя к интернету при помощи `iwctl`*

#### Разметка дисков
- *Разметка диска при помощи `cfdisk`*:
```
lsblk

cfdisk /dev/sda
```

-  **Выбирает разметку 'gpt'**
- **Создаём три раздела:**

```
/dev/sda1   UEFI
/dev/sda2   Linux filesystem
/dev/sda3   SWAP
```

- **Write and exit**

#### Форматирование
```
mkfs.fat -F 32 /dev/sda1

mkfs.btrfs /dev/sda2

mkswap /dev/sda3
```

#### Монтирование

```
mount /dev/sda2 /mnt

mount --mkdir /dev/sda1 /mnt/boot/efi

swapon /dev/sda3
```

#### Устоновка системы
```
pacman -Sy archlinux-keyring


pacstrap /mnt base linux-zen linux-firmware intel-ucode grub efibootmgr sudo vim  
networkmanager
```

####  Настройка языка и времени 
```
genfstab -L /mnt > /mnt/etc/fstab
```

```
arch-chroot /mnt

ln -sf /usr/share/zoneinfo/Continent/Country /etc/localtime

echo "en_US.UTF-8 UTF-8" >> /etc/locale.gen

locale-gen

echo "LANG=en_US.UTF-8" > /etc/locale.conf

passwd
```

#### Grub
```
grub-install --target=x86_64-efi --efi-directory=/boot/efi

grub-mkconfig -o /boot/grub/grub.cfg

exit

reboot
```


## Запуск и настройка

- вход через `root`
### Pacman 
заходим в `/etc/pacman.d/ ` и редактируем `mirrolist`
[Mirrorlist Generator](https://archlinux.org/mirrorlist/)

обновляем бд 
```
pacman -Syyu
```

### Cоздание нового пользователя

```
pacman -S vi 

useradd --create-home NAME

passwd NAME

usermod -aG wheel NAME

visudo
```

Раскаментируем `%wheel` а под `root` напишем:
```
NAME ALL=(ALL:ALL) ALL
```


Выходим: 
```
exit 
```


### xinitrc DWM и nvidia drivers
```shell
sudo pacman -S base-devel git libx11 libxft libxinerama xorg-server xorg-xinit make alacritty noto-fonts zsh neofetch firefox obsidian nvim ntfs-3g pcmanfm numlockx nitrogen lxappearance xorg-setxkbmap xorg-xrandr lxrandr
```


- мой конфиг dwm 
```shell 
git clone https://github.com/ZeroNiki/dwm-dotfiles.git
```

перед запуском заменим `st` на `alacritty`

#### awesome wm
```bash
sudo pacman -S awesome awesome-extra awesome-doc
```

#### Xorg server
Добавить в .xinitrc:
```
numlockx &
slstatus &
setxkbmap -layout us,ru -option "grp:win_space_toggle" &
nitrogen --set-zoom-fill --random ~/Pictures/Wallpaper/ &
picom --experimental-backends -b --config .config/picom/config.conf &
exec dwm 
```


#### NVIDIA (Пока не проверено)
проверяем какой у нас девайс:
```shell
lspci -k | grep -A 2 -E "(VGA|3D)"
```

[Версия драйвера под видеокарту](https://www.nvidia.com/Download/index.aspx)

Устновка:
```shell
sudo pacman -S nvidia-dkms nvidia-settings nvidia-utils 
```

настройка nvidia:
```shell
sudo nvidia-settings
```

**сохранить и перезагрузиться** 

## Звук
```
sudo pacman -S pipewire pipewire-pulse
```

в .xinitrc 
```
/usr/bin/pipewire &
/usr/bin/pipewire-pulse &
/usr/bin/pipewire-media-session &
```















