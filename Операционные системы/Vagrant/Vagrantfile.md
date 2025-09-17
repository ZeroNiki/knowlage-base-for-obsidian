## Основные блоки
`Vagrantfile` - это Ruby файл. Пример:
```ruby
Vagrant.configure("2") do |config|
  # 1) box — базовый образ
  config.vm.box = "hashicorp/bionic64"

  # 2) имя хоста внутри VM
  config.vm.hostname = "devbox"

  # 3) сеть: приватная с фиксированным IP
  config.vm.network "private_network", ip: "192.168.56.10"

  # 4) проброс порта (guest 80 -> host 8080)
  config.vm.network "forwarded_port", guest: 80, host: 8080

  # 5) синхронизация папки проекта (host -> guest)
  config.vm.synced_folder ".", "/vagrant", type: "virtualbox"

  # 6) опции провайдера (здесь — VirtualBox)
  config.vm.provider "virtualbox" do |vb|
    vb.memory = "2048"
    vb.cpus = 2
  end

  # 7) provisioner — простой shell (инлайн)
  config.vm.provision "shell", inline: <<-SHELL
    sudo apt-get update
    sudo apt-get install -y nginx
    sudo systemctl enable nginx
  SHELL
end
```

### Пример с несколькими машинами

```ruby
Vagrant.configure("2") do |config|
  # Общие настройки для всех ВМ
  config.vm.box = "ubuntu/focal64"

  # Машина 1: веб-сервер
  config.vm.define "web" do |web|
    web.vm.hostname = "web.local"
    web.vm.network "private_network", ip: "192.168.56.10"
    web.vm.provider "virtualbox" do |vb|
      vb.name = "web_vm"
      vb.memory = 1024
      vb.cpus = 1
    end
    web.vm.provision "shell", inline: <<-SHELL
      apt-get update
      apt-get install -y nginx
      systemctl enable nginx
    SHELL
  end

  # Машина 2: база данных
  config.vm.define "db" do |db|
    db.vm.hostname = "db.local"
    db.vm.network "private_network", ip: "192.168.56.11"
    db.vm.provider "virtualbox" do |vb|
      vb.name = "db_vm"
      vb.memory = 1024
      vb.cpus = 1
    end
    db.vm.provision "shell", inline: <<-SHELL
      apt-get update
      apt-get install -y mysql-server
      systemctl enable mysql
    SHELL
  end
end
```