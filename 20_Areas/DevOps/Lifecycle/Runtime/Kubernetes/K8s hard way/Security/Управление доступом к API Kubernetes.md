---
tags:
* k8s
* security
* rbac
* cka
* obsidian
---

# Управление доступом к API Kubernetes: Аутентификация, Авторизация и Ролевая модель (RBAC)

---

## 1. Блок 1. Теория простыми словами

### 1.1. Жизненный цикл запроса к API Server

Понимание точной последовательности обработки входящих HTTP-запросов компонентом `kube-apiserver` составляет фундамент безопасности инфраструктуры Kubernetes. Каждое обращение к API — будь то команда `kubectl`, запрос от контроллера или внутрикластерное взаимодействие Pod'а — проходит через строгий многоступенчатый конвейер проверки.

```
                     [ Входящий HTTP-запрос ]
                                │
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ 1. Transport Security (TLS / mTLS)                         │
 │    • Порт: 6443                                             │
 │    • Флаги: --tls-cert-file, --client-ca-file               │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ 2. Authentication (Аутентификация) — "Кто ты?"            │
 │    • Проверка подлинности (X.509, SA tokens, OIDC)          │
 │    • Определение субъекта (User / ServiceAccount, Groups)  │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ 3. Authorization (Авторизация) — "Что тебе можно?"          │
 │    • Проверка прав доступа (RBAC / ABAC / Webhook)          │
 │    • Оценка: Verb + API Group + Resource + Namespace        │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ 4. Admission Control (Контроллеры допуска)                 │
 │    • Mutating Webhooks (модификация объекта)                │
 │    • Validating Webhooks & PSA (валидация правил)           │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                                ▼
                        [ Запись в etcd ]

```

#### Последовательность этапов:

1. **TLS-соединение (Transport Security):**
* По умолчанию `kube-apiserver` принимает входящие запросы по защищенному протоколу TLS через порт `6443` (задается флагами `--secure-port` и `--bind-address`).
* Сервер предъявляет клиентской стороне X.509-сертификат и ключ (`--tls-cert-file`, `--tls-private-key-file`).
* Для проверки подлинности клиентских сертификатов при mTLS используется `--client-ca-file`. Клиент проверяет сервер через CA, прописанный в `~/.kube/config`.


2. **Authentication (Аутентификация):**
* Модули аутентификации (Authenticators) проверяют подлинность источника запроса и определяют субъект (*Identity*): имя пользователя, идентификатор сервисного аккаунта, принадлежащие группы.


3. **Authorization (Авторизация):**
* API Server проверяет, имеет ли субъект право выполнять запрашиваемую операцию (`Verb`: `get`, `list`, `create`, `delete` и т. д.) над конкретным ресурсом (`pods`, `services`, `secrets`) в заданном `Namespace`. Основной механизм — **RBAC**.


4. **Admission Control (Контроллеры допуска):**
* Цепочка контроллеров (Mutating/Validating Admission Webhooks, Pod Security Admission).
* *Mutating* — могут изменять объект (подставлять значения по умолчанию, инжектировать sidecar-контейнеры).
* *Validating* — проверяют соответствие объекта политикам безопасности (`PodSecurityContext`, `ValidatingAdmissionPolicy`).
* Только после этого объект сохраняется в **etcd**.



> [!tip] Authentication vs Authorization
> * **Authentication (Аутентификация):** *"Кто ты такой?"* — процесс идентификации субъекта на основе предъявленных учетных данных (TLS-сертификат, токен ServiceAccount и т. д.). Результат — определение **Username** и **Groups**.
> * **Authorization (Авторизация):** *"Что тебе разрешено делать?"* — процесс сопоставления идентифицированного субъекта с набором разрешений на выполнение действий над объектами API кластера.
> 
> 

---

### 1.2. Способы аутентификации (Identity) в Kubernetes

В Kubernetes разделяются два типа субъектов доступа: внешние физические пользователи и внутренние автоматизированные процессы внутри Pod'ов.

```
                         ┌───────────────────────┐
                         │   Kubernetes Identity │
                         └───────────┬───────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
┌───────────────────────┐                           ┌───────────────────────┐
│ External Users        │                           │ Service Accounts      │
│ (Физические лица)     │                           │ (Приложения / Pods)   │
├───────────────────────┤                           ├───────────────────────┤
│ • X.509 Сертификаты   │                           │ • Управляются K8s API │
│ • OIDC (Keycloak/Okta)│                           │ • Изолированы в NS    │
│ • Нет базы в etcd     │                           │ • Токен внутри Pod'а  │
└───────────────────────┘                           └───────────────────────┘

```

#### Разбор методов аутентификации:

* **X.509 Client Certificates:**
* Основной способ для внешних пользователей. В Kubernetes **нет встроенного реестра пользователей** (базы данных пользователей в etcd нет).
* `kube-apiserver` доверяет сертификатам, подписанным CA из `--client-ca-file`.
* Поле `CN` (Common Name) = **Username** (например, `CN=developer`).
* Поле `O` (Organization) = **Group** (например, `O=devs`).


* **Service Accounts (SA):**
* Ресурсы Kubernetes, создаваемые и управляемые напрямую через API в конкретных `Namespaces`.
* Предназначены для аутентификации приложений и контроллеров.
* Внутри Pod'а токен аккаунта (`BoundServiceAccountToken`) автоматически монтируется в файловую систему контейнера для безопасной работы с API.


* **OIDC (OpenID Connect):**
* Интеграция с внешними IdP (Keycloak, Okta, Dex).
* Использование корпоративного каталога пользователей с аутентификацией через короткоживущие токены OAuth2/OIDC.



> [!warning] Риски статических сертификатов X.509
> Сертификаты X.509 не имеют встроенного в Kubernetes механизма отзыва (CRL / OCSP). При компрометации ключа единственный способ блокировки — отзыв всего CA кластера или перекрытие прав через RBAC. В отличие от X.509, токены ServiceAccount и OIDC подлежат автоматической ротации.

---

### 1.3. Ролевая модель (RBAC) и принцип наименьших привилегий

RBAC построен на **Принципе наименьших привилегий** (*Principle of Least Privilege*): каждому субъекту предоставляется минимально необходимый набор прав для выполнения его задач.

#### Сравнительный анализ объектов RBAC:

| Объект RBAC | Область видимости (Scope) | Назначение |
| --- | --- | --- |
| **`Role`** | `Namespace Scope` | Определяет набор разрешений (`apiGroups`, `resources`, `verbs`) строго внутри одного `Namespace`. |
| **`ClusterRole`** | `Cluster Scope` | Определяет разрешения на уровне всего кластера (для `Node`, `PersistentVolume` или как шаблон). |
| **`RoleBinding`** | `Namespace Scope` | Связывает `Role` или `ClusterRole` с субъектами (`User`, `Group`, `ServiceAccount`) в рамках одного `Namespace`. |
| **`ClusterRoleBinding`** | `Cluster Scope` | Связывает `ClusterRole` с субъектами на уровне всего кластера во всех пространстве имен. |

#### Паттерн: Связывание `ClusterRole` через `RoleBinding`

```
┌────────────────────────────────────────────────────────┐
│ ClusterRole: admin / edit / view / custom-cluster-role │
└───────────────────────────┬────────────────────────────┘
                            │
              Связывание через RoleBinding
                            │
                            ▼
      ┌──────────────────────────────────────────┐
      │ RoleBinding (в Namespace "dev")          │
      └─────────────────────┬────────────────────┘
                            │
                            ▼
      ┌──────────────────────────────────────────┐
      │ Subject: User / ServiceAccount           │
      │ (Права ограничены только Namespace "dev")│
      └──────────────────────────────────────────┘

```

* **Механика:** Создается общая `ClusterRole` (или берутся встроенные `view`, `edit`, `admin`), после чего в конкретном `Namespace` создается `RoleBinding`, ссылающийся на эту `ClusterRole`.
* **Польза:** Позволяет повторно использовать типы ролей без дублирования одинаковых манифестов `Role` в десятках пространствах имен, при этом права субъекта строго ограничиваются рамками целевого `Namespace`.

---

## 2. Блок 2. Практическое применение

### 2.1. Практика 1: Создание пользователя через X.509 + Certificates API (CSR)

Выпуск пользовательских сертификатов через внутренний API Kubernetes (`CertificateSigningRequest`) позволяет предоставлять доступ без передачи закрытых ключей Root CA.

#### Пошаговый алгоритм:

1. **Генерация приватного ключа и CSR через OpenSSL:**
```bash
openssl genrsa -out developer.key 2048
openssl req -new -key developer.key -out developer.csr -subj "/CN=developer/O=devs"

```


2. **Создание K8s YAML-манифеста `CertificateSigningRequest`:**
```bash
cat <<EOF | kubectl apply -f -
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: developer-csr
spec:
  request: $(cat developer.csr | base64 | tr -d '\r\n')
  signerName: kubernetes.io/kube-apiserver-client
  expirationSeconds: 86400
  usages:
  - client auth
EOF

```


3. **Одобрение запроса администратором:**
```bash
kubectl certificate approve developer-csr

```


4. **Извлечение готового сертификата:**
```bash
kubectl get csr developer-csr -o jsonpath='{.status.certificate}' | base64 --decode > developer.crt

```



> [!tip] Проверка выпущенного сертификата
> Всегда проверяйте содержимое полей перед передачей пользователю:
> ```bash
> openssl x509 -in developer.crt -text -noout
> 
> ```
> 
> 
> Убедитесь в наличии строки: `Subject: CN = developer, O = devs`.

---

### 2.2. Практика 2: Настройка RBAC и ServiceAccount (Единый YAML-манифест)

Манифест, объединяющий создание `ServiceAccount`, `Role` и `RoleBinding` в пространстве имен `dev`:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: app-reader
  namespace: dev
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-read-only
  namespace: dev
rules:
- apiGroups: [""]        # Core API Group (Pods, Services, ConfigMaps)
  resources: ["pods"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods-binding
  namespace: dev
subjects:
- kind: ServiceAccount
  name: app-reader
  namespace: dev
roleRef:
  kind: Role
  name: pod-read-only
  apiGroup: rbac.authorization.k8s.io

```

---

### 2.3. Практика 3: Команды генерации, проверки прав и отладки

#### Императивная генерация заготовок (Dry-run):

```bash
# Генерация Role
kubectl create role pod-read-only \
  --verb=get,list,watch \
  --resource=pods \
  -n dev \
  --dry-run=client -o yaml > role.yaml

# Генерация RoleBinding
kubectl create rolebinding read-pods-binding \
  --role=pod-read-only \
  --serviceaccount=dev:app-reader \
  -n dev \
  --dry-run=client -o yaml > rolebinding.yaml

```

#### Проверка прав доступа (`kubectl auth can-i`):

```bash
# Проверка собственных прав текущего контекста
kubectl auth can-i get pods

# Имперсонация физического пользователя
kubectl auth can-i list secrets --as=developer

# Имперсонация сервисного аккаунта в конкретном Namespace
kubectl auth can-i delete pods --as=system:serviceaccount:dev:app-reader -n dev

```

> [!warning] Алгоритм отладки при ошибках HTTP 403 Forbidden
> Если при обращении к API возвращается `403 Forbidden`, примените следующий чек-лист:
> 1. **Проверка субъекта:** Проверьте через `kubectl auth can-i ... --as=...`, от какого имени выполняется запрос.
> 2. **Проверка Namespace:** Убедитесь, что `RoleBinding` создан в правильном `Namespace` (права из `default` не действуют в `dev`).
> 3. **Проверка API Group и ресурсов:** Проверьте `apiGroup` (например, `apps` для `Deployments`, `""` для `Pods`).
> 4. **Проверка Verbs:** Проверьте соответствие запрашиваемого действия (`get`, `list`, `create`, `delete`).
> 5. **Ресурсы vs Субресурсы:** Права на `pods` **не дают** доступ к субресурсам. Для просмотра логов или `exec` в роли должны быть явно прописаны `pods/log` или `pods/exec`.
> 
> 

---

### Итоговое резюме

```
[ TLS (Шифрование канала) ]
          │
          ▼
[ Authentication (Проверка подлинности) ]
          │
          ▼
[ Authorization / RBAC (Ограничение прав) ]
          │
          ▼
[ Admission Control (Валидация объектов) ]
```

Надежная архитектура безопасности Kubernetes выстраивается на последовательной цепочке проверок, обеспечивая защиту инфраструктуры на каждом этапе обращения к API.