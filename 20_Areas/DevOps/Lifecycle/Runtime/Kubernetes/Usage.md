---
title: "Kubernetes Usage"
aliases: []
tags:
  - area/devops
  - topic/kubernetes
type: cheatsheet
status: stable
created: 2024-09-19
updated: 2026-10-23
---

## First Step
Создание кластера 
```bash
minikube start 
```

Расширенно:
```bash
minikube start --cpus=n --memory=ngb --disk-size=ngb
```

Проверка статуса
```bash
kubectl get componentstatus

or

kubectl cluster-info
```

get nodes
```bash
kubectl get nodes
```

Остоновка нодов
```bash
minicube stop
```

Удаление
```bash
minicube delete
```

## Configure
set driver (VM):
```bash
minikube config set driver virtualbox
```
