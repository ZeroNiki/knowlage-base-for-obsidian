# KUBERNETES: Практика RBAC (ServiceAccounts, Roles, ClusterRoles)

## Задание 1. Создание ServiceAccount
```bash
kubectl create namespace dev-enviroment
```

Манифест `service-account.yaml`:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ci-bot
  namespace: dev-enviroment
```

---

## Задание 2. Локальная роль и RoleBinding

Манифесты `role.yaml` и `role-binding.yaml`:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: dev-enviroment
  name: pod-reader
rules:
  - apiGroups: [""]
    resources: ["pods"]
    verbs: ["get", "watch", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ci-read-pods
  namespace: dev-enviroment
subjects:
  - kind: ServiceAccount
    name: ci-bot
    namespace: dev-enviroment
roleRef:
  kind: Role
  name: pod-reader 
  apiGroup: rbac.authorization.k8s.io

```

Проверка прав через `auth can-i`:

```bash
# Доступа нет (namespace default)
kubectl auth can-i get pods --as=system:serviceaccount:dev-enviroment:ci-bot -n default

# Доступ есть (namespace dev-enviroment)
kubectl auth can-i get pods --as=system:serviceaccount:dev-enviroment:ci-bot -n dev-enviroment

```

---

## Задание 3. ClusterRole и ClusterRoleBinding

Манифесты `cluster-role.yaml` и `cluster-role-binding.yaml`:

```yaml
apiVersion: rbac.authorization.k8s.io/v1 
kind: ClusterRole
metadata:
  name: node-watcher 
rules:
  - apiGroups: [""]
    resources: ["nodes"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding 
metadata:
  name: ci-read-nodes
  namespace: dev-enviroment
subjects:
  - kind: ServiceAccount
    name: ci-bot
    namespace: dev-enviroment
roleRef:
  kind: ClusterRole
  name: node-watcher 
  apiGroup: rbac.authorization.k8s.io
```

Проверка кластерных прав через `auth can-i` (без указания namespace):
```bash
kubectl auth can-i get nodes --as=system:serviceaccount:dev-enviroment:ci-bot
```

## Links
- [Using RBAC AUTH](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [RBAC offcial doc](https://kubernetes.io/docs/concepts/security/rbac-good-practices/)
- [[RBAC]]