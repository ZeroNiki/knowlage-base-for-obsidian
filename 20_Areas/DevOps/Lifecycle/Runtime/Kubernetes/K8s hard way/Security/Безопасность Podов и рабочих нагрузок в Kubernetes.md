---
tags:
- k8s
- security
- pod-security
- pss
- opa
- cka
- obsidian
---

# Безопасность Pod'ов и рабочих нагрузок в Kubernetes (Pod & Workload Security)

---

## 1. Блок 1. Теория простыми словами

Эшелонированная защита (**Defense in Depth**) в Kubernetes — это комплексный подход, требующий непрерывного контроля безопасности на всех уровнях инфраструктуры. Если злоумышленник или вредоносный код преодолеет периметр приложения, именно жестко сконфигурированные ограничения рабочей нагрузки (**Workload Security**) не позволят ему повысить привилегии, получить доступ к хостовой операционной системе или скомпрометировать соседние контейнеры.

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Периметр и API Server (TLS, RBAC, OIDC)                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ 2. Сетевая сегментация (NetworkPolicies, mTLS)              │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ 3. Изоляция процессов (Security Context, Capabilities, PSS) │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ 4. Изоляция на уровне ядра Linux / ВМ (seccomp, gVisor)     │
 └─────────────────────────────────────────────────────────────┘

```

---

### 1.1. Контекст безопасности (Security Context)

#### Иерархия конфигурации: Pod vs Container

Параметры контекста безопасности определяются на двух уровнях:

* На уровне всего Пода (`pod.spec.securityContext`).
* На уровне конкретных контейнеров (`pod.spec.containers[].securityContext`).

| Уровень | Область действия | Переопределение |
| --- | --- | --- |
| **Pod** (`pod.spec.securityContext`) | Все контейнеры внутри Пода и смонтированные тома (`fsGroup`, `seLinuxOptions`). | Переопределяется точечными настройками контейнеров. |
| **Container** (`pod.spec.containers[].securityContext`) | Исключительно один конкретный контейнер. | Имеет более высокий приоритет над настройками Пода; не влияет на тома. |

#### Ключевые опции идентификации и прав:

* **`runAsUser`**: Численный UID пользователя, от имени которого запускаются процессы.
* **`runAsGroup`**: Численный GID основной группы процессов. Если опущен, основной GID процесса по умолчанию становится `root(0)`.
* **`runAsNonRoot`**: Требует, чтобы контейнер запускался только от имени пользователя с UID, отличным от `0`.
* **`fsGroup`**: Дополнительная группа для управления правами владения томами (`emptyDir`, `PersistentVolume`).
* **`fsGroupChangePolicy`**: Управляет рекурсивным изменением прав тома при монтировании. По умолчанию — `"Always"`. Опция `"OnRootMismatch"` меняет права только если root-директория тома не соответствует `fsGroup`, что предотвращает задержки старта (`PodStuckInContainerCreating`) на больших томах.
* **`supplementalGroups` & `supplementalGroupsPolicy**`: Задает список дополнительных GID. Политический режим `Strict` (начиная с K8s v1.33) предотвращает слияние с файлом `/etc/group` внутри образа, привязывая строго указанные GID.

> [!warning] Угроза выполнения процессов от root (UID 0)
> Запуск контейнеров с UID 0 создаёт критический риск. В случае побега из контейнера (**Container Escape**) процесс с правами root внутри непривилегированного контейнера может получить полноправный root-доступ к хостовой ноде кластера.

#### Защита от повышения привилегий и модификации файловой системы:

* **`allowPrivilegeEscalation: false`**: Активирует флаг ядра Linux `no_new_privs = true`, запрещая дочерним процессам получать больше прав, чем у родительского (например, через SUID/SGID-биты).
> [!note]
> Несовместимо с `privileged: true` или наличием `CAP_SYS_ADMIN`.


* **`readOnlyRootFilesystem: true`**: Переводит корневую файловую систему в режим «только для чтения». Блокирует изменение бинарников и внедрение кода. Запись временных данных выносится в смонтированный том `emptyDir` (например, в `/tmp`).

#### Системные фильтры вызовов и мандатный контроль доступа:

* **`seccompProfile`**: Ограничивает доступные процессу системные вызовы (*syscalls*) ядра Linux. `type: RuntimeDefault` подключает стандартный профиль рантайма (блокируя вызовы типа `unshare`, `reboot`, `kexec_load`).
* **`appArmorProfile`**: Профили мандатного контроля доступа (MAC) AppArmor для ограничений на уровне бинарных файлов.
* **`seLinuxOptions`**: Назначает метки SELinux (MCS) процессу и томам.

#### Минимизация привилегий через Linux Capabilities:

Linux Capabilities разбивают монолитные привилегии `root` на отдельные точечные разрешения.
Сначала сбрасываются все права (`drop: ["ALL"]`), затем явно добавляются только необходимые (например, `NET_BIND_SERVICE`).

```
  [ Полные права root (CAP_SYS_ADMIN, CAP_NET_ADMIN, CAP_SYS_TIME...) ]
                                   │
                                   ▼  capabilities.drop: ["ALL"]
                     [ Полный сброс привилегий ]
                                   │
                                   ▼  capabilities.add: ["NET_BIND_SERVICE"]
           [ Минимально необходимый набор привилегий ]

```

> [!note] Синтаксис Capabilities в K8s
> В манифестах Kubernetes названия указываются **без префикса `CAP_**` (например, `NET_ADMIN`, а не `CAP_NET_ADMIN`).

> [!tip] Рекомендации для CKA / CKS
> Стандартный золотой образ настройки безопасности Пода:
> * `runAsNonRoot: true` + явные `runAsUser` и `runAsGroup`.
> * `allowPrivilegeEscalation: false`.
> * `capabilities.drop: ["ALL"]` (без префикса `CAP_`).
> * `readOnlyRootFilesystem: true` + `emptyDir` в `/tmp`.
> * `seccompProfile.type: RuntimeDefault`.
> 
> 

---

### 1.2. Стандарты безопасности Подов (Pod Security Standards — PSS & PSA)

Механизм **PodSecurityPolicies (PSP)** полностью удален из Kubernetes в пользу встроенного контроллера допуска — **Pod Security Admission (PSA)**, реализующего **Pod Security Standards (PSS)**.

```
                    ┌───────────────────────────────┐
                    │ Pod Security Admission (PSA)  │
                    └───────────────┬───────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│   Privileged    │        │    Baseline     │        │   Restricted    │
├─────────────────┤        ├─────────────────┤        ├─────────────────┤
│ • Без ограничений│        │ • Базовая защита│        │ • Строгий non-root│
│ • Системный код │        │ • Запрет host*  │        │ • drop ALL caps │
│ • CNI / Kubelet │        │ • Дефолт для приложения  │ • readOnlyRootFS│
└─────────────────┘        └─────────────────┘        └─────────────────┘

```

#### Профили безопасности PSS:

| Критерий / Параметр | Privileged | Baseline | Restricted |
| --- | --- | --- | --- |
| **Хостовые пространства** (`hostNetwork`, `hostPID`, `hostIPC`) | Разрешены | Запрещены | Запрещены |
| **Хостовые порты** (`hostPorts`) | Не ограничены | Запрещены | Запрещены |
| **Типы томов** (`Volumes`) | Любые (включая `hostPath`) | Блокировка опасных типов | Только безопасные (`configMap`, `secret`, `emptyDir`, `pvc`) |
| **`allowPrivilegeEscalation`** | Разрешено (`true`) | Ограничено для SUID | Строго `false` |
| **`runAsNonRoot`** | Не требуется | Не требуется | Обязательно `true` |
| **`runAsUser`** | Любой | Любой | Только non-root (UID != 0) |
| **`capabilities`** | Разрешены любые | Запрет опасных (`CAP_SYS_ADMIN`) | Обязателен `drop: ["ALL"]` |
| **`seccompProfile`** | Не требуется | Не требуется | Обязательно `RuntimeDefault` / `Localhost` |
| **`readOnlyRootFilesystem`** | Не требуется | Не требуется | Рекомендуется |

#### Режимы применения PSA на уровне Namespace:

1. **`enforce`**: Нарушающие профиль Поды отклоняются при попытке создания.
2. **`warn`**: Создание ресурса разрешается, но выдается предупреждение в CLI.
3. **`audit`**: Нарушения фиксируются в логе аудита API-сервера без блокировки.

> [!note] Комбинирование режимов PSA
> Можно сочетать режимы на одном Namespace: например, `enforce=baseline` для предотвращения критических уязвимостей и одновременно `warn=restricted` + `audit=restricted` для информирования разработчиков о несоответствии наистрожайшим стандартам.

---

### 1.3. Политики (OPA Gatekeeper) и изолированные среды (Sandboxing)

#### Policy-as-Code с OPA Gatekeeper

Для проверки манифестов за рамками PSS (запрет тега `:latest`, валидация аннотаций, корпоративных меток) используется **OPA Gatekeeper**, работающий на двух CRD:

* **`ConstraintTemplate`**: Описывает логику проверки на языке **Rego** и схему параметров.
* **`Constraint`**: Экземпляр шаблона, задающий конкретные параметры проверки и область применения.

#### Изоляция на уровне Execution Environment (Sandboxing)

Стандартный рантайм `runc` использует общее ядро с хостом. Если в ядре есть уязвимость 0-day, процесса из `runc` может быть достаточно для компрометации узла. Для запуска недоверенного кода применяются защищенные песочницы:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Классический runc:                                                  │
│    [ Контейнер ] ───(прямые системные вызовы)───> [ Ядро Хоста ]      │
├────────────────────────────────────────────────────────────────────────┤
│ 2. gVisor (runsc):                                                     │
│    [ Контейнер ] ───> [ Sentry (Userspace Kernel в Go) ] ───> [ Хост ] │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Kata Containers:                                                    │
│    [ Контейнер ] ───> [ Собственное ядро Linux внутри Микро-ВМ (QEMU) ]│
└────────────────────────────────────────────────────────────────────────┘

```

* **`gVisor (runsc)`**: Перехватывает и обрабатывает системные вызовы контейнера в userspace-ядре (**Sentry** на Go), резко сокращая вектор атак на ядро хоста.
* **`Kata Containers`**: Запускает каждый Под в изолированной аппаратной микро-виртуальной машине (через QEMU или Cloud-Hypervisor) со своим оптимизированным ядром Linux.
* **`RuntimeClass`**: Объект API Kubernetes (`node.k8s.io/v1`), связывающий логическое имя рантайма с конфигурацией CRI на нодах кластера через поле `spec.runtimeClassName`.

> [!tip] Критерии выбора рантайма
> * **`runc`**: Максимальная производительность, нулевые накладные расходы. Подходит для доверенных микросервисов.
> * **`gVisor`**: Отличный выбор для недоверенных веб-приложений и фоновых обработчиков. Высокая скорость запуска при низкой памяти.
> * **`Kata Containers`**: Идеален для глубокой мультитенантности и запуска произвольного кода пользователей, где необходима аппаратная изоляция гипервизора.
> 
> 

---

## 2. Блок 2. Практическое применение

### 2.1. Практика 1: Идеальный манифест Пода со строгим Security Context

Манифест реализации профиля **Restricted**: запуск от non-root пользователя, `seccompProfile`, `readOnlyRootFilesystem`, политика `fsGroupChangePolicy` и сброс всех `capabilities`.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: secure-alpine-pod
  namespace: production
  labels:
    app.kubernetes.io/name: secure-app
spec:
  # Общие настройки контекста безопасности для всего Пода
  securityContext:
    runAsNonRoot: true              # Запрет запуска от root (UID 0)
    runAsUser: 1000                 # Численный UID
    runAsGroup: 3000                # Численный GID основной группы
    fsGroup: 2000                   # GID группы владельца томов
    fsGroupChangePolicy: "OnRootMismatch" # Изменение прав тома только при несоответствии root-директории
    supplementalGroups: [4000]      # Дополнительные GID
    supplementalGroupsPolicy: Strict # Не сливать группы из /etc/group (K8s >= 1.33)

  volumes:
  # Смонтированный emptyDir для записи временных данных
  - name: tmp-volume
    emptyDir: {}

  containers:
  - name: app-container
    image: alpine:3.19
    command: ["sh", "-c", "sleep 1h"]
    
    volumeMounts:
    - name: tmp-volume
      mountPath: /tmp
      
    # Точечные настройки безопасности конкретного контейнера
    securityContext:
      allowPrivilegeEscalation: false # Активирует no_new_privs в ядре (запрет SUID)
      readOnlyRootFilesystem: true    # Корневая файловая система "только для чтения"
      
      capabilities:
        drop:
        - "ALL"                       # Сброс всех привилегий ядра (БЕЗ префикса CAP_)
        
      seccompProfile:
        type: RuntimeDefault          # Стандартный профиль seccomp рантайма

```

---

### 2.2. Практика 2: Включение Pod Security Standards на уровне Namespace

#### Императивное управление метками через CLI (`kubectl`):

```bash
# Применение профиля Restricted в режиме блокировки (enforce) для prod
kubectl label namespace prod \
  pod-security.kubernetes.io/enforce=restricted \
  pod-security.kubernetes.io/enforce-version=latest

# Применение мягких режимов предупреждения (warn) и аудита (audit) для dev
kubectl label namespace dev \
  pod-security.kubernetes.io/warn=restricted \
  pod-security.kubernetes.io/warn-version=latest \
  pod-security.kubernetes.io/audit=restricted \
  pod-security.kubernetes.io/audit-version=latest

```

#### Декларативный манифест Namespace (YAML):

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    # Жесткий режим: блокировка Подов, не соответствующих профилю Restricted
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/enforce-version: latest
    # Мягкие режимы: информирование пользователя и фиксация в аудит-логе
    pod-security.kubernetes.io/warn: restricted
    pod-security.kubernetes.io/warn-version: latest
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/audit-version: latest

```

---

### 2.3. Практика 3: Использование OPA Gatekeeper и RuntimeClass

#### Создание OPA Gatekeeper `ConstraintTemplate` и `Constraint`

Правило Rego инспектирует каждый поступающий Под на наличие `readOnlyRootFilesystem: true` у всех контейнеров:

```yaml
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: k8srequiredreadonlyrootfilesystem
spec:
  crd:
    spec:
      names:
        kind: K8sRequiredReadOnlyRootFilesystem
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package k8srequiredreadonlyrootfilesystem

        violation[{"msg": msg}] {
          container := input.review.object.spec.containers[_]
          not container.securityContext.readOnlyRootFilesystem == true
          msg := sprintf("Контейнер '%v' обязан иметь параметр readOnlyRootFilesystem: true", [container.name])
        }
---
# Применение правила ко всем Подам в кластере
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: K8sRequiredReadOnlyRootFilesystem
metadata:
  name: enforce-readonly-root-fs
spec:
  match:
    kinds:
      - apiGroups: [""]
        kinds: ["Pod"]

```

#### Объявление и применение RuntimeClass

Создание ресурса `RuntimeClass` для запускa песочницы `gVisor (runsc)`:

```yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: gvisor
handler: runsc # Имя обработчика CRI на нодах кластера
---
# Манифест Пода, использующий gVisor для изоляции
apiVersion: v1
kind: Pod
metadata:
  name: isolated-gvisor-pod
  namespace: production
spec:
  runtimeClassName: gvisor # Переправление Пода в изолированную среду gVisor
  containers:
  - name: untrusted-app
    image: nginx:1.25-alpine
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      capabilities:
        drop:
        - "ALL"

```

---

### Итоговое резюме

```
[ Security Context (runAsNonRoot, readOnlyRootFS, drop caps) ]
                              │
                              ▼
[ Pod Security Admission (Профиль Restricted на уровне NS) ]
                              │
                              ▼
[ OPA Gatekeeper (Пользовательская валидация правил) ]
                              │
                              ▼
[ RuntimeClass / Sandboxing (gVisor / Kata Containers) ]

```

Обеспечение безопасности рабочих нагрузок основано на принципе эшелонированной защиты: комбинирование правил `SecurityContext`, системных профилей `Pod Security Admission`, пользовательской валидации через `OPA Gatekeeper` и аппаратной/пользовательской изоляции через `RuntimeClass` сводит к минимуму вектор атак и полностью соответствует стандартам CIS Kubernetes Benchmarks.