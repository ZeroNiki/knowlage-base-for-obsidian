# Большой гайд по настройке Cisco IOS (C3745 и похожие устройства)

## 1. Базовая настройка устройства

Это фундамент: без hostname, паролей и интерфейсов — всё остальное не имеет смысла.

### Что делаем:

1. Задаём имя (чтобы в сети устройства не путались).
2. Включаем пароли на консоль и VTY (удалённый доступ).
3. Настраиваем интерфейсы.

### Почему так:

* `hostname` нужен для генерации криптоключей и для удобства.
* Без `enable secret` любой сможет зайти в **privileged mode**.
* IP на интерфейсе делает роутер доступным по сети.

### Команды:

```bash
R1(config)#hostname R1
R1(config)#enable secret mysecret

R1(config)#line console 0
R1(config-line)#password cisco
R1(config-line)#login
R1(config-line)#exit

R1(config)#interface FastEthernet0/0
R1(config-if)#ip address 192.168.10.1 255.255.255.0
R1(config-if)#no shutdown
```

### Проверка:

```
R1#show ip interface brief
Interface              IP-Address      OK? Method Status                Protocol
FastEthernet0/0        192.168.10.1    YES manual up                    up
```

---

## 2. Настройка удалённого доступа (Telnet и SSH)

### Почему:

* Telnet = простой способ удалённого входа, но **пароль передаётся в открытом виде**.
* SSH = то же самое, но с **шифрованием**. В реальной сети всегда используем SSH.

### Telnet (базовый вариант):

```bash
R1(config)#line vty 0 4
R1(config-line)#password cisco
R1(config-line)#login
R1(config-line)#transport input telnet
```

 Теперь можно подключаться:

```
R2#telnet 192.168.10.1
Trying 192.168.10.1 ... Open
Password:
```

### SSH (рекомендуется):

```bash
R1(config)#ip domain-name lab.local
R1(config)#crypto key generate rsa
How many bits in the modulus [512]: 1024

R1(config)#username admin privilege 15 secret admin123
R1(config)#line vty 0 4
R1(config-line)#login local
R1(config-line)#transport input ssh
R1(config)#ip ssh version 2
```

Проверка:

```
R2#ssh -l admin 192.168.10.1
Password:
R1>
```

## 3. Настройка статической маршрутизации

### Почему:

* Роутер знает только сети, подключенные к его интерфейсам.
* Чтобы связать разные подсети, нужно сказать: "для этой сети иди туда".

### Команды:

```bash
R1(config)#ip route 192.168.20.0 255.255.255.0 192.168.10.2
```

Значит: чтобы дойти до сети `192.168.20.0/24`, отправляй пакеты на соседний роутер `192.168.10.2`.

### Проверка:

```
R1#show ip route
S    192.168.20.0/24 [1/0] via 192.168.10.2
```

## 4. Настройка динамической маршрутизации (RIP, OSPF, EIGRP)

### Почему:

* В больших сетях вручную вводить маршруты неудобно.
* Протоколы маршрутизации сами обмениваются таблицами.

### RIP (простой протокол):

```bash
R1(config)#router rip
R1(config-router)#version 2
R1(config-router)#network 192.168.10.0
R1(config-router)#network 192.168.20.0
```

### OSPF (современный вариант):

```bash
R1(config)#router ospf 1
R1(config-router)#network 192.168.10.0 0.0.0.255 area 0
R1(config-router)#network 192.168.20.0 0.0.0.255 area 0
```

## 5. NAT (маскарадинг)

### Почему:

* Внутренние IP-адреса (192.168.x.x) не видны в интернете.
* NAT "подменяет" их на публичный IP роутера.

### Команды:

```bash
R1(config)#interface FastEthernet0/0
R1(config-if)#ip nat inside
R1(config)#interface Serial0/0
R1(config-if)#ip nat outside

R1(config)#access-list 1 permit 192.168.10.0 0.0.0.255
R1(config)#ip nat inside source list 1 interface Serial0/0 overload
```

## 6. DHCP-сервер на Cisco

### Почему:

* Чтобы ПК в сети автоматически получали IP, маску, шлюз.

### Команды:

```bash
R1(config)#ip dhcp pool LAN
R1(dhcp-config)#network 192.168.10.0 255.255.255.0
R1(dhcp-config)#default-router 192.168.10.1
R1(dhcp-config)#dns-server 8.8.8.8
```

## 7. ACL (доступ и фильтрация)

### Почему:

* ACL = фильтр, который говорит, какие пакеты пропускать или блокировать.

### Пример: запретить ping от 192.168.10.5

```bash
R1(config)#access-list 100 deny icmp host 192.168.10.5 any
R1(config)#access-list 100 permit ip any any
R1(config)#interface FastEthernet0/0
R1(config-if)#ip access-group 100 in
```

## 8. SNMP, HTTP, сервисы (L7)

### Почему:

* Иногда нужно мониторить устройства или включить веб-доступ.

### Включение HTTP:

```bash
R1(config)#ip http server
```

##  Итоговая логика

1. **L1–L2 (физика/канал):** смотришь линк (up/up) и ARP.
2. **L3 (сеть):** даёшь IP, маршрутизацию.
3. **L4 (транспорт):** проверяешь Telnet/SSH.
4. **L5–L6 (сессии/шифрование):** работа Telnet vs SSH.
5. **L7 (приложения):** HTTP, SNMP, FTP и т.д.