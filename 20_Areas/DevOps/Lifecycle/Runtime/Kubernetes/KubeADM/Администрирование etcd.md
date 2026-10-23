---
title: "Администрирование etcd"
aliases: []
tags:
  - area/devops
  - topic/kubernetes
type: howto
status: stable
created: 2026-10-23
updated: 2026-10-23
---

# KUBERNETES: Администрирование и Бэкап Etcd

## 1. Подключение и проверка etcd
Для работы с базой данных etcd используется утилита `etcdctl` с обязательным указанием API версии, эндпоинтов и TLS-сертификатов хоста.

Проверка здоровья etcd:
```bash
sudo ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  endpoint health

```

---

## 2. Создание снимка (Snapshot) и проверка статуса

Создание бэкапа базы данных:

```bash
sudo ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  snapshot create /opt/etcd_snapshot.db

```

Проверка информации о созданном снапшоте:

```bash
sudo ETCDCTL_API=3 etcdctl \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/etc/kubernetes/pki/etcd/ca.crt \
  --cert=/etc/kubernetes/pki/etcd/server.crt \
  --key=/etc/kubernetes/pki/etcd/server.key \
  -w table snapshot status /opt/etcd_snapshot.db

```

---

## 3. Инъекция хаоса (Симуляция катастрофы)

* **Просмотр ключей в базе (пример):**
```bash
etcdctl get /registry/deployments/default/web-app

```


* **Что происходит при падении etcd?**
Кластер полностью перестает работать. API-сервер теряет источник данных, из-за чего любые команды `kubectl` зависают или возвращают ошибки связи.
* **Симуляция удаления:** Удаление манифеста `/etc/kubernetes/manifests/etcd.yaml` останавливает работу etcd-пода.

---

## 4. Восстановление (Restore) из бэкапа

Восстановление снимка в новую директорию данных:

```bash
sudo etcdctl snapshot restore /opt/etcd_snapshot.db \
  --data-dir=/var/lib/etcd-from-backup
```

### Ответы на ключевые вопросы:

* **Почему etcd требует `--data-dir`?** База данных не перезаписывает старые файлы на лету из соображений безопасности. Параметр указывает, куда именно распаковать чистую копию базы и логи транзакций (WAL).
* **Что происходит с сертификатами?** Сертификаты (`/etc/kubernetes/pki/etcd/`) хранятся в файловой системе ноды, а не внутри базы etcd. При восстановлении они не затрагиваются, но восстановленный etcd должен им доверять.
* **Зачем `--initial-cluster`?** Каждый узел etcd (даже в однонодовом кластере) должен знать свой ID, адрес и состав участников для формирования кворума.