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
