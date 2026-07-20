---
project: "DO11_Advanced_K8s"
type: "Architecture_Review"
status: "Needs_Fixes"
tags: [k8s, devops, school21, security, cert-manager]
created: 2026-03-22
---

# ️ Архитектурный стандарт: k3s + Ingress-NGINX + TLS

> [!ABSTRACT] Обзор документа
> Данный документ устанавливает требования к архитектуре микросервисной платформы на базе **k3s**. В центре внимания — автоматизация PKI через **Cert-Manager** и устранение векторов атак.

---

## ️ Сквозной путь трафика (L7)
В системе используется **Ingress-NGINX** как единая точка входа (Entry Point).

1. **DNS**: `hotel.devops.com` → IP LoadBalancer.
2. **Ingress Controller**: Терминация TLS (расшифровка).
3. **Routing**: Анализ `host` в `ingress.yml`.
4. **Service**: Пересылка на внутренний `ClusterIP`.
5. **Pod**: Обработка запроса приложением.

> [!WARNING] Критическое замечание по k3s
> По умолчанию k3s поставляется с **Traefik**. Так как в манифестах указан `ingressClassName: nginx`, контроллер необходимо установить вручную (через Helm), иначе маршрутизация не заработает.

---

##  Жизненный цикл SSL (Cert-Manager & ACME)
Автоматизация исключает простои из-за просроченных сертификатов. 

### Схема выпуска:
`Ingress Annotation`  `Certificate`  `CertificateRequest`  `ACME Order`  `Challenge`  `TLS Secret`

> [!DANGER] КРИТИЧЕСКАЯ ОШИБКА: Wildcard vs HTTP-01
> В проекте обнаружена коллизия:
> - **В манифесте:** Хост `*.devops.com` (Wildcard).
> - **В ClusterIssuer:** Метод `http01`.
> 
> **Вердикт:** Let's Encrypt **запрещает** HTTP-01 для Wildcard. Проверка зависнет с ошибкой `unauthorized`.
> **Решение:** Переключиться на **DNS-01 challenge**.

---

##  Технический аудит манифестов

| Параметр | Текущее состояние (Audit) | Рекомендуемое состояние (Standard) |
| :--- | :--- | :--- |
| **Тип сервиса** | `NodePort`  | `ClusterIP`  |
| **Backend Paths** | Пусто (404 Error)  | Явное указание `/` и сервиса  |
| **TLS Challenge** | HTTP-01  | DNS-01 (для Wildcard)  |
| **Безопасность** | Base64 Secrets ️ | Secrets Encryption "at rest"  |

### Анализ сервиса `hotel-service.yml`
> [!BUG] Security Issue
> Использование `type: NodePort` открывает порты на всех узлах. При наличии Ingress это создает лишнюю дыру в безопасности. Необходимо сменить на **ClusterIP**.

---

## ️ План действий (Troubleshooting Guide)

1. **Исправить Ingress:** Заполнить секцию `paths` для всех хостов.
2. **Исправить ClusterIssuer:** Настроить интеграцию с DNS-провайдером (Cloudflare/Route53) для работы `dns01`.
3. **Миграция сервисов:** Массово заменить `NodePort` на `ClusterIP` во всех файлах `*-service.yml`.
4. **Encryption:** Запустить k3s с флагом `--secrets-encryption` для защиты паролей БД.

---

##  Связанные компоненты
![[NotebookLM Mind Map(1).png]]