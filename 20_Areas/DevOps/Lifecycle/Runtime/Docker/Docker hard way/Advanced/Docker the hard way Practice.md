
# Container from Scratch: The Hard Way

> [!ABSTRACT] Концепция
> Контейнер — это не виртуальная машина и не файл. Это **обычный процесс**, который ядро Linux ограничивает с помощью трех механизмов:
> $$Docker = Namespaces + Cgroups + Chroot$$

---

## Этап 1: Подготовка RootFS (Файловая система)

Создаем минимальное окружение, копируем бинарники и решаем проблему зависимостей (Shared Libraries).

```bash
cd /tmp
mkdir -p malutka/{bin,usr/bin,proc,sys,etc,usr/lib}

cd malutka
sudo ln -s usr/lib lib
sudo ln -s usr/lib lib64
cd ..

{
	sudo cp -L /lib/libreadline.so.8 malutka/usr/lib/
	sudo cp -L /lib/libc.so.6 malutka/usr/lib/
	sudo cp -L /lib/libncursesw.so.6 malutka/usr/lib/
	sudo cp -L /lib64/ld-linux-x86-64.so.2 malutka/usr/lib/
}

wget https://busybox.net/downloads/binaries/1.35.0-x86_64-linux-musl/busybox
sudo mv busybox malutka/bin
sudo chmod +x malutka/bin/busybox
sudo chroot malutka/ /bin/busybox sh
```

---

## Этап 2: Изоляция (Namespaces)

Используем `unshare`, чтобы процесс перестал видеть остальную систему.

```bash
sudo unshare --mount --uts --ipc --net --pid --fork \
             -f -R malutka \
             --mount-proc bin/busybox sh
```

> [!] Разбор флагов:
> * `--mount`: Своя таблица монтирования.
> * `--uts`: Свое имя хоста (hostname).
> * `--ipc`: Своя межпроцессная связь.
> * `--net`: Свой сетевой стек.
> * `--pid`: Свое дерево процессов (наш процесс станет PID 1).
> * `-R`: `chroot` в указанную папку.

---

## Этап 3: Ограничение ресурсов (Cgroups v2)

Проверяем, как ядро убивает процесс, если он потребляет слишком много памяти.

```bash
sudo mkdir /sys/fs/cgroup/malutka

echo 524288 | sudo tee /sys/fs/cgroup/malutka/memory.max

echo [PID] | sudo tee /sys/fs/cgroup/malutka/cgroup.procs

sh -c 'a=""; while true; do a="$a A"; done'
```

**Результат:** `Killed` (OOM Killer в действии).

---

## Этап 4: Промышленный стандарт (runc)

`runc` — это низкоуровневый движок, который делает всё вышеописанное по стандарту **OCI**.

```bash
mkdir chill && cd chill
runc spec

sudo debootstrap --variant=minbase --include iproute2 jammy rootfs

sudo runc run chill_container
```

> [!SUCCESS] Сравнение ID
> Команда `ps o pid,netns,mntns,pidns p $$` до и после запуска `runc` наглядно показывает смену Namespace ID.

---

## Итоговая карта (MOC)

* **Runtime:** [[Docker deep dive|Жизненный цикл и OCI]]
* **Изоляция:** [[Linux namespaces]] (UTS, PID, NET, MNT).
* **Лимиты:** [[Control Groups]] (Memory, CPU, IO).