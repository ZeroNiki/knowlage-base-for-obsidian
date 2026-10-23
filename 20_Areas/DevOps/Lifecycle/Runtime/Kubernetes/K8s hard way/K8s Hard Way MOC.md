---
cssclasses:
  - dashboard
banner: "![[gruv-material-texture.png]]"
---
# Kubernetes The Hard Way MOC

> Роль: пошаговый обучающий путь ручной установки Kubernetes "the hard way" — без kubeadm и managed-сервисов, с ручной настройкой etcd, PKI и control plane.

> "Kubernetes — это просто пять бинарей, если понимать, что каждый из них делает."

---

## Cluster
> [!abstract] Сборка кластера с нуля
> - **Лабы:** [[Kubernetes The Hard Way v2]] | [[Kubernetes The Hard Way v1]]
> - **Gateway API:** [[GatewayAPI]]

## Introduction
> [!info] Компоненты control plane и worker-нод
> - **Control Plane:** [[ETCD]] | [[Kubeapi]] | [[Kube-scheduler]] | [[Kube-controller-manager]] | [[RBAC]]
> - **Worker:** [[Kubelet]] | [[Kubeproxy]]
> - **Обзор:** [[K8s-Introduction-Summary]]

## Networking
> [!tip] Сетевой стек кластера
> - [[Cilium]] | [[CNI]] | [[eBPF]] | [[Envoy]] | [[Gateway API]]

## Security
> [!warning] Безопасность кластера
> - [[MTLS]] | [[Безопасность Podов и рабочих нагрузок в Kubernetes]] | [[Стандарты безопасности]] | [[Управление доступом к API Kubernetes]]

---
См. также: [[Kubernetes MOC]]
