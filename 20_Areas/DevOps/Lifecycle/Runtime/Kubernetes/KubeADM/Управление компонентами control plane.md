---
title: "Управление компонентами control plane"
aliases: []
tags:
  - area/devops
  - topic/kubernetes
type: howto
status: stable
created: 2023-12-28
updated: 2026-10-23
---

# KUBERNETES: Компоненты Control Plane и Статические Поды

## Задание 1. Охота за манифестами
Поиск директории с конфигурационными файлами компонентов Control Plane на мастер-ноде:

```bash
vagrant@bookworm:~$ la /etc/kubernetes/
total 52K
drwxrwxr-x  4 root root 4.0K Aug 22 11:25 .
drwxr-xr-x 72 root root 4.0K Aug 23 06:34 ..
-rw-------  1 root root 5.6K Aug 22 11:25 admin.conf
-rw-------  1 root root 5.6K Aug 22 11:25 controller-manager.conf
-rw-------  1 root root 2.0K Aug 22 11:25 kubelet.conf
drwxrwxr-x  2 root root 4.0K Aug 23 06:45 manifests
drwxr-xr-x  3 root root 4.0K Aug 22 11:25 pki
-rw-------  1 root root 5.5K Aug 22 11:25 scheduler.conf
-rw-------  1 root root 5.6K Aug 22 11:25 super-admin.conf

vagrant@bookworm:~$ la /etc/kubernetes/manifests/
total 24K
drwxrwxr-x 2 root root 4.0K Aug 23 06:45 .
drwxrwxr-x 4 root root 4.0K Aug 22 11:25 ..
-rw------- 1 root root 2.6K Aug 22 11:25 etcd.yaml
-rw------- 1 root root 3.9K Aug 22 11:25 kube-apiserver.yaml
-rw------- 1 root root 3.2K Aug 22 11:25 kube-controller-manager.yaml
-rw------- 1 root root 1.7K Aug 22 11:25 kube-scheduler.yaml
```

---

## Задание 2. Анализ статического пода

Статические Pod управляются непосредственно демоном **kubelet** на конкретном узле, без участия сервера API. В отличие от Pod, управляемых контрольной плоскостью (например, Deployment), kubelet отслеживает каждый статический Pod и перезапускает его в случае сбоя.

* **hostPath:** В манифестах статических подов используется для проброса директорий хоста внутрь контейнера (например, для доступа к сертификатам `/etc/ssl/cert` или `/etc/kubernetes/pki/`).
* **Расположение сертификатов и параметров:**
* Пути к сертификатам API-сервера прописываются через параметры вроде `--client-ca-file="/etc/kubernetes/pki/"`.
* Подключение к базе данных etcd задается флагами в секции `containers: command:` каждого компонента:
```yaml
--etcd-cafile
--etcd-certfile
--etcd-keyfile
--etcd-servers
```

---

## Задание 3. Эксперимент с перезапуском (через Kubelet)

### Вопросы и ответы:

1. **Кто именно создает эти контейнеры, если в кластере еще нет `kube-apiserver` на момент старта ноды?**
Контейнеры создает локальный демон **Kubelet** (совместно с рантаймом, например, `containerd`), который запущен на ноде как системная служба (`systemctl status kubelet`). Kubelet работает напрямую в ОС мастера и ему не нужно обращаться к `kube-apiserver` для запуска панели управления. Это решает проблему «курицы и яйца»: сначала стартует демон kubelet, а он уже поднимает API-сервер и остальные компоненты.
2. **Как kubelet узнает, какие поды нужно запустить на мастер-ноде?**
Kubelet настроен сканировать определенную директорию на диске хоста с помощью параметра конфигурации или флага:
`staticPodPath: /etc/kubernetes/manifests` (или `--pod-manifest-path=/etc/kubernetes/manifests`).
Если kubelet видит там YAML-файл, он запускает соответствующий под. Если удалить файл — под удалится; если вернуть — создастся заново.

### Практический эксперимент:

Временное перемещение манифеста для перезапуска/отладки компонента:

```bash
sudo mv /etc/kubernetes/manifests/kube-scheduler.yaml ~/

sudo mv ~/kube-scheduler.yaml /etc/kubernetes/manifests/
```