---
tags:
  - kubernetes
  - helm
  - automation
  - devops
source: "Helm Documentation & Artifact Hub"
status: ️ Tooling-CheatSheet
date: 2026-04-10
---

# ⎈ Helm: Пакетный менеджер Kubernetes

> [!abstract] Суть
> **Helm** позволяет упаковывать манифесты K8s в **чарты (Charts)**. Это дает возможность использовать переменные, циклы и условия (Go Templates), а также управлять жизненным циклом приложений (версионирование и откаты).

---

## 1. Основные понятия (The Trinity)



1.  **Chart**: Описательная модель пакета (чертеж).
2.  **Values**: Набор параметров (конфиг под конкретную среду).
3.  **Release**: Конкретный экземпляр чарта, установленный в кластер.

---

## 2. Структура Чарта (Directory Tree)



```bash
my-chart/
├── Chart.yaml          # Метаданные (имя, версия чарта, версия приложения)
├── values.yaml         # Дефолтные значения переменных
├── charts/             # Зависимости (суб-чарты)
├── templates/          # Манифесты с шаблонами
│   ├── deployment.yaml
│   ├── _helpers.tpl    # Именованные шаблоны (partial)
│   └── NOTES.txt       # Инструкция, выводимая после установки
```

---

## 3. Go Templates: Мастерство шаблонизации

### Встроенные объекты
* `.Values` — данные из `values.yaml`.
* `.Release` — информация о текущем релизе (Name, Namespace, IsInstall).
* `.Chart` — данные из `Chart.yaml`.

### Ключевой синтаксис
```yaml
# Пример в templates/deployment.yaml
metadata:
  name: {{ include "my-chart.fullname" . }}
spec:
  replicas: {{ .Values.replicaCount | default 1 }}
  {{- if .Values.ingress.enabled }}
  # Логика включится только если enabled: true
  {{- end }}
```

> [!warning] nindent vs indent
> Всегда используй `{{- nindent 8 }}`. Он добавляет новую строку и корректный отступ, предотвращая поломку YAML-структуры.

---

## 4. Шпаргалка по CLI (Command Reference)

### Работа с репозиториями
* `helm repo add [name] [url]` — подключить хранилище (напр. Bitnami).
* `helm repo update` — обновить локальный кэш чартов.
* `helm search repo [keyword]` — найти чарт.

### Управление релизами
* `helm install [name] [chart]` — установить.
* `helm upgrade [name] [chart]` — обновить.
* `helm upgrade --install` — обновить, а если не установлен — установить (лучший выбор для CI).
* `helm rollback [name] [revision]` — откатиться к предыдущей версии.
* `helm list` — список всех релизов в namespace.

### Отладка и проверка
* `helm lint [path]` — проверить чарт на ошибки синтаксиса.
* `helm template [path]` — отрендерить шаблоны в терминал (посмотреть готовый YAML).
* `helm install --dry-run --debug` — симуляция установки с выводом всех манифестов.

---

## 5. Продвинутые фишки (Advanced)

* **Atomic Deploy**: `helm upgrade --install --atomic --wait` — если что-то пойдет не так, Helm сам сделает Rollback.
* **Helm Hooks**: Запуск Job до/после деплоя (напр. миграция БД): `annotations: "helm.sh/hook": pre-install`.
* **OCI Support**: Хранение чартов в Docker Registry: `helm push my-chart-0.1.0.tgz oci://my-registry.io/charts`.

---

## 6. Helm vs Kustomize: Краткий итог

| Кейс | Helm | Kustomize |
| :--- | :--- | :--- |
| **Стороннее ПО** |  Идеально (Prometheus, Redis) |  Сложно |
| **Свои сервисы** |  Если нужна сложная логика |  Если достаточно патчей |
| **Обучение** | ️ Нужно учить Go Templates |  Только чистый YAML |
| **Состояние** |  Хранит историю релизов |  Не хранит состояние |