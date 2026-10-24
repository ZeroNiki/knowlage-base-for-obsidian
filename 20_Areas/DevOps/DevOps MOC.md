---
cssclasses:
  - dashboard
banner: "![[gruv-material-texture.png]]"
---
#  DevOps MOC

> "DevOps — это не инструмент, а культура взаимодействия между разработкой и эксплуатацией."

---

##  Навигация и Основы
> [!info] Общая карта
> - [[DevOps]] (Фундаментальная теория)

##  Runtime & Orchestration
> [!abstract] Контейнеризация и K8s
> - **База:** [[Глубокий технический гайд по контейнеризации]] | [[OCI]]
> - **Docker:** [[Оркестрация]] | [[Docker MOC]] (вся база, Compose, Swarm, Hard Way — внутри)
> - **Kubernetes (K3s):** [[Kubernetes MOC]] (K8s Hard Way, AdvKuberK3s, kubeadm, общие заметки — внутри)
> - **Advanced (без своего MOC):** [[Кворум]], [[Tier III]], [[HA Proxy]], [[High Availability]], [[Kubernetes HA]], [[Сетевая архитектура Kubernetes]]

##  Infrastructure as Code (IaC)
> [!check] Инструменты автоматизации
> - **Методология:** [[Методологии и инструменты Infrastructure as Code]]
> - **Terraform:** [[Terraform cheatsheet small]]
> - **Ansible:** [[ANSIBLE]], [[Ansible cheetSheet]], [[Ansible Стратегия масштабируемой автоматизации]]
> - **Синтез:** [[Архитектурная битва и синергия Terraform & Ansible]]

##  Lifecycle & CI/CD
> [!tip] Культура и процессы
> - [[CICD]], [[Непрерывная поставка и культура DevOps]]
> - [[Стратегии тестирования в CI-CD]]

##  Messaging & Data
> [!code] Брокеры
> - **Kafka:** [[Kafka]], [[Kafka the def guide]]
> - **RabbitMQ:** [[RabbitMQ]], [[RabbitMQ in depth]]
> - **Comparison:** [[RabbitMQ vs Kafka]]

## ️ Observability & Security
> [!warning] Мониторинг и логи
> - **Мониторинг и логи:** [[Observability MOC]] (Grafana, Prometheus, troubleshooting-кейсы — внутри)
> - **Secrets (без своего MOC):** [[Архитектура HashiCorp Vault|HashiCorp Vault Architecture]], [[Динамические движки секретов в HashiCorp Vault]], [[Интеграция HashiCorp Vault с Kubernetes]], [[Управление идентичностью в HashiCorp Vault]]

## ️ Version Control (Git and GitOps)
> [!done] Гитизация
> - [[GIT Глубокое погружение в архитектуру и процессы]]
> - [[Архитектурный разбор контентно-адресуемой системы]]
> - [[GitOps Overview]]
> - [[Git Expert Cheat Sheet]]
> - [[Архитектура Argo CD]]
> - [[Пошаговое практическое руководство]]
> - [[Синхронизация и управление состоянием в Argo CD]]