Устоновка:
```bash
sudo pacman -S postgresql 
```

Вход в sudo:
```bash
sudo -u postgres -i 
```

Создаём сессию:
```bash
initdb --locale $LANG -E UTF8 -D '/var/lib/postgres/data' 
```

Выходим:
```bash
exit
```

Автозапуск:
```bash
sudo systemctl enable postgresql.service

sudo systemctl start postgresql.service 
```

Вход в sudo:
```bash
sudo -u postgres -i 
```

создаём bd:
```bash
createdb sun
```

выбираем current_user:
```bash
select current_user;
```

Создаём роль:
```bash
create role имя_пользователя with superuser login createdb;
```


