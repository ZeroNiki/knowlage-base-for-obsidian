
# 🏗️ Container from Scratch: The Hard Way

> [!ABSTRACT] Концепция
> Контейнер — это не виртуальная машина и не файл. Это **обычный процесс**, который ядро Linux ограничивает с помощью трех механизмов:
> $$Docker = Namespaces + Cgroups + Chroot$$

---

## 📂 Этап 1: Подготовка RootFS (Файловая система)

Создаем минимальное окружение, копируем бинарники и решаем проблему зависимостей (Shared Libraries).

```bash
# 1. Структура папок
cd /tmp
mkdir -p malutka/{bin,usr/bin,proc,sys,etc,usr/lib}

# 2. Настройка Merged /usr (как в Arch Linux)
cd malutka
sudo ln -s usr/lib lib
sudo ln -s usr/lib lib64
cd ..

# 3. Библиотеки для системного Shell (ldd /usr/bin/sh)
sudo cp -L /lib/libreadline.so.8 malutka/usr/lib/
sudo cp -L /lib/libc.so.6 malutka/usr/lib/
sudo cp -L /lib/libncursesw.so.6 malutka/usr/lib/
sudo cp -L /lib64/ld-linux-x86-64.so.2 malutka/usr/lib/

# 4. Установка BusyBox (Швейцарский нож контейнеров)
wget https://busybox.net/downloads/binaries/1.35.0-x86_64-linux-musl/busybox
sudo mv busybox malutka/bin
sudo chmod +x malutka/bin/busybox

```

---

## 🎭 Этап 2: Изоляция (Namespaces)

Используем `unshare`, чтобы процесс перестал видеть остальную систему.

```bash
sudo unshare --mount --uts --ipc --net --pid --fork \
             -f -R malutka \
             --mount-proc bin/busybox sh

```

> [!📌] Разбор флагов:
> * `--mount`: Своя таблица монтирования.
> * `--uts`: Свое имя хоста (hostname).
> * `--ipc`: Своя межпроцессная связь.
> * `--net`: Свой сетевой стек.
> * `--pid`: Свое дерево процессов (наш процесс станет PID 1).
> * `-R`: `chroot` в указанную папку.

---

## ⛓️ Этап 3: Ограничение ресурсов (Cgroups v2)

Проверяем, как ядро убивает процесс, если он потребляет слишком много памяти.

```bash
# 1. Создаем группу ресурсов
sudo mkdir /sys/fs/cgroup/malutka

# 2. Устанавливаем лимит в 0.5 MB (жестко!)
echo 524288 | sudo tee /sys/fs/cgroup/malutka/memory.max

# 3. Привязываем процесс контейнера к группе
echo [PID] | sudo tee /sys/fs/cgroup/malutka/cgroup.procs

# 4. Stress-test внутри контейнера
sh -c 'a=""; while true; do a="$a A"; done'
```

**Результат:** `Killed` (OOM Killer в действии).

---

## 🚀 Этап 4: Промышленный стандарт (runc)

`runc` — это низкоуровневый движок, который делает всё вышеописанное по стандарту **OCI**.

```bash
mkdir chill && cd chill
runc spec  # Генерирует config.json (описание namespaces и cgroups)

# Создаем полноценную RootFS через debootstrap (Ubuntu Jammy)
sudo debootstrap --variant=minbase --include iproute2 jammy rootfs

# Запуск
sudo runc run chill_container

```

> [!SUCCESS] Сравнение ID
> Команда `ps o pid,netns,mntns,pidns p $$` до и после запуска `runc` наглядно показывает смену Namespace ID.

---

## 🧠 Итоговая карта (MOC)

* **Runtime:** [[Docker deep dive|Жизненный цикл и OCI]]
* **Изоляция:** [[Linux namespaces]] (UTS, PID, NET, MNT).
* **Лимиты:** [[Control Groups]] (Memory, CPU, IO).