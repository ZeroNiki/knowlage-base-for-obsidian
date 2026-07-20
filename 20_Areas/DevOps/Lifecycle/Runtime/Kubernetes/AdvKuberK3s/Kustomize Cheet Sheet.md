---
tags:
  - kubernetes
  - kustomize
  - iac
  - gitops
source: "Kubernetes SIG-CLI"
status:  Deep-Dive-CheatSheet
date: 2026-04-10
---

# ️ Kustomize: Техническая шпаргалка SRE-инженера

> [!abstract] Ключевая концепция
> **Kustomize** работает по принципу **Configuration Hydration**: есть "сухая" база (Base) и "наполнение" (Overlays). Манифесты всегда остаются валидными YAML-объектами, что исключает ошибки рендеринга строк.

---

## 1. Структура и Точка входа
Файл `kustomization.yaml` — это манифест манифестов. 



```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml  # Локальный файл
  - ../../base       # Путь к базе
  - [https://github.com/org/repo/base?ref=v1.0.0](https://github.com/org/repo/base?ref=v1.0.0) # Удаленный ресурс
```

---

## 2. Иерархия слоев: Base, Overlays & Components



| Слой | Назначение |
| :--- | :--- |
| **Base** | Общая логика. Никогда не содержит специфики (IP, лимиты прода). |
| **Overlays** | Специфика сред (Dev/Prod). Использует патчи и трансформаторы. |
| **Components** | Модульные фичи (kind: `Component`). Напр. "включить Sidecar для логов". |

**Пример подключения компонента:**
```yaml
# overlays/prod/kustomization.yaml
resources: [ ../../base ]
components: [ ../../components/hpa ] # Подключаем только там, где нужно
```

---

## 3. Трансформаторы (Глобальные изменения)

Трансформаторы "умные" — они знают связи между объектами K8s.

* **`commonLabels`**: Добавляет метки и **автоматически** обновляет селекторы (`selector`).
* **`namePrefix` / `nameSuffix`**: Добавляет префикс (напр. `dev-`) ко всем ресурсам.
* **`namespace`**: Переносит все ресурсы в указанный неймспейс, включая `RoleBindings`.
* **`images`**: Самый частый кейс для CI/CD.
  ```yaml
  images:
    - name: my-app-image
      newTag: ${BUILD_NUMBER}
  ```

---

## 4. Глубокий патчинг



### Strategic Merge (YAML-native)
Используется для 90% задач. Понимает списки K8s.
```yaml
patchesStrategicMerge:
  - |-
    apiVersion: apps/v1
    kind: Deployment
    metadata:
      name: my-app
    spec:
      template:
        spec:
          containers:
            - name: app
              resources:
                limits: { cpu: "1" }
```

### JSON 6902 (Fallback)
Хирургическое вмешательство по индексам.
```yaml
patches:
  - target: { kind: Deployment, name: my-app }
    patch: |-
      - op: replace
        path: /spec/replicas
        value: 5
```

---

## 5. Генераторы (Hash Suffix)

Kustomize решает проблему "необновившихся конфигов".

1. Генерирует ConfigMap: `cfg-f76cf8`.
2. Обновляет имя в Deployment.
3. K8s видит новое имя CM -> запускает **Rolling Update**.

```yaml
configMapGenerator:
  - name: app-env
    envs: [.env.prod]
```

---

## 6. CLI и Эксплуатация

### Версии (Kubectl vs Kustomize)
| Kubectl | Kustomize | Нюанс |
| :--- | :--- | :--- |
| **v1.14 - v1.20** | v2.0.3 | Старый движок, не поддерживает Components. |
| **v1.27+** | v5.0.1 | Современный стандарт. |

### Топ команд для терминала
* `kubectl kustomize <dir>` — Проверить, что нарендерилось (Dry-run).
* `kubectl diff -k <dir>` — **Самая важная команда**. Показывает разницу между Git и Кластером.
* `kubectl apply -k <dir>` — Применить всё (использует оверлей).