## Виды установок K8S
## Подготовка
- Подготовка машин
```ruby
Vagrant.configure("2") do |config|
  config.vm.box = "debian/bookworm64" # Debian 12 (как в видео)

  # Конфигурация нод. Уменьшил память для воркеров, чтобы твой Arch не задохнулся.
  # Для "голых" бинарников без тяжелых оберток 2ГБ на воркер и 4ГБ на мастер — с головой.
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
      
      # Отключаем синхронизацию папок по умолчанию, чтобы не было конфликтов прав root
      vm.vm.synced_folder ".", "/vagrant", disabled: true

      vm.vm.provider "virtualbox" do |vb|
        vb.name = node[:name]
        vb.memory = node[:memory]
        vb.cpus = node[:cpus]
        vb.customize ["modifyvm", :id, "--ioapic", "on"]
      end

      # Скрипт базовой подготовки (выполняется при vagrant up)
      vm.vm.provision "shell", inline: <<-SHELL
        # 1. Разрешаем root доступ по SSH по паролю (как в лабе у автора)
        sed -i 's/#PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config
        sed -i 's/#PasswordAuthentication.*/PasswordAuthentication yes/' /etc/ssh/sshd_config
        echo "root:root" | chpasswd # Задаем пароль root:root
        systemctl restart sshd

        # 2. Прописываем etc/hosts на каждой машине (автор делал это руками)
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

- На jumbox
```bash
sudo -i

# 1. Установка базовых утилит
apt-get update && apt-get install -y wget openssl git

# 2. Клонирование оригинального репозитория с шаблонами конфигов
git clone https://github.com/kelseyhightower/kubernetes-the-hard-way.git
mv kubernetes-the-hard-way k8s-hw
cd k8s-hw
wget --show-progress -q --https-only --timestamping -P downloads -i downloads-amd64.txt
```

- Распоковка

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

chmod +x downloads/{client,cni-plugins,controller,worker}/*
```

## Машины

```bash
cat <<EOF > machines.txt
192.168.56.9  jumpbox
192.168.56.10 manager01
192.168.56.11 worker01  10.200.1.0/24
192.168.56.12 worker02  10.200.2.0/24
EOF
```

на все машина 
```bash
sudo sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin yes/' /etc/ssh/sshd_config
```

```bash
ssh-keygen -t rsa -b 4096 -N "" -f ~/.ssh/id_rsa
```

.ssh/.pub перенесем в ручную на все машины
и выполним комманду
```bash
PUB_KEY=$(cat ~/.ssh/id_rsa.pub)
for node in jumpbox manager01 worker01 worker02; do ssh -o StrictHostKeyChecking=no vagrant@${node} "sudo mkdir -p /root/.ssh && echo '${PUB_KEY}' | sudo tee -a /root/.ssh/authorized_keys && sudo chmod 700 /root/.ssh && sudo chmod 600 /root/.ssh/authorized_keys" done
```

```bash
while read -r ip name extra; do ssh root@${name} "echo '${ip} ${name}' >> /etc/hosts" done < machines.txt
```

## серты
кубер не кому не доверяет поэтому генерим серты
- 1. Генерация приватного ключа и сертификата CA (Корневой сертификат кластера)
```bash
openssl genrsa -out ca.key 2048
openssl req -new -key ca.key -subj "/CN=Kubernetes-CA" -out ca.csr
openssl x509 -req -in ca.csr -signkey ca.key -CAcreateserial -out ca.crt -days 365
```

- 2. Генерация сертификатов для клиентов (Admin, Kube-Proxy, Controller-Manager, Scheduler)
- (Для каждого генерируется .key -> .csr -> .crt с помощью ca.crt и ca.key)
```bash
openssl genrsa -out admin.key 2048
openssl req -new -key admin.key -subj "/CN=admin/O=system:masters" -out admin.csr
openssl x509 -req -in admin.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out admin.crt -days 365
```

- 3. Генерация уникальных сертификатов для КАЖДОГО воркера (Node Authorizer)
- В сертификат обязательно закладывается CN=system:node:<имя_ноды>

```bash
openssl genrsa -out worker01.key 2048
openssl req -new -key worker01.key -subj "/CN=system:node:worker01/O=system:nodes" -out worker01.csr ...

openssl genrsa -out worker02.key 2048
openssl req -new -key worker02.key -subj "/CN=system:node:worker02/O=system:nodes" -out worker02.csr

openssl x509 -req -in worker01.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out worker01.crt -days 365
openssl x509 -req -in worker02.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out worker02.crt -days 365
```

- 4. Отправка сертификатов на ноды кластера (где они будут использоваться)
- Воркеры получают CA и свои личные ключи
``` bash
scp ca.crt worker01.crt worker01.key root@worker01:/var/lib/kubelet/
scp ca.crt worker02.crt worker02.key root@worker02:/var/lib/kubelet/
```

- Мастер получает ключи для API-сервера и сервисных аккаунтов
```bash
openssl genrsa -out service-accounts.key 2048
openssl req -new -key service-accounts.key -subj "/CN=service-accounts" -out service-accounts.csr
openssl x509 -req -in service-accounts.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out service-accounts.crt -days 365

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
	openssl genrsa -out kube-proxy.key 2048
	openssl req -new -key kube-proxy.key -subj "/CN=system:kube-proxy" -out kube-proxy.csr
	openssl x509 -req -in kube-proxy.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out kube-proxy.crt -days 365
}

{
	openssl genrsa -out kube-controller-manager.key 2048
	openssl req -new -key kube-controller-manager.key -subj "/CN=system:kube-controller-manager" -out kube-controller-manager.csr
	openssl x509 -req -in kube-controller-manager.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out kube-controller-manager.crt -days 365
}

{
openssl genrsa -out kube-scheduler.key 2048
openssl req -new -key kube-scheduler.key -subj "/CN=system:kube-scheduler" -out kube-scheduler.csr
openssl x509 -req -in kube-scheduler.csr -CA ca.crt -CAkey ca.key -CAcreateserial -out kube-scheduler.crt -days 365
}

{
openssl genrsa -out kube-api-server.key 2048
openssl req -new -key kube-api-server.key -subj "/CN=kubernetes" -config kube-apiserver.cnf -out kube-api-server.csr
openssl x509 -req -in kube-api-server.csr \
  -CA ca.crt -CAkey ca.key -CAcreateserial \
  -extfile kube-apiserver.cnf -extensions v3_req \
  -out kube-api-server.crt -days 365
}

scp ca.crt ca.key kube-api-server.crt kube-api-server.key service-accounts.key service-accounts.crt root@manager01:/var/lib/kubernetes/
```

## Создание Кубконфигов (Kubeconfigs)

### ЭТАП 1: Создание всех Kubeconfig-файлов

Перед запуском убедись, что в твоей текущей папке лежат созданные ранее `.crt` и `.key` файлы для всех компонентов.

#### 1. Для рабочих нод (`worker01` и `worker02`)

Этот цикл сгенерирует уникальный конфиг для каждого воркера, привязав к нему его личный сертификат. Они будут стучаться на внешний IP мастера (`192.168.56.10`).

Bash

```bash
for hosts in worker01 worker02; do
  kubectl config set-cluster kubernetes-the-hard-way \
    --certificate-authority=ca.crt \
    --embed-certs=true \
    --server=https://192.168.56.10:6443 \
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
```

#### 2. Для сетевого плагина (`kube-proxy`)

Этот конфиг тоже настроен на внешний IP мастера, так как прокси работает на воркерах.

Bash

```
{
	kubectl config set-cluster kubernetes-the-hard-way \
	  --certificate-authority=ca.crt \
	  --embed-certs=true \
	  --server=https://192.168.56.10:6443 \
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
```

#### 3. Для менеджера контроллеров (`kube-controller-manager`)

Этот и следующие компоненты живут на мастере, поэтому они общаются с API локально через `127.0.0.1`.


```bash
{
	kubectl config set-cluster kubernetes-the-hard-way \
	  --certificate-authority=ca.crt \
	  --embed-certs=true \
	  --server=https://127.0.0.1:6443 \
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
```

#### 4. Для планировщика (`kube-scheduler`)
```bash
{
	kubectl config set-cluster kubernetes-the-hard-way \
	  --certificate-authority=ca.crt \
	  --embed-certs=true \
	  --server=https://127.0.0.1:6443 \
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
```

#### 5. Для Администратора (`admin`)
```bash
{
	kubectl config set-cluster kubernetes-the-hard-way \
	  --certificate-authority=ca.crt \
	  --embed-certs=true \
	  --server=https://127.0.0.1:6443 \
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

### ЭТАП 2: Распределение файлов по нодам (Доставка)

Теперь созданные файлы нужно разложить по целевым серверам. Мы переименовываем файлы для воркеров прямо во время отправки в стандартное имя `kubeconfig`, чтобы службы `systemd` смогли их прочитать без костылей.

#### 1. Отправка на `worker01`:
```bash
{
	ssh root@worker01 "mkdir -p /var/lib/kubelet /var/lib/kube-proxy"
	scp worker01.kubeconfig root@worker01:/var/lib/kubelet/kubeconfig
	scp kube-proxy.kubeconfig root@worker01:/var/lib/kube-proxy/kubeconfig
}
```

#### 2. Отправка на `worker02`:
```bash
{
	ssh root@worker02 "mkdir -p /var/lib/kubelet /var/lib/kube-proxy"
	scp worker02.kubeconfig root@worker02:/var/lib/kubelet/kubeconfig
	scp kube-proxy.kubeconfig root@worker02:/var/lib/kube-proxy/kubeconfig
}
```

#### 3. Отправка на Мастер (`manager01`):
```bash
{
	ssh root@manager01 "mkdir -p /var/lib/kubernetes"
	scp kube-controller-manager.kubeconfig kube-scheduler.kubeconfig admin.kubeconfig root@manager01:/var/lib/kubernetes/
}
```

### ЭТАП 3: Проверка результатов
Убедись, что на удаленных нодах файлы заняли свои места. Запусти эти три команды проверки:
```bash
{
	ssh root@worker01 "ls -l /var/lib/kubelet/kubeconfig /var/lib/kube-proxy/kubeconfig"
	ssh root@worker02 "ls -l /var/lib/kubelet/kubeconfig /var/lib/kube-proxy/kubeconfig"
	ssh root@manager01 "ls -l /var/lib/kubernetes/*.kubeconfig"
}
```

## Настройка Encryption at Rest (Шифрование данных в etcd)
```bash
export ENCRYPTION_KEY=$(head -c 32 /dev/urandom | base64)

envsubst < configs/encryption-config.yaml > encryption-config.yaml

scp encryption-config.yaml root@manager01:/var/lib/kubernetes/
```

## Шаг 6: Запуск базы данных etcd (на Мастере)
Выполняется на хосте `manager01`.

```bash
scp downloads/controller/etcd downloads/client/etcdctl units/etcd.service root@manager01:~/

{
	mkdir -p /etc/etcd /var/lib/etcd
	chmod 700 /var/lib/etcd
	
	# 1. Перемещение бинарников базы данных
	cp etcd etcdctl /usr/local/bin/
	
	# 2. Настройка systemd юнита для etcd (шаблон etcd.service берется из репозитория)
	cp etcd.service /etc/systemd/system/
}

# 3. Запуск службы etcd
{
	systemctl daemon-reload
	systemctl enable --now etcd
}

# 4. Проверка здоровья базы данных TLS-запросом
ETCDCTL_API=3 etcdctl member list \
  --endpoints=https://127.0.0.1:2379 \
  --cacert=/var/lib/kubernetes/ca.crt \
  --cert=/var/lib/kubernetes/kube-apiserver.crt \
  --key=/var/lib/kubernetes/kube-apiserver.key
```

## Шаг 7: Запуск Control Plane (Мастера)
Выполняется на хосте `manager01`. Запуск основных компонентов управления кластером.
```bash
scp downloads/controller/kube-apiserver \
	downloads/controller/kube-controller-manager \
	downloads/controller/kube-scheduler \
	downloads/client/kubectl \
	units/kube-apiserver.service \
	units/kube-controller-manager.service \
	units/kube-scheduler.service \
	configs/kube-scheduler.yaml \
	configs/kube-apiserver-to-kubelet.yaml \
	root@manager01:~/

# 1. Копирование бинарников мастера в системные пути
cp kube-apiserver kube-controller-manager kube-scheduler kubectl /usr/local/bin/

# 2. Размещение конфигураций systemd сервисов
{
	cp kube-apiserver.service /etc/systemd/system/
	cp kube-controller-manager.service /etc/systemd/system/
	cp kube-scheduler.service /etc/systemd/system/
}


# 3. Запуск процессов мастера
{
	systemctl daemon-reload
	systemctl enable --now kube-apiserver kube-controller-manager kube-scheduler
}

kubectl cluster-info --kubeconfig /var/lib/kubernetes/admin.kubeconfig

{
	mkdir -p ~/.kube
	cp /var/lib/kubernetes/admin.kubeconfig ~/.kube/config
	chmod 600 ~/.kube/config
}

# 4. Настройка прав RBAC для связи API-сервера с Kubelet (выполняется через kubectl)
kubectl apply -f kube-apiserver-to-kubelet.yaml

# 5. Проверка работоспособности мастера напрямую через HTTPS (без kubectl)
curl --cacert /var/lib/kubernetes/ca.crt https://127.0.0.1:6443/version
```

## Настройка и подключение Worker-нод
Переходим к настройке рабочих нод (`worker01` и `worker02`). Сейчас мы превратим эти голые виртуалки в полноценные рабочие лошадки Kubernetes. Нам нужно установить зависимости, сетевые плагины (CNI), `runc`, контейнерный движок (`containerd`) и сам `kubelet` с `kube-proxy`.

Все следующие шаги нужно выполнить **И на `worker01`, И на `worker02**`.

Для удобства открой две вкладки терминала, зайди на обе ноды под `root` (`vagrant ssh worker01 -> sudo su -`) и выполняй команды параллельно.

---

### Шаг 1: Установка системных зависимостей

Kubelet и контейнерные движки требуют наличия утилит для управления сетью и фильтрации трафика.

```bash
apt-get update
apt-get install -y socat conntrack ipset

```

---

### Шаг 2: Раскладываем бинарники по местам

Помнишь, в самом начале мы готовили папку `downloads/` на джампбоксе? Скрипт разложил файлы для воркеров в `downloads/worker/`. Перенеси их (если они ещё не там) или просто убедись, что они скопированы в системные папки воркеров.

Если ты этого ещё не сделал, выполни на **`jumpbox`**:

```bash
# Копируем бинарники на worker01
scp k8s-hw/downloads/worker/kubelet k8s-hw/downloads/worker/kube-proxy root@worker01:/usr/local/bin/
scp k8s-hw/downloads/worker/runc/runc root@worker01:/usr/local/bin/

# Копируем бинарники на worker02
scp k8s-hw/downloads/worker/kubelet k8s-hw/downloads/worker/kube-proxy root@worker02:/usr/local/bin/
scp k8s-hw/downloads/worker/runc/runc root@worker02:/usr/local/bin/

```

*Не забудь сделать их исполняемыми на самих воркерах:*

```bash
chmod +x /usr/local/bin/kubelet /usr/local/bin/kube-proxy /usr/local/bin/runc

```

---

### Шаг 3: Настройка CNI Plugins (Сетевые плагины)

Создаем директории для CNI и распаковываем туда сетевые утилиты (мы их распаковывали на джампбоксе в `downloads/cni-plugins/`):

```bash
# На каждом воркере создаем папки
mkdir -p /etc/cni/net.d /opt/cni/bin

# Переносим плагины с jumpbox (выполнить на jumpbox):
{
	scp -r k8s-hw/downloads/cni-plugins/* root@worker01:/opt/cni/bin/
	scp -r k8s-hw/downloads/cni-plugins/* root@worker02:/opt/cni/bin/
}
```

Теперь сконфигурируем стандартную сеть **Bridge** для подов.

> **Критически важно:** У каждого воркера должен быть свой уникальный подсетевой диапазон (Pod CIDR).

* Для `worker01` это будет `10.244.1.0/24`
* Для `worker02` это будет `10.244.2.0/24`

**Команда для `worker01`:**

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
        "ranges": [
          [{"subnet": "10.244.1.0/24"}]
        ],
        "routes": [{"dst": "0.0.0.0/0"}]
    }
}
EOF
```

**Команда для `worker02`:**

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
        "ranges": [
          [{"subnet": "10.244.2.0/24"}]
        ],
        "routes": [{"dst": "0.0.0.0/0"}]
    }
}
EOF
```

Создаем loopback-конфиг (одинаковый для **обоих** воркеров):

```bash
cat <<EOF > /etc/cni/net.d/99-loopback.conf
{
    "cniVersion": "1.0.0",
    "name": "lo",
    "type": "loopback"
}
EOF

```

---

### Шаг 4: Настройка Containerd

Поскольку современные версии Kubernetes работают через CRI (Container Runtime Interface), мы настроим `containerd`.

```bash
{
	# 1. Создаем временную папку и распаковываем туда containerd
	mkdir -p /tmp/containerd-unpack
	tar -xvf downloads/containerd-2.1.0-beta.0-linux-amd64.tar.gz -C /tmp/containerd-unpack/
	
	scp downloads/worker/kubelet root@worker02:/usr/local/bin/
		
	# 2. Перекидываем бинарники на worker01
	scp /tmp/containerd-unpack/bin/* root@worker01:/bin/
	
	# 3. Перекидываем бинарники на worker02
	scp /tmp/containerd-unpack/bin/* root@worker02:/bin/

	scp units/containerd.service root@worker01:/etc/systemd/system/
	scp units/containerd.service root@worker02:/etc/systemd/system/
	scp units/kubelet.service root@worker01:/etc/systemd/system/
	scp units/kubelet.service root@worker02:/etc/systemd/system/
	scp units/kube-proxy.service root@worker01:/etc/systemd/system/
	scp units/kube-proxy.service root@worker02:/etc/systemd/system/
	
	# 4. Чистим за собой временную папку на джампбоксе
	rm -rf /tmp/containerd-unpack
}

chmod +x /bin/containerd* /bin/ctr
```

1. Создаем папку для конфига:

```bash
mkdir -p /etc/containerd
```

2. Генерируем дефолтный конфиг и сразу включаем в нем поддержку `SystemdCgroup` (это критично для стабильности kubelet):

```bash
{
	containerd config default > /etc/containerd/config.toml
	sed -i 's/SystemdCgroup = false/SystemdCgroup = true/g' /etc/containerd/config.toml
}
```

---

### Шаг 5: Конфигурируем Kubelet

Убедись, что на воркерах в папке `/var/lib/kubelet/` уже лежат сертификаты (`ca.crt`, `worker0X.crt`, `worker0X.key`) и файл `kubeconfig`.

Создаем файл конфигурации `kubelet-config.yaml`.
*Обрати внимание на параметр `podCIDR` — он должен соответствовать тому, что мы писали в CNI на Шаге 3.*

**Для `worker01`:**

```bash
cat <<EOF > /var/lib/kubelet/kubelet-config.yaml
kind: KubeletConfiguration
apiVersion: kubelet.config.k8s.io/v1beta1
authentication:
  anonymous:
    enabled: false
  webhook:
    enabled: true
  x509:
    clientCAFile: /var/lib/kubelet/ca.crt
authorization:
  mode: Webhook
clusterDomain: cluster.local
clusterDNS:
  - 10.32.0.10
cgroupDriver: systemd
podCIDR: 10.244.1.0/24
resolvConf: /run/systemd/resolve/resolv.conf
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
  anonymous:
    enabled: false
  webhook:
    enabled: true
  x509:
    clientCAFile: /var/lib/kubelet/ca.crt
authorization:
  mode: Webhook
clusterDomain: cluster.local
clusterDNS:
  - 10.32.0.10
cgroupDriver: systemd
podCIDR: 10.244.2.0/24
resolvConf: /run/systemd/resolve/resolv.conf
runtimeRequestTimeout: "15m"
tlsCertFile: /var/lib/kubelet/worker02.crt
tlsPrivateKeyFile: /var/lib/kubelet/worker02.key
EOF

```

---

### Шаг 6: Конфигурируем Kube-Proxy

Этот компонент отвечает за маршрутизацию сервисов на нодах. Убедись, что в `/var/lib/kube-proxy/` уже лежит файл `kubeconfig`.

Создаем конфиг (для **обоих** воркеров):

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

---

### Шаг 7: Запуск служб!

Всё готово к старту. Выполни эти команды на **обоих воркерах**, чтобы включить и запустить все три демона:

```bash
{
	systemctl daemon-reload
	systemctl enable containerd kubelet kube-proxy
	systemctl start containerd kubelet kube-proxy
}
```

---

### Шаг 8: Проверка на мастере (`manager01`)

Возвращайся в терминал ноды **`manager01`** (где мы настраивали `kubectl` в прошлый раз) и проверь, увидит ли наш Control Plane новые рабочие ноды:

```bash
kubectl get nodes
```

Если всё сделано без опечаток, через несколько секунд ты увидишь прекрасную картину:

```text
NAME       STATUS   ROLES    AGE   VERSION
worker01   Ready    <none>   10s   v1.32.0 (или твоя версия)
worker02   Ready    <none>   8s    v1.32.0

```

## Настройка маршрутизации между подами
```bash
# Пример добавления маршрутов вручную (команды зависят от того, на какой ноде вы находитесь).
# Нужно связать подсеть подов (Pod CIDR) со следующим шагом (via IP воркера)

# Находясь на Мастере (manager01):
{
	# маршрут до подов worker01
	ip route add 10.200.1.0/24 via 192.168.56.11
	# маршрут до подов worker02
	ip route add 10.200.2.0/24 via 192.168.56.12
}

# Находясь на worker01:
ip route add 10.200.2.0/24 via 192.168.56.12  # маршрут до соседа worker02

# Находясь на worker02:
ip route add 10.200.1.0/24 via 192.168.56.11  # маршрут до соседа worker01

# Проверка таблицы маршрутов Linux ядра
ip route
```


## Smoke test
```bash
# 1. Проверка, что воркеры в статусе Ready
kubectl get nodes

# 2. Проверка шифрования (Encryption at Rest)
# Создаем секрет
kubectl create secret generic kubernetes-the-hard-way --from-literal=mykey=mydata

# Читаем etcd напрямую из базы мимо API и проверяем наличие бинарного префикса шифрования
ETCDCTL_API=3 etcdctl get /registry/secrets/default/kubernetes-the-hard-way \
  --endpoints=http://127.0.0.1:2379 | hexdump -C

# 3. Создание тестового приложения (Nginx)
kubectl create deployment nginx --image=nginx
kubectl get pods -o wide  # Смотрим, статус должен быть Running

# 4. Тест port-forward (связь API -> Kubelet)
kubectl port-forward deployment/nginx 8080:80
# В соседнем терминале проверяем ответ: curl http://127.0.0.1:8080

# 5. Тест сетевых правил kube-proxy (Сервисы)
kubectl expose deployment nginx --port 80 --type=NodePort
kubectl get svc
# Проверяем доступность по NodePort: curl http://<IP_любого_воркера>:<NodePort>
```