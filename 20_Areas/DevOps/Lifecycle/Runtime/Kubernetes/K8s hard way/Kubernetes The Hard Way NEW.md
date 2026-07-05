---
tags:
  - kubernetes
  - devops
  - k8s-the-hard-way
  - lab
date: 2026-07-05
status: completed
---

# Kubernetes: The Hard Way (Полное руководство по сборке)

## 1. Подготовка инфраструктуры

### Конфигурация Vagrant
Используется базовый образ `debian/bookworm64`. Выделено 4 ГБ ОЗУ на мастер-ноду и по 2 ГБ ОЗУ на воркеры.

```ruby
Vagrant.configure("2") do |config|
  config.vm.box = "debian/bookworm64"

  nodes = [
    { name: "jumpbox",   ip: "192.168.56.9",  memory: 1536, cpus: 1 },
    { name: "manager01", ip: "192.168.56.10", memory: 4096, cpus: 2 },
    { name: "worker01",  ip: "192.168.56.11", memory: 2048, cpus: 2 },
    { name: "worker02",  ip: "192.168.56.12", memory: 2048, cpus: 2 }
  ]

  nodes.each do |node|
    config.vm.define node[:name] do |vm|
      vm.vm.hostname = node[:name]
      vm.vm.network "private_network", ip: node[:ip]
      vm.vm.synced_folder ".", "/vagrant", disabled: true

      vm.vm.provider "virtualbox" do |vb|
        vb.name = node[:name]
        vb.memory = node[:memory]
        vb.cpus = node[:cpus]
        vb.customize ["modifyvm", :id, "--ioapic", "on"]
      end

      vm.vm.provision "shell", inline: <<-SHELL
        sed -i 's/#PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config
        sed -i 's/#PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config
        echo "root:root" | chpasswd
        systemctl restart sshd

        cat <<EOF >> /etc/hosts
192.168.56.9  jumpbox
192.168.56.10 manager01
192.168.56.11 worker01
192.168.56.12 worker02
EOF
      SHELL
    end
  end
end

```

### Подготовка на Jumpbox

Инициализация рабочей директории, загрузка необходимых бинарников и распаковка пакетов.

```bash
sudo -i

# Установка базовых утилит
apt-get update && apt-get install -y wget openssl git

# Клонирование репозитория с шаблонами
git clone https://github.com/kelseyhightower/kubernetes-the-hard-way.git
mv kubernetes-the-hard-way k8s-hw
cd k8s-hw
wget --show-progress -q --https-only --timestamping -P downloads -i downloads-amd64.txt
```

```bash
{
	ARCH=amd64
	mkdir -p downloads/{client,cni-plugins,controller,worker,worker/runc}
	tar -xvf downloads/cni-plugins-linux-${ARCH}-v1.6.2.tgz -C downloads/cni-plugins/
	tar -xvf downloads/etcd-v3.6.0-rc.3-linux-${ARCH}.tar.gz -C downloads/ \
	    --strip-components 1 \
	    etcd-v3.6.0-rc.3-linux-${ARCH}/etcdctl \
	    etcd-v3.6.0-rc.3-linux-${ARCH}/etcd
	mv downloads/{etcdctl,kubectl} downloads/client/
	mv downloads/{etcd,kube-apiserver,kube-controller-manager,kube-scheduler} downloads/controller/
	mv downloads/{kubelet,kube-proxy} downloads/worker/
	mv downloads/runc.${ARCH} downloads/worker/runc/runc
}

chmod +x downloads/client/* downloads/cni-plugins/* downloads/controller/* downloads/worker/*
```

### Генерация и распределение SSH-ключей

Выполняется на **jumpbox**:

```bash
cat <<EOF > machines.txt
192.168.56.9  jumpbox
192.168.56.10 manager01
192.168.56.11 worker01  10.244.1.0/24
192.168.56.12 worker02  10.244.2.0/24
EOF

ssh-keygen -t rsa -b 4096 -N "" -f ~/.ssh/id_rsa

PUB_KEY=$(cat ~/.ssh/id_rsa.pub)
for node in jumpbox manager01 worker01 worker02; do 
  ssh -o StrictHostKeyChecking=no vagrant@${node} "sudo mkdir -p /root/.ssh && echo '${PUB_KEY}' | sudo tee -a /root/.ssh/authorized_keys && sudo chmod 700 /root/.ssh && sudo chmod 600 /root/.ssh/authorized_keys"
done

while read -r ip name extra; do 
  ssh root@${name} "echo '${ip} ${name}' >> /etc/hosts"
done < machines.txt
```

---

## 2. Управление TLS-сертификатами

Генерация инфраструктуры открытых ключей (PKI) для взаимной TLS-аутентификации компонентов кластера.

### Генерация корневого сертификата (CA)

```bash
openssl genrsa -out ca.key 2048
openssl req -new -key ca.key -subj "/CN=Kubernetes-CA" -out ca.csr
openssl x509 -req -in ca.csr -signkey ca.key -CAcreateserial -out ca.crt -days 365

```

### Клиентские сертификаты (Admin, Proxy, Controller Manager, Scheduler)

```bash
{
	# Администратор (Права system:masters через RBAC)
	openssl genrsa -out admin.key 2048
	openssl req -new -key admin.key -subj "/CN=admin/O=system:masters" -out admin.csr
	openssl x509 -req -in admin.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out admin.crt -days 365
	
	# Kube-Proxy
	openssl genrsa -out kube-proxy.key 2048
	openssl req -new -key kube-proxy.key -subj "/CN=system:kube-proxy" -out kube-proxy.csr
	openssl x509 -req -in kube-proxy.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out kube-proxy.crt -days 365
	
	# Kube-Controller-Manager
	openssl genrsa -out kube-controller-manager.key 2048
	openssl req -new -key kube-controller-manager.key -subj "/CN=system:kube-controller-manager" -out kube-controller-manager.csr
	openssl x509 -req -in kube-controller-manager.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out kube-controller-manager.crt -days 365
	
	# Kube-Scheduler
	openssl genrsa -out kube-scheduler.key 2048
	openssl req -new -key kube-scheduler.key -subj "/CN=system:kube-scheduler" -out kube-scheduler.csr
	openssl x509 -req -in kube-scheduler.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out kube-scheduler.crt -days 365
}
```

### Сертификаты для Worker-нод (Node Authorizer)

```bash
{
	openssl genrsa -out worker01.key 2048
	openssl req -new -key worker01.key -subj "/CN=system:node:worker01/O=system:nodes" -out worker01.csr
	openssl x509 -req -in worker01.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out worker01.crt -days 365
	
	openssl genrsa -out worker02.key 2048
	openssl req -new -key worker02.key -subj "/CN=system:node:worker02/O=system:nodes" -out worker02.csr
	openssl x509 -req -in worker02.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out worker02.crt -days 365
}
```

### Сертификаты для Kube-APIServer и Service Accounts

```bash
{
	openssl genrsa -out service-accounts.key 2048
	openssl req -new -key service-accounts.key -subj "/CN=service-accounts" -out service-accounts.csr
	openssl x509 -req -in service-accounts.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out service-accounts.crt -days 365
}

cat <<EOF > kube-apiserver.cnf
[req]
req_extensions = v3_req
distinguished_name = req_distinguished_name
[req_distinguished_name]
[ v3_req ]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names
[alt_names]
DNS.1 = kubernetes
DNS.2 = kubernetes.default
DNS.3 = kubernetes.default.svc
DNS.4 = kubernetes.default.svc.cluster.local
DNS.5 = manager01
IP.1 = 127.0.0.1
IP.2 = 192.168.56.10
IP.3 = 10.32.0.1
EOF

{
	openssl genrsa -out kube-api-server.key 2048
	openssl req -new -key kube-api-server.key -subj "/CN=kubernetes" -config kube-apiserver.cnf -out kube-api-server.csr
	openssl x509 -req -in kube-api-server.csr \
	  -CA ca.crt -CAkey ca.key -CAcreateserial \
	  -extfile kube-apiserver.cnf -extensions v3_req \
	  -out kube-api-server.crt -days 365
}

```

### Доставка сертификатов на целевые хосты

```bash
# На воркеры
{
	scp ca.crt worker01.crt worker01.key root@worker01:/var/lib/kubelet/
	scp ca.crt worker02.crt worker02.key root@worker02:/var/lib/kubelet/
	scp ca.crt ca.key kube-api-server.crt kube-api-server.key service-accounts.key service-accounts.crt root@manager01:/var/lib/kubernetes/
}
```

---

## 3. Генерация конфигурационных файлов (Kubeconfigs)

### Создание конфигураций компонентов

```bash
# Генерация для Worker01 и Worker02
for hosts in worker01 worker02; do
  kubectl config set-cluster kubernetes-the-hard-way \
    --certificate-authority=ca.crt \
    --embed-certs=true \
    --server=[https://192.168.56.10:6443](https://192.168.56.10:6443) \
    --kubeconfig=${hosts}.kubeconfig
    
  kubectl config set-credentials system:node:${hosts} \
    --client-certificate=${hosts}.crt \
    --client-key=${hosts}.key \
    --embed-certs=true \
    --kubeconfig=${hosts}.kubeconfig
    
  kubectl config set-context default \
    --cluster=kubernetes-the-hard-way \
    --user=system:node:${hosts} \
    --kubeconfig=${hosts}.kubeconfig
  
  kubectl config use-context default \
    --kubeconfig=${hosts}.kubeconfig
done

{
	# Генерация для Kube-Proxy
	kubectl config set-cluster kubernetes-the-hard-way \
	  --certificate-authority=ca.crt \
	  --embed-certs=true \
	  --server=[https://192.168.56.10:6443](https://192.168.56.10:6443) \
	  --kubeconfig=kube-proxy.kubeconfig
	
	kubectl config set-credentials system:kube-proxy \
	  --client-certificate=kube-proxy.crt \
	  --client-key=kube-proxy.key \
	  --embed-certs=true \
	  --kubeconfig=kube-proxy.kubeconfig
	
	kubectl config set-context default \
	  --cluster=kubernetes-the-hard-way \
	  --user=system:kube-proxy \
	  --kubeconfig=kube-proxy.kubeconfig
	
	kubectl config use-context default \
	  --kubeconfig=kube-proxy.kubeconfig
}

{
	# Генерация для Kube-Controller-Manager
	kubectl config set-cluster kubernetes-the-hard-way \
	  --certificate-authority=ca.crt \
	  --embed-certs=true \
	  --server=[https://127.0.0.1:6443](https://127.0.0.1:6443) \
	  --kubeconfig=kube-controller-manager.kubeconfig
	
	kubectl config set-credentials system:kube-controller-manager \
	  --client-certificate=kube-controller-manager.crt \
	  --client-key=kube-controller-manager.key \
	  --embed-certs=true \
	  --kubeconfig=kube-controller-manager.kubeconfig
	
	kubectl config set-context default \
	  --cluster=kubernetes-the-hard-way \
	  --user=system:kube-controller-manager \
	  --kubeconfig=kube-controller-manager.kubeconfig
	
	kubectl config use-context default \
	  --kubeconfig=kube-controller-manager.kubeconfig
}

{
	# Генерация для Kube-Scheduler
	kubectl config set-cluster kubernetes-the-hard-way \
	  --certificate-authority=ca.crt \
	  --embed-certs=true \
	  --server=[https://127.0.0.1:6443](https://127.0.0.1:6443) \
	  --kubeconfig=kube-scheduler.kubeconfig
	
	kubectl config set-credentials system:kube-scheduler \
	  --client-certificate=kube-scheduler.crt \
	  --client-key=kube-scheduler.key \
	  --embed-certs=true \
	  --kubeconfig=kube-scheduler.kubeconfig
	
	kubectl config set-context default \
	  --cluster=kubernetes-the-hard-way \
	  --user=system:kube-scheduler \
	  --kubeconfig=kube-scheduler.kubeconfig
	
	kubectl config use-context default \
	  --kubeconfig=kube-scheduler.kubeconfig
}

{
	# Генерация для Администратора
	kubectl config set-cluster kubernetes-the-hard-way \
	  --certificate-authority=ca.crt \
	  --embed-certs=true \
	  --server=[https://127.0.0.1:6443](https://127.0.0.1:6443) \
	  --kubeconfig=admin.kubeconfig
	
	kubectl config set-credentials admin \
	  --client-certificate=admin.crt \
	  --client-key=admin.key \
	  --embed-certs=true \
	  --kubeconfig=admin.kubeconfig
	
	kubectl config set-context default \
	  --cluster=kubernetes-the-hard-way \
	  --user=admin \
	  --kubeconfig=admin.kubeconfig
	
	kubectl config use-context default \
	  --kubeconfig=admin.kubeconfig
}
```

### Доставка Кубконфигов

```bash
{
	# Распределение файлов по нодам
	ssh root@worker01 "mkdir -p /var/lib/kubelet /var/lib/kube-proxy"
	scp worker01.kubeconfig root@worker01:/var/lib/kubelet/kubeconfig
	scp kube-proxy.kubeconfig root@worker01:/var/lib/kube-proxy/kubeconfig
	
	ssh root@worker02 "mkdir -p /var/lib/kubelet /var/lib/kube-proxy"
	scp worker02.kubeconfig root@worker02:/var/lib/kubelet/kubeconfig
	scp kube-proxy.kubeconfig root@worker02:/var/lib/kube-proxy/kubeconfig
	
	ssh root@manager01 "mkdir -p /var/lib/kubernetes"
	scp kube-controller-manager.kubeconfig kube-scheduler.kubeconfig admin.kubeconfig root@manager01:/var/lib/kubernetes/
}
```

---

## 4. Настройка Encryption at Rest

Генерация конфигурационного файла поставщика шифрования секретов в etcd.

```bash
{
	export ENCRYPTION_KEY=$(head -c 32 /dev/urandom | base64)
	envsubst < configs/encryption-config.yaml > encryption-config.yaml
	scp encryption-config.yaml root@manager01:/var/lib/kubernetes/
}
```

---

## 5. Инициализация Базы Данных etcd

Выполняется локально на **`manager01`**. База данных функционирует по протоколу HTTP без внутреннего шифрации транспорта TLS (`--listen-client-urls http://127.0.0.1:2379`).

```bash
scp downloads/controller/etcd downloads/client/etcdctl units/etcd.service root@manager01:~/

{
	mkdir -p /etc/etcd /var/lib/etcd
	chmod 700 /var/lib/etcd
	cp etcd etcdctl /usr/local/bin/
	cp etcd.service /etc/systemd/system/
}

systemctl daemon-reload
systemctl enable --now etcd

# Важно: Обращение к etcdctl выполняется по протоколу HTTP
{
	export ETCDCTL_API=3
	etcdctl member list --endpoints=http://127.0.0.1:2379
}
```

---

## 6. Запуск Control Plane (Мастера)

Выполняется локально на **`manager01`**.

```bash
{
	scp downloads/controller/kube-apiserver \
		downloads/controller/kube-controller-manager \
		downloads/controller/kube-scheduler \
		downloads/client/kubectl \
		units/kube-apiserver.service \
		units/kube-controller-manager.service \
		units/kube-scheduler.service \
		configs/kube-apiserver-to-kubelet.yaml \
		root@manager01:~/
	
	cp kube-apiserver kube-controller-manager kube-scheduler kubectl /usr/local/bin/
	cp kube-apiserver.service kube-controller-manager.service kube-scheduler.service /etc/systemd/system/
}
```

### Создание обязательной конфигурации kube-scheduler

> [!danger] Критический фикс
> Без создания данного файла `kube-scheduler.service` завершится сбоем `status=1/FAILURE`, поскольку по умолчанию ищет схему конфигурации `/etc/kubernetes/config/kube-scheduler.yaml`.

```bash
mkdir -p /etc/kubernetes/config

cat <<EOF > /etc/kubernetes/config/kube-scheduler.yaml
apiVersion: kubescheduler.config.k8s.io/v1
kind: KubeSchedulerConfiguration
clientConnection:
  kubeconfig: /var/lib/kubernetes/kube-scheduler.kubeconfig
leaderElection:
  leaderElect: true
EOF

```

```bash
# Активация процессов ядра
systemctl daemon-reload
systemctl enable --now kube-apiserver kube-controller-manager kube-scheduler

# Инициализация локального профиля kubectl
mkdir -p ~/.kube
cp /var/lib/kubernetes/admin.kubeconfig ~/.kube/config
chmod 600 ~/.kube/config

# Настройка правил авторизации RBAC для Kubelet
kubectl apply -f kube-apiserver-to-kubelet.yaml

```

---

## 7. Конфигурация и запуск Worker-нод

Выполняется **И на `worker01`, И на `worker02**`.

```bash
# Установка обязательного системного окружения
apt-get update
apt-get install -y socat conntrack ipset
```

### Установка компонентов среды исполнения

Доставка файлов с **`jumpbox`**:

```bash
scp k8s-hw/downloads/worker/kubelet k8s-hw/downloads/worker/kube-proxy root@worker01:/usr/local/bin/
scp k8s-hw/downloads/worker/runc/runc root@worker01:/usr/local/bin/

scp k8s-hw/downloads/worker/kubelet k8s-hw/downloads/worker/kube-proxy root@worker02:/usr/local/bin/
scp k8s-hw/downloads/worker/runc/runc root@worker02:/usr/local/bin/
```

> [!danger] Исправление прав исполнения runc
> Утилита `runc` требует ручного назначения флага выполнения. Дополнительно создается глобальный симлинк в жесткий `$PATH` системных демонов.

```bash
chmod +x /usr/local/bin/kubelet /usr/local/bin/kube-proxy /usr/local/bin/runc
ln -sf /usr/local/bin/runc /usr/bin/runc
```

### Сетевые плагины (CNI)

```bash
mkdir -p /etc/cni/net.d /opt/cni/bin

# Выполняется на jumpbox:
scp -r k8s-hw/downloads/cni-plugins/* root@worker01:/opt/cni/bin/
scp -r k8s-hw/downloads/cni-plugins/* root@worker02:/opt/cni/bin/
```

**Конфигурация сетевого моста для `worker01`:**

```bash
cat <<EOF > /etc/cni/net.d/10-bridge.conf
{
    "cniVersion": "1.0.0",
    "name": "bridge",
    "type": "bridge",
    "bridge": "cnio0",
    "isGateway": true,
    "ipMasq": true,
    "ipam": {
        "type": "host-local",
        "ranges": [[{"subnet": "10.244.1.0/24"}]],
        "routes": [{"dst": "0.0.0.0/0"}]
    }
}
EOF

```

**Конфигурация сетевого моста для `worker02`:**

```bash
cat <<EOF > /etc/cni/net.d/10-bridge.conf
{
    "cniVersion": "1.0.0",
    "name": "bridge",
    "type": "bridge",
    "bridge": "cnio0",
    "isGateway": true,
    "ipMasq": true,
    "ipam": {
        "type": "host-local",
        "ranges": [[{"subnet": "10.244.2.0/24"}]],
        "routes": [{"dst": "0.0.0.0/0"}]
    }
}
EOF
```

**Конфигурация loopback (Одинаково для обоих воркеров):**

```bash
cat <<EOF > /etc/cni/net.d/99-loopback.conf
{
    "cniVersion": "1.0.0",
    "name": "lo",
    "type": "loopback"
}
EOF
```

### Конфигурация движка Containerd

```bash
# Распаковка containerd на jumpbox и пересылка:
mkdir -p /tmp/containerd-unpack
tar -xvf downloads/containerd-2.1.0-beta.0-linux-amd64.tar.gz -C /tmp/containerd-unpack/
scp /tmp/containerd-unpack/bin/* root@worker01:/bin/
scp /tmp/containerd-unpack/bin/* root@worker02:/bin/
rm -rf /tmp/containerd-unpack

# Копирование systemd юнитов для рабочих нод
scp units/containerd.service units/kubelet.service units/kube-proxy.service root@worker01:/etc/systemd/system/
scp units/containerd.service units/kubelet.service units/kube-proxy.service root@worker02:/etc/systemd/system/

chmod +x /bin/containerd* /bin/ctr
mkdir -p /etc/containerd

containerd config default > /etc/containerd/config.toml
sed -i 's/SystemdCgroup = false/SystemdCgroup = true/g' /etc/containerd/config.toml
```

### Конфигурация Kubelet

> [!warning] Настройка DNS
> Параметр `resolvConf` переопределен на глобальный файл `/etc/resolv.conf`. Попытка использовать значение по умолчанию `/run/systemd/resolve/resolv.conf` на чистых дистрибутивах вызовет циклическую ошибку создания сетевой песочницы: `FailedCreatePodSandBox`.

**Для `worker01`:**

```bash
cat <<EOF > /var/lib/kubelet/kubelet-config.yaml
kind: KubeletConfiguration
apiVersion: kubelet.config.k8s.io/v1beta1
authentication:
  anonymous: { enabled: false }
  webhook: { enabled: true }
  x509: { clientCAFile: /var/lib/kubelet/ca.crt }
authorization: { mode: Webhook }
clusterDomain: cluster.local
clusterDNS: [10.32.0.10]
cgroupDriver: systemd
podCIDR: 10.244.1.0/24
resolvConf: /etc/resolv.conf
runtimeRequestTimeout: "15m"
tlsCertFile: /var/lib/kubelet/worker01.crt
tlsPrivateKeyFile: /var/lib/kubelet/worker01.key
EOF
```

**Для `worker02`:**

```bash
cat <<EOF > /var/lib/kubelet/kubelet-config.yaml
kind: KubeletConfiguration
apiVersion: kubelet.config.k8s.io/v1beta1
authentication:
  anonymous: { enabled: false }
  webhook: { enabled: true }
  x509: { clientCAFile: /var/lib/kubelet/ca.crt }
authorization: { mode: Webhook }
clusterDomain: cluster.local
clusterDNS: [10.32.0.10]
cgroupDriver: systemd
podCIDR: 10.244.2.0/24
resolvConf: /etc/resolv.conf
runtimeRequestTimeout: "15m"
tlsCertFile: /var/lib/kubelet/worker02.crt
tlsPrivateKeyFile: /var/lib/kubelet/worker02.key
EOF
```

### Конфигурация Kube-Proxy

```bash
cat <<EOF > /var/lib/kube-proxy/kube-proxy-config.yaml
kind: KubeProxyConfiguration
apiVersion: kubeproxy.config.k8s.io/v1alpha1
clientConnection:
  kubeconfig: /var/lib/kube-proxy/kubeconfig
mode: iptables
clusterCIDR: 10.244.0.0/16
EOF
```

```bash
# Запуск системных служб
systemctl daemon-reload
systemctl enable --now containerd kubelet kube-proxy
```

---

## 8. Настройка статической маршрутизации подам

Маршрутизация трафика между изолированными CNI-подсетями `10.244.x.x` через физические сетевые интерфейсы нод.

```bash
# Находясь на Мастере (manager01):
# Маршрут к CNI-сети worker01
ip route add 10.244.1.0/24 via 192.168.56.11
# Маршрут к CNI-сети worker02
ip route add 10.244.2.0/24 via 192.168.56.12

# Находясь на worker01:
# Маршрут до сети соседа worker02
ip route add 10.244.2.0/24 via 192.168.56.12

# Находясь на worker02:
# Маршрут до сети соседа worker01
ip route add 10.244.1.0/24 via 192.168.56.11
```

---

## 9. Комплексный Smoke Test кластера

### Тест 1: Валидация статуса нод кластера

```bash
kubectl get nodes -o wide
```

Вывод должен подтвердить статус `Ready` для всех доступных воркеров.

### Тест 2: Проверка Encryption at Rest (Шифрование Секретов)

Создаем проверочный секрет:

```bash
kubectl create secret generic kubernetes-the-hard-way --from-literal=mykey=mydata
```

Запрашиваем сырые данные из базы etcd по протоколу HTTP:

```bash
ETCDCTL_API=3 etcdctl get /registry/secrets/default/kubernetes-the-hard-way \
  --endpoints=http://127.0.0.1:2379 | hexdump -C

```

*Критерий успеха:* Наличие префикса алгоритма шифрования `k8s:enc:aescbc:v1:key1`. Прямое чтение строки `mydata` невозможно.

### Тест 3: Запуск и проверка распределения рабочей нагрузки

Создаем Deployment веб-сервера:

```bash
kubectl create deployment nginx --image=nginx
```

Мониторинг планирования и запуска:

```bash
kubectl get pods -o wide
```

*Критерий успеха:* Под переходит в статус `1/1 Running`, получает внутренний CNI IP-адрес из диапазона привязанной ноды.

### Тест 4: Валидация сетевой связности подов

Запуск тестовых контейнеров на разных физических хостах и пинг сетевых интерфейсов напрямую:

```bash
kubectl run test-pod-1 --image=alpine --restart=Never --overrides='{"spec": {"nodeName": "worker01"}}' -- sleep 3600
kubectl run test-pod-2 --image=alpine --restart=Never --overrides='{"spec": {"nodeName": "worker02"}}' -- sleep 3600

# Выполнение пинга с pod-1 на внутренний IP-адрес pod-2
kubectl exec -it test-pod-1 -- ping -c 3 <IP_АДРЕС_TEST_POD_2>
```

### Тест 5: Доступность приложения через Port-Forward (Мастер -> Кubelet)

```bash
kubectl port-forward deployment/nginx 8080:80
# В соседнем терминале проверяем ответ от веб-сервера:
curl http://127.0.0.1:8080
```

### Тест 6: Сетевые правила проксирования (Кластерные Сервисы)

Опубликуем наше приложение внутри сети кластера через компонент `kube-proxy`:

```bash
kubectl expose deployment nginx --port 80 --type=NodePort

# Получаем выделенный порт NodePort
kubectl get svc nginx

# Запрос к веб-серверу по внешнему IP-адресу любой ноды и выделенному порту NodePort
curl http://192.168.56.11:<ВЫДЕЛЕННЫЙ_NODEPORT>
```