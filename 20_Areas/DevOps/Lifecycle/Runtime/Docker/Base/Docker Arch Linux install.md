---
title: "Установка Docker на Arch Linux"
aliases:
  - Docker archlinux install
tags:
  - area/devops
  - topic/docker
type: howto
status: stable
created: 2023-12-28
updated: 2026-10-23
---

```shell
sudo pacman -S docker buildkit docker-buildx
```

```shell
sudo usermod -aG docker USERNAME

sudo systemctl enable docker
sudo systemctl start docker
sudo systemctl status docker
```

```shell
docker info


docker run -it --rm archlinux bash -c "echo hello world"
```